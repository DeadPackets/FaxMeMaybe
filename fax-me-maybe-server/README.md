# 📠 FaxMeMaybe

A modern web application for collecting TODOs with a playful fax machine theme. Built with React, Vite, Hono, and designed to run on Cloudflare Workers.

## Features

- **Modern, Responsive UI**: Clean interface that works on all devices
- **Importance Levels**: 5 levels of importance with fire emoji indicators (🔥 to 🔥🔥🔥🔥🔥)
- **Optional Fields**: Add due dates and author information
- **API Access**: Direct API endpoint for third-party integrations
- **n8n Integration**: Automatically forwards TODOs to your self-hosted n8n server

## Setup

### 1. Install Dependencies

```bash
cd fax-me-maybe-server
npm install
```

### 2. Configure n8n Webhook

Create a `.dev.vars` file in the `fax-me-maybe-server` directory:

```bash
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

For production deployment, add the environment variable to your Cloudflare Worker:

```bash
wrangler secret put N8N_WEBHOOK_URL
```

Then enter your n8n webhook URL when prompted.

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## API Usage

### Submit a TODO

**Endpoint:** `POST /api/todos`

**Request Body:**

```json
{
  "importance": 3,
  "todo": "Fix the login bug",
  "dueDate": "2025-10-30",
  "from": "John Doe"
}
```

**Parameters:**

- `importance` (required): Number from 1-5
  - 1: Low (🔥) - "When you have time"
  - 2: Medium (🔥🔥) - "This week would be nice"
  - 3: High (🔥🔥🔥) - "Pretty important"
  - 4: Urgent (🔥🔥🔥🔥) - "Need this soon!"
  - 5: Critical (🔥🔥🔥🔥🔥) - "DROP EVERYTHING!"
- `todo` (required): String - The task description
- `dueDate` (optional): String - ISO date format (YYYY-MM-DD)
- `from` (optional): String - Author or organization name

**Example with curl:**

```bash
curl -X POST https://your-domain.com/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "importance": 3,
    "todo": "Review the design mockups",
    "from": "Design Team"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "TODO sent successfully!"
}
```

## n8n Webhook Payload

The application sends the following payload to your n8n webhook:

```json
{
  "importance": 3,
  "todo": "Fix the login bug",
  "dueDate": "2025-10-30",
  "from": "John Doe",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

Make sure to set the `N8N_WEBHOOK_URL` secret before deploying:

```bash
wrangler secret put N8N_WEBHOOK_URL
```

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run check
```

### Lint

```bash
npm run lint
```

## Project Structure

```
fax-me-maybe-server/
├── src/
│   ├── react-app/          # React frontend
│   │   ├── App.tsx         # Main application component
│   │   ├── App.css         # Application styles
│   │   └── main.tsx        # React entry point
│   └── worker/             # Hono backend
│       └── index.ts        # API routes and n8n integration
├── package.json
└── vite.config.ts
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Hono (running on Cloudflare Workers)
- **Styling**: Modern CSS with gradient effects and responsive design
- **Deployment**: Cloudflare Workers

## License

See LICENSE file for details.

