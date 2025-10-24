import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from 'hono/secure-headers'
import { rateLimit } from './rate-limit';


const app = new Hono<{ Bindings: Env }>();

// Enable rate limiting only if RATE_LIMITER is available
app.use('/api/*', async (c, next) => {
  // Only apply rate limiting if the binding is available and has the limit method
  if (c.env.RATE_LIMITER && typeof c.env.RATE_LIMITER.limit === 'function') {
    const rateLimitMiddleware = rateLimit({
      rateLimiter: (c) => c.env.RATE_LIMITER,
      getRateLimitKey: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
    });
    return rateLimitMiddleware(c, next);
  }
  // If rate limiter is not available (e.g., in development), skip rate limiting
  await next();
});

// Enable CORS for all routes
app.use("/*", cors());

// Set secure headers
app.use("/*", secureHeaders());

// API Key authentication middleware - protect all routes except POST /api/todos
app.use("/api/*", async (c, next) => {
	// Skip authentication for POST /api/todos
	if ((c.req.method === "POST" && c.req.path === "/api/todos") || (c.req.method === "GET" && (c.req.path === "/api/health" || c.req.path === "/api/todos/count"))) {
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
	dueDate?: string;
	from?: string;
    source?: string;
}

// API endpoint to submit TODOs
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

		// Validate dueDate format if provided
		if (body.dueDate) {
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			if (!dateRegex.test(body.dueDate)) {
				return c.json({ error: "Due date must be in YYYY-MM-DD format" }, 400);
			}

			// Validate it's a valid date
			const date = new Date(body.dueDate);
			if (isNaN(date.getTime())) {
				return c.json({ error: "Invalid due date" }, 400);
			}

			// Optional: Check if date is not in the past
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (date < today) {
				return c.json({ error: "Due date cannot be in the past" }, 400);
			}
		}

        // Store TODO in D1 database
        /*
        // todos table schema
        CREATE TABLE todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          todo TEXT NOT NULL,
          importance INTEGER NOT NULL,
          source TEXT NOT NULL,
          duedate DATETIME,
          "from" TEXT,
          created_at TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          completed_at DATETIME
        );
         */
        const result = await c.env.faxmemaybe_db.prepare(`INSERT INTO todos (todo, importance, source, duedate, "from", created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(body.todo.trim(), body.importance, body.source || "website", body.dueDate || null, body.from?.trim() || null, new Date().toISOString()).run();
        console.log("TODO stored in database with ID:", result.meta.last_row_id);

		// Get the n8n webhook URL from environment variable
		const n8nUrl = c.env.N8N_WEBHOOK_URL;

		if (!n8nUrl) {
			console.error("N8N_WEBHOOK_URL is not configured");
			// Still return success to the user but log the error
			return c.json({
				success: true,
				message: "TODO received (webhook not configured)"
			});
		}

		// Forward to n8n webhook
		const response = await fetch(n8nUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
                "X-API-KEY": c.env.N8N_API_KEY,
			},
			body: JSON.stringify({
				id: result.meta.last_row_id,
				importance: body.importance,
				todo: body.todo,
				dueDate: body.dueDate || null,
				from: body.from || null,
                source: body.source || "website",
				created_at: new Date().toISOString(),
			}),
		});

		if (!response.ok) {
			console.error("Failed to send to n8n:", response.statusText);
			return c.json({
				success: true,
				message: "TODO received (webhook error)"
			});
		}

		return c.json({
			success: true,
			message: "TODO sent successfully!"
		});
	} catch (error) {
		console.error("Error processing TODO:", error);
		return c.json({
			error: "Failed to process TODO",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get total count of TODOs
app.get("/api/todos/count", async (c) => {
	try {
		const result = await c.env.faxmemaybe_db.prepare("SELECT COUNT(*) as count FROM todos").first<{ count: number }>();

		return c.json({
			success: true,
			count: result?.count || 0
		});
	} catch (error) {
		console.error("Error fetching TODO count:", error);
		return c.json({
			error: "Failed to fetch TODO count",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Get all TODOs with optional filtering
app.get("/api/todos", async (c) => {
	try {
		const completed = c.req.query("completed"); // "true", "false", or undefined (all)
		const limit = parseInt(c.req.query("limit") || "100");
		const offset = parseInt(c.req.query("offset") || "0");

		let query: string;
		let bindings: number[];

		// Filter by completion status
		if (completed === "true") {
			query = "SELECT * FROM todos WHERE completed = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?";
			bindings = [limit, offset];
		} else if (completed === "false") {
			query = "SELECT * FROM todos WHERE completed = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?";
			bindings = [limit, offset];
		} else {
			query = "SELECT * FROM todos ORDER BY created_at DESC LIMIT ? OFFSET ?";
			bindings = [limit, offset];
		}

		const result = await c.env.faxmemaybe_db.prepare(query).bind(...bindings).all();

		return c.json({
			success: true,
			todos: result.results,
			count: result.results.length
		});
	} catch (error) {
		console.error("Error fetching TODOs:", error);
		return c.json({
			error: "Failed to fetch TODOs",
			message: error instanceof Error ? error.message : "Unknown error"
		}, 500);
	}
});

// Mark a TODO as complete
app.patch("/api/todos/:id/complete", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || isNaN(parseInt(id))) {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Check if TODO exists
		const existing = await c.env.faxmemaybe_db
			.prepare("SELECT id FROM todos WHERE id = ?")
			.bind(parseInt(id))
			.first();

		if (!existing) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Mark as complete
		await c.env.faxmemaybe_db
			.prepare("UPDATE todos SET completed = 1, completed_at = ? WHERE id = ?")
			.bind(new Date().toISOString(), parseInt(id))
			.run();

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

// Mark a TODO as incomplete
app.patch("/api/todos/:id/incomplete", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || isNaN(parseInt(id))) {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Check if TODO exists
		const existing = await c.env.faxmemaybe_db
			.prepare("SELECT id FROM todos WHERE id = ?")
			.bind(parseInt(id))
			.first();

		if (!existing) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Mark as incomplete
		await c.env.faxmemaybe_db
			.prepare("UPDATE todos SET completed = 0, completed_at = NULL WHERE id = ?")
			.bind(parseInt(id))
			.run();

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

// Delete a TODO
app.delete("/api/todos/:id", async (c) => {
	try {
		const id = c.req.param("id");

		if (!id || isNaN(parseInt(id))) {
			return c.json({ error: "Invalid TODO ID" }, 400);
		}

		// Check if TODO exists
		const existing = await c.env.faxmemaybe_db
			.prepare("SELECT id FROM todos WHERE id = ?")
			.bind(parseInt(id))
			.first();

		if (!existing) {
			return c.json({ error: "TODO not found" }, 404);
		}

		// Delete the TODO
		await c.env.faxmemaybe_db
			.prepare("DELETE FROM todos WHERE id = ?")
			.bind(parseInt(id))
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

// Health check endpoint
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;

