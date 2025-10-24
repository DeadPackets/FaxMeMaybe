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
        const result = await c.env.faxmemaybe_db.prepare(`INSERT INTO todos (todo, importance, source, duedate, "from", timestamp) VALUES (?, ?, ?, ?, ?, ?)`).bind(body.todo.trim(), body.importance, body.source || "website", body.dueDate || null, body.from || null, new Date().toISOString()).run();
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

