import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from 'hono/secure-headers'
import { rateLimit } from './rate-limit';
import puppeteer from "@cloudflare/puppeteer";
import { AwsClient } from 'aws4fetch'
import { TodoistService, verifyWebhookSignature, type TodoistWebhookEvent, type CreateTaskParams } from './services/todoist';

// UUID generation utility
function generateUUID(): string {
	return crypto.randomUUID();
}

// Initialize Hono
const app = new Hono<{ Bindings: Env }>();

// Enable rate limiting only if RATE_LIMITER is available, but bypass for API key requests
app.use('/api/*', async (c, next) => {
  // Check if request has a valid API key - if so, bypass rate limiting
  const apiKey = c.req.header("X-API-KEY");
  const hasValidApiKey = apiKey && apiKey === c.env.HONO_API_KEY;
  
  // Only apply rate limiting if the binding is available and request doesn't have valid API key
  if (!hasValidApiKey && c.env.RATE_LIMITER && typeof c.env.RATE_LIMITER.limit === 'function') {
    const rateLimitMiddleware = rateLimit({
      rateLimiter: (c) => c.env.RATE_LIMITER,
      getRateLimitKey: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
    });
    return rateLimitMiddleware(c, next);
  }
  // If rate limiter is not available (e.g., in development) or has valid API key, skip rate limiting
  await next();
});

// Enable CORS for all routes
app.use("/*", cors());

// Set secure headers
app.use("/*", secureHeaders());

// API Key authentication middleware - protect all routes except public endpoints
app.use("/api/*", async (c, next) => {
	// Skip authentication for specific public endpoints
	const path = c.req.path;
	const method = c.req.method;

	// Check if the path matches /api/todos/:id/complete or /api/todos/:id pattern
	const completeTodoPattern = /^\/api\/todos\/[^/]+\/complete$/;
	const getTodoPattern = /^\/api\/todos\/[^/]+$/;

	if (
		(method === "POST" && (path === "/api/todos" || path === "/api/first-bloods" || path === "/api/webhooks/todoist")) ||
		(method === "GET" && (path === "/api/health" || path === "/api/todos/count" || path === "/api/todos/stats" || path === "/api/labels" || completeTodoPattern.test(path) || getTodoPattern.test(path)))
	) {
		return next();
	}

	// Check for API key in header
	const apiKey = c.req.header("X-API-KEY");

	if (!apiKey || apiKey !== c.env.HONO_API_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
});


// Type definitions for the TODO
interface TodoSubmission {
	importance: 1 | 2 | 3 | 4 | 5;
	todo: string;
	description?: string;
	dueDate?: string;  // Can be YYYY-MM-DD or natural language
	from?: string;
	labels?: string[];
	source?: string;
}

// API endpoint to submit TODOs - Now integrated with Todoist
app.post("/api/todos", async (c) => {
	try {
		const body = await c.req.json<TodoSubmission>();

		// Validate the request
		if (!body.todo || !body.todo.trim()) {
			return c.json({ error: "TODO text is required" }, 400);
		}

		if (body.todo.trim().length > 64) {
			return c.json({ error: "TODO text must be 64 characters or less" }, 400);
		}

		if (!body.importance || body.importance < 1 || body.importance > 5) {
			return c.json({ error: "Importance must be between 1 and 5" }, 400);
		}

		// Validate importance is an integer
		if (!Number.isInteger(body.importance)) {
			return c.json({ error: "Importance must be a whole number" }, 400);
		}

		// Validate from field length
		if (body.from && body.from.trim().length > 20) {
			return c.json({ error: "From field must be 20 characters or less" }, 400);
		}

		// Validate description length
		if (body.description && body.description.trim().length > 500) {
			return c.json({ error: "Description must be 500 characters or less" }, 400);
		}

		// Validate labels if provided
		if (body.labels && !Array.isArray(body.labels)) {
			return c.json({ error: "Labels must be an array" }, 400);
		}

		// Generate our internal UUID for QR codes
		const todoId = generateUUID();

		// Initialize Todoist service
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		// Create task in Todoist
		const taskParams: CreateTaskParams = {
			content: body.todo.trim(),
			description: body.description?.trim(),
			importance: body.importance,
			dueString: body.dueDate, // Todoist handles natural language parsing
			labels: body.labels,
			from: body.from?.trim(),
			source: body.source || "website",
		};

		const todoistTask = await todoist.createTask(taskParams);
		console.log("Task created in Todoist with ID:", todoistTask.id);

		// Store the mapping in D1 (our ID -> Todoist ID)
		await c.env.faxmemaybe_db.prepare(
			`INSERT INTO todo_mappings (id, todoist_task_id, created_at) VALUES (?, ?, ?)`
		).bind(todoId, todoistTask.id, new Date().toISOString()).run();
		console.log("Mapping stored in database:", todoId, "->", todoistTask.id);

		// Use Puppeteer to generate the ticket image
		let todoUrl = `https://remind.deadpackets.pw/todo-ticket?id=${todoId}&todo=${encodeURIComponent(body.todo.trim())}&importance=${body.importance}`;
		if (body.dueDate) {
			todoUrl += `&dueDate=${encodeURIComponent(body.dueDate)}`;
		}

		if (body.from) {
			todoUrl += `&from=${encodeURIComponent(body.from.trim())}`;
		}

		if (body.labels && body.labels.length > 0) {
			todoUrl += `&labels=${encodeURIComponent(body.labels.join(','))}`;
		}

		const browser = await puppeteer.launch(c.env.CLOUDFLARE_BROWSER);
		const page = await browser.newPage();
		await page.goto(todoUrl, { waitUntil: 'networkidle2' });
		await page.waitForSelector('.text-5xl')
		const ticketDiv = await page.waitForSelector('#root');
		if (!ticketDiv) {
			return c.json({
				success: false,
				message: "Failed to process TODO",
				error: "Ticket element not found"
			})
		}
		const img = await ticketDiv.screenshot({ type: 'png' });
		await browser.close();

		// Upload the screenshot to R2
		const r2Key = `todo-tickets/todo-${todoId}.png`;
		await c.env.TICKET_BUCKET.put(r2Key, img, {
			httpMetadata: {
				contentType: 'image/png'
			}
		});

		// Push to AWS SQS for printer to pick up
		const aws = new AwsClient({
			accessKeyId: c.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
			region: c.env.AWS_REGION,
		});

		const sqsParams = new URLSearchParams({
			Action: 'SendMessage',
			MessageBody: r2Key,
			MessageDeduplicationId: `todo-${todoId}-${Date.now()}`,
			MessageGroupId: 'faxmemaybe-messages',
			Version: '2012-11-05',
		});

		const sqsResponse = await aws.fetch(c.env.SQS_QUEUE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: sqsParams.toString(),
		});

		if (!sqsResponse.ok) {
			const errorText = await sqsResponse.text();
			console.error("Failed to send message to SQS:", errorText)
			return c.json({
				success: false,
				message: "Failed to enqueue TODO for printing",
				error: errorText
			});
		}

		return c.json({
			success: true,
			message: "TODO sent successfully!",
			todoId: todoId,
			todoistTaskId: todoistTask.id,
			todoistUrl: todoistTask.url,
		});
	} catch (error) {
		console.error("Error processing TODO:", error);
		return c.json({
			error: "Failed to process TODO",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get total count of TODOs from Todoist
app.get("/api/todos/count", async (c) => {
	try {
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const tasks = await todoist.getTasks();
		
		return c.json({
			success: true,
			count: tasks.length
		});
	} catch (error) {
		console.error("Error fetching TODO count:", error);
		return c.json({
			error: "Failed to fetch TODO count",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get comprehensive stats: pending and completed
app.get("/api/todos/stats", async (c) => {
	try {
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		// Run both queries in parallel for performance
		const [pendingTasks, productivityStats] = await Promise.all([
			// Pending: active tasks from Todoist
			todoist.getTasks(),
			// Completed: from Todoist productivity stats API
			todoist.getProductivityStats(),
		]);

		const pending = pendingTasks.length;
		const completed = productivityStats?.completed_count || 0;

		return c.json({
			success: true,
			stats: {
				pending,
				completed,
			}
		});
	} catch (error) {
		console.error("Error fetching TODO stats:", error);
		return c.json({
			error: "Failed to fetch TODO stats",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get all TODOs from Todoist (Admin only)
app.get("/api/todos", async (c) => {
	try {
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		// Get all tasks from Todoist
		const tasks = await todoist.getTasks();

		// Get all mappings from D1 to match with local IDs
		const mappings = await c.env.faxmemaybe_db.prepare(
			"SELECT id, todoist_task_id FROM todo_mappings"
		).all<{ id: string; todoist_task_id: string }>();

		const mappingLookup = new Map<string, string>();
		mappings.results.forEach((m) => {
			mappingLookup.set(m.todoist_task_id, m.id);
		});

		// Convert to our format with local IDs where available
		const todos = tasks.map(task => {
			const localId = mappingLookup.get(task.id);
			return todoist.taskToTodoistTask(task, localId);
		});

		return c.json({
			success: true,
			todos: todos,
			count: todos.length,
			source: 'todoist'
		});
	} catch (error) {
		console.error("Error fetching TODOs:", error);
		return c.json({
			error: "Failed to fetch TODOs",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Mark a TODO as complete via QR code scan
app.get("/api/todos/:id/complete", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || id.trim() === "") {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Look up the Todoist task ID from our mapping
		const mapping = await c.env.faxmemaybe_db
			.prepare("SELECT todoist_task_id FROM todo_mappings WHERE id = ?")
			.bind(id)
			.first<{ todoist_task_id: string }>();

		if (!mapping) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Complete the task in Todoist
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const success = await todoist.completeTask(mapping.todoist_task_id);

		if (!success) {
			return c.json({ error: "Failed to complete task in Todoist" }, 500);
		}

		return c.json({
			success: true,
			message: "TODO marked as complete"
		});
	} catch (error) {
		console.error("Error marking TODO as complete:", error);
		return c.json({
			error: "Failed to mark TODO as complete",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get a single TODO by ID
app.get("/api/todos/:id", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || id.trim() === "") {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Look up the Todoist task ID from our mapping
		const mapping = await c.env.faxmemaybe_db
			.prepare("SELECT todoist_task_id FROM todo_mappings WHERE id = ?")
			.bind(id)
			.first<{ todoist_task_id: string }>();

		if (!mapping) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Fetch the task from Todoist
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const task = await todoist.getTask(mapping.todoist_task_id);

		if (!task) {
			return c.json({ error: "TODO not found in Todoist (may have been deleted)" }, 404);
		}

		const todo = todoist.taskToTodoistTask(task, id);

		return c.json({
			success: true,
			todo: todo
		});
	} catch (error) {
		console.error("Error fetching TODO:", error);
		return c.json({
			error: "Failed to fetch TODO",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Mark a TODO as incomplete (Admin only)
app.patch("/api/todos/:id/incomplete", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || id.trim() === "") {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Look up the Todoist task ID from our mapping
		const mapping = await c.env.faxmemaybe_db
			.prepare("SELECT todoist_task_id FROM todo_mappings WHERE id = ?")
			.bind(id)
			.first<{ todoist_task_id: string }>();

		if (!mapping) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Reopen the task in Todoist
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const success = await todoist.reopenTask(mapping.todoist_task_id);

		if (!success) {
			return c.json({ error: "Failed to reopen task in Todoist" }, 500);
		}

		return c.json({
			success: true,
			message: "TODO marked as incomplete"
		});
	} catch (error) {
		console.error("Error marking TODO as incomplete:", error);
		return c.json({
			error: "Failed to mark TODO as incomplete",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Delete a TODO (Admin only)
app.delete("/api/todos/:id", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || id.trim() === "") {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Look up the Todoist task ID from our mapping
		const mapping = await c.env.faxmemaybe_db
			.prepare("SELECT todoist_task_id FROM todo_mappings WHERE id = ?")
			.bind(id)
			.first<{ todoist_task_id: string }>();

		if (!mapping) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Delete the task from Todoist
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const success = await todoist.deleteTask(mapping.todoist_task_id);

		if (!success) {
			return c.json({ error: "Failed to delete task from Todoist" }, 500);
		}

		// Remove the mapping from D1
		await c.env.faxmemaybe_db
			.prepare("DELETE FROM todo_mappings WHERE id = ?")
			.bind(id)
			.run();

		return c.json({
			success: true,
			message: "TODO deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting TODO:", error);
		return c.json({
			error: "Failed to delete TODO",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get labels from Todoist (Public)
app.get("/api/labels", async (c) => {
	try {
		const todoist = new TodoistService(
			c.env.TODOIST_API_TOKEN,
			c.env.TODOIST_PROJECT_NAME || 'FaxMeMaybe'
		);

		const labels = await todoist.getLabels();

		return c.json({
			success: true,
			labels: labels.map(l => ({
				name: l.name,
				color: l.color,
			}))
		});
	} catch (error) {
		console.error("Error fetching labels:", error);
		return c.json({
			error: "Failed to fetch labels",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Todoist Webhook endpoint
app.post("/api/webhooks/todoist", async (c) => {
	try {
		// Verify the webhook signature
		const signature = c.req.header("X-Todoist-Hmac-SHA256");
		const userAgent = c.req.header("User-Agent");

		if (userAgent !== "Todoist-Webhooks") {
			console.warn("Invalid User-Agent for Todoist webhook");
			return c.json({ error: "Invalid request" }, 400);
		}

		if (!signature) {
			console.warn("Missing Todoist webhook signature");
			return c.json({ error: "Missing signature" }, 400);
		}

		const payload = await c.req.text();
		
		const isValid = await verifyWebhookSignature(
			payload,
			signature,
			c.env.TODOIST_WEBHOOK_SECRET
		);

		if (!isValid) {
			console.warn("Invalid Todoist webhook signature");
			return c.json({ error: "Invalid signature" }, 401);
		}

		const event: TodoistWebhookEvent = JSON.parse(payload);
		console.log("Received Todoist webhook:", event.event_name, event.event_data.id);

		// Handle different event types
		switch (event.event_name) {
			case "item:deleted":
				// Clean up our mapping when a task is deleted in Todoist
				await c.env.faxmemaybe_db
					.prepare("DELETE FROM todo_mappings WHERE todoist_task_id = ?")
					.bind(event.event_data.id)
					.run();
				console.log("Cleaned up mapping for deleted Todoist task:", event.event_data.id);
				break;

			case "item:completed":
				console.log("Task completed in Todoist:", event.event_data.id);
				// Could add notifications or other actions here
				break;

			case "item:uncompleted":
				console.log("Task reopened in Todoist:", event.event_data.id);
				// Could add notifications or other actions here
				break;

			default:
				console.log("Unhandled Todoist webhook event:", event.event_name);
		}

		// Always return 200 to acknowledge receipt
		return c.json({ success: true });
	} catch (error) {
		console.error("Error processing Todoist webhook:", error);
		// Still return 200 to prevent Todoist from retrying
		return c.json({ success: false, error: "Internal error" }, 200);
	}
});

// Health check endpoint
app.get("/api/health", (c) => c.json({ status: "ok", integration: "todoist" }));

// Type definitions for First Blood submission
interface FirstBloodSubmission {
	username: string;
	challenge: string;
	category: string;
	points: number;
	logo_url: string;
	ctf_name: string;
}

// API endpoint to submit First Bloods
app.post("/api/first-bloods", async (c) => {
	try {
		const body = await c.req.json<FirstBloodSubmission>();

		// Validate required fields
		if (!body.username || !body.username.trim()) {
			return c.json({ error: "Username is required" }, 400);
		}

		if (!body.challenge || !body.challenge.trim()) {
			return c.json({ error: "Challenge is required" }, 400);
		}

		if (!body.category || !body.category.trim()) {
			return c.json({ error: "Category is required" }, 400);
		}

		if (body.points === undefined || body.points === null) {
			return c.json({ error: "Points is required" }, 400);
		}

		if (!Number.isInteger(body.points)) {
			return c.json({ error: "Points must be an integer" }, 400);
		}

		if (!body.logo_url || !body.logo_url.trim()) {
			return c.json({ error: "Logo URL is required" }, 400);
		}

		if (!body.ctf_name || !body.ctf_name.trim()) {
			return c.json({ error: "CTF name is required" }, 400);
		}

		// Build the full external URL with GET parameters
		const firstBloodUrl = new URL("https://remind.deadpackets.pw/first-blood-receipt");
		firstBloodUrl.searchParams.set("username", body.username.trim());
		firstBloodUrl.searchParams.set("challenge", body.challenge.trim());
		firstBloodUrl.searchParams.set("category", body.category.trim());
		firstBloodUrl.searchParams.set("points", body.points.toString());
		firstBloodUrl.searchParams.set("logo_url", body.logo_url.trim());
		firstBloodUrl.searchParams.set("ctf_name", body.ctf_name.trim());

		// Push to AWS SQS for printer to pick up using aws4fetch
		const aws = new AwsClient({
			accessKeyId: c.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
			region: c.env.AWS_REGION,
		});

		const messageId = generateUUID();
		const sqsParams = new URLSearchParams({
			Action: 'SendMessage',
			MessageBody: firstBloodUrl.toString(),
			MessageDeduplicationId: `first-blood-${messageId}-${Date.now()}`,
			MessageGroupId: 'faxmemaybe-messages',
			Version: '2012-11-05',
		});

		const sqsResponse = await aws.fetch(c.env.SQS_QUEUE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: sqsParams.toString(),
		});

		if (!sqsResponse.ok) {
			const errorText = await sqsResponse.text();
			console.error("Failed to send message to SQS:", errorText);
			return c.json({
				success: false,
				message: "Failed to enqueue First Blood for printing",
				error: errorText
			}, 500);
		}

		return c.json({
			success: true,
			message: "First Blood sent successfully!"
		});
	} catch (error) {
		console.error("Error processing First Blood:", error);
		return c.json({
			error: "Failed to process First Blood",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

export default app;
