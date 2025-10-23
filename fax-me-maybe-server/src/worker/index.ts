import { Hono, Context, Next } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from 'hono/secure-headers'
import { rateLimit, RateLimitKeyFunc } from "@elithrar/workers-hono-rate-limit";

// Rate limit configuration
const getKey: RateLimitKeyFunc = (c: Context): string => {
	return c.req.header("CF-Connecting-IP") || "";
};

const rateLimiter = async (c: Context, next: Next) => {
	return await rateLimit(c.env.API_ENDPOINT_LIMIT, getKey)(c, next);
};

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use("/*", cors());

// Set secure headers
app.use("/*", secureHeaders());

// Apply rate limiting
app.use("/api/*", rateLimiter);

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

		if (!body.importance || body.importance < 1 || body.importance > 5) {
			return c.json({ error: "Importance must be between 1 and 5" }, 400);
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
          timestamp TEXT NOT NULL
        );
         */
        const {result} = await c.env.faxmemaybe_db.prepare(`INSERT INTO todos (todo, importance, source, duedate, "from", timestamp) VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(body.todo.trim(), body.importance, body.source || "website", body.dueDate || null, body.from || null, new Date().toISOString())
            .run();
        console.log("Stored TODO with ID:", result.lastInsertRowId);

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
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				importance: body.importance,
				todo: body.todo,
				dueDate: body.dueDate || null,
				from: body.from || null,
                source: body.source || "website",
				timestamp: new Date().toISOString(),
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

// Health check endpoint
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;

