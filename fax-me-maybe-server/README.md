# FaxMeMaybe Server

A modern web application for collecting TODOs with a playful fax machine theme. Built with React, Vite, Hono, and designed to run on Cloudflare Workers. **Now powered by Todoist** as the backend storage.

## Features

- **Modern, Responsive UI**: Clean interface that works on all devices
- **Todoist Integration**: Full sync with Todoist as the source of truth
- **Importance Levels**: 5 levels of importance with fire emoji indicators
- **Labels**: Sync and select labels from your Todoist account
- **Natural Language Dates**: Enter due dates like "tomorrow" or "next Friday"
- **Description Support**: Add detailed descriptions to your TODOs
- **API Access**: Direct API endpoint for third-party integrations

## Setup

### 1. Install Dependencies

```bash
cd fax-me-maybe-server
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the `fax-me-maybe-server` directory:

```bash
# Todoist Integration
TODOIST_API_TOKEN=your_todoist_api_token

# AWS SQS (for print queue)
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/your-account/your-queue.fifo
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# API Authentication
HONO_API_KEY=your_api_key_for_protected_endpoints
```

### 3. Run Database Migration

```bash
npx wrangler d1 execute faxmemaybe-db --file=./migrations/0001_todoist_integration.sql --local
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Production Deployment

### Set Cloudflare Secrets

```bash
wrangler secret put TODOIST_API_TOKEN
wrangler secret put HONO_API_KEY
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION
wrangler secret put SQS_QUEUE_URL
```

### Run Production Migration

```bash
npx wrangler d1 execute faxmemaybe-db --file=./migrations/0001_todoist_integration.sql --remote
```

### Deploy

```bash
npm run deploy
```

## API Usage

### Submit a TODO

**Endpoint:** `POST /api/todos`

**Request Body:**

```json
{
  "importance": 3,
  "todo": "Fix the login bug",
  "description": "Users are getting logged out randomly",
  "dueDate": "next Friday",
  "labels": ["work", "urgent"],
  "from": "John Doe"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `todo` | string | Yes | Task description (max 64 chars) |
| `importance` | number | Yes | 1-5 (Low to Critical) |
| `description` | string | No | Detailed description (max 500 chars) |
| `dueDate` | string | No | Due date (ISO format or natural language) |
| `labels` | string[] | No | Array of existing Todoist label names (validated on each request) |
| `from` | string | No | Author name (max 20 chars) |
| `source` | string | No | Source identifier (default: "website") |

> **Note:** Only existing Todoist labels are allowed. Use `GET /api/labels` to fetch the list of valid labels.

**Example with curl:**

```bash
curl -X POST https://remind.deadpackets.pw/api/todos \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "importance": 4,
    "todo": "Review the design mockups",
    "description": "Check the new landing page designs from Figma",
    "dueDate": "tomorrow",
    "labels": ["design", "review"],
    "from": "Design Team"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "TODO sent successfully!",
  "todoId": "uuid-for-qr-code",
  "todoistTaskId": "todoist-task-id",
  "todoistUrl": "https://app.todoist.com/app/task/..."
}
```

### Get a TODO

**Endpoint:** `GET /api/todos/:id`

**Response:**

```json
{
  "success": true,
  "todo": {
    "id": "uuid-for-qr-code",
    "todoistId": "todoist-task-id",
    "content": "Review the design mockups",
    "description": "Check the new landing page designs from Figma",
    "importance": 4,
    "labels": ["design", "review"],
    "dueDate": "2026-02-03",
    "from": "Design Team",
    "source": "website",
    "completed": false,
    "createdAt": "2026-02-02T01:12:37.820789Z",
    "url": "https://app.todoist.com/app/task/..."
  }
}
```

### List All TODOs (Protected)

**Endpoint:** `GET /api/todos`

**Headers:** `X-API-Key: your-api-key`

**Response:**

```json
{
  "success": true,
  "todos": [...],
  "count": 10,
  "source": "todoist"
}
```

### Get Labels

**Endpoint:** `GET /api/labels`

Returns all available Todoist labels. This is a public endpoint (no authentication required).

**Response:**

```json
{
  "success": true,
  "labels": [
    { "name": "work", "color": "blue" },
    { "name": "personal", "color": "green" }
  ]
}
```

### Mark TODO Complete

**Endpoint:** `GET /api/todos/:id/complete`

Marks the task as complete in Todoist.

### Get Stats

**Endpoint:** `GET /api/todos/stats`

Returns pending and completed task counts.

**Response:**

```json
{
  "success": true,
  "stats": {
    "pending": 5,
    "completed": 126
  }
}
```

### Mark TODO Incomplete (Protected)

**Endpoint:** `PATCH /api/todos/:id/incomplete`

**Headers:** `X-API-Key: your-api-key`

Reopens the task in Todoist.

### Delete TODO (Protected)

**Endpoint:** `DELETE /api/todos/:id`

**Headers:** `X-API-Key: your-api-key`

Deletes the task from Todoist and removes the mapping.

## Todoist Webhook (Optional)

To receive real-time updates when tasks are modified in Todoist:

1. Create an app in [Todoist App Console](https://developer.todoist.com/appconsole.html)
2. Add a webhook pointing to `https://your-domain.com/api/webhooks/todoist`
3. Set the webhook secret: `wrangler secret put TODOIST_WEBHOOK_SECRET`
4. Enable events: `item:completed`, `item:uncompleted`, `item:deleted`

## Project Structure

```
fax-me-maybe-server/
├── src/
│   ├── react-app/          # React frontend
│   │   ├── App.tsx         # Main TODO submission form
│   │   ├── AdminDashboard.tsx  # Admin panel
│   │   ├── ViewTodo.tsx    # QR code view page
│   │   ├── TodoTicket.tsx  # Printable ticket
│   │   └── main.tsx        # React entry point
│   ├── worker/             # Hono backend
│   │   ├── index.ts        # API routes
│   │   ├── rate-limit.ts   # Rate limiting
│   │   └── services/
│   │       └── todoist.ts  # Todoist API wrapper
│   └── components/ui/      # shadcn/ui components
│       ├── label-selector.tsx   # Label picker
│       └── smart-date-input.tsx # Natural language dates
├── migrations/
│   └── 0001_todoist_integration.sql  # D1 schema
├── package.json
├── wrangler.json
└── vite.config.ts
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, shadcn/ui
- **Backend**: Hono (Cloudflare Workers)
- **Storage**: Todoist (tasks), Cloudflare D1 (ID mappings), R2 (ticket images)
- **Queue**: AWS SQS
- **Deployment**: Cloudflare Workers

## License

See LICENSE file for details.
