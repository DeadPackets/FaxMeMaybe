# TODO

- [ ] Reach v1.0 milestone (see PLAN.md: tag after merge)
- [ ] Improve n8n workflows to automatically create tasks from various sources (like emails, messages, etc) with gemini-2.5-flash
- [ ] Todoist webhook: create the app, run OAuth once, set TODOIST_WEBHOOK_SECRET (code is done, see README)

# DONE
- [x] v1 rewrite: Direction A form and ticket, QR opens Todoist, admin and view-todo pages removed
- [x] Print tasks added in the Todoist apps (webhook item:added)
- [x] Ticket renders at the printer's 576 px width in the local time zone
- [x] End-to-end print test (e2e/ticket_e2e.py)
- [x] Versioning: VERSION file plus CI build number, shown on /api/health
- [x] Rewrite the README in plain language, with status and version badges

# DROPPED
- Tauri menu bar app: Todoist for Mac has a global Quick Add shortcut
- iOS Shortcut: Todoist's share sheet and Siri actions do the same thing

# DONE (before v1)
- [x] Integrate Todoist as backend storage (replaces D1 for task data)
- [x] Add Todoist label support with color-coded picker
- [x] Add natural language due date input ("tomorrow", "next Friday")
- [x] Add description field to TODO form
- [x] Display labels on thermal printer tickets
- [x] Add "Open in Todoist" links throughout the app
- [x] Update ViewTodo page with labels and description display
- [x] Update AdminDashboard with Todoist data and label stats
- [x] Document everything in README
- [x] Build admin dashboard to view stats and manage tasks
- [x] Requests made with API key should bypass rate limits
- [x] Add OpenGraph metadata for better link previews
- [x] Add a favicon
- [x] Migrate from IDs to UUIDs to prevent enumeration attacks
- [x] Github Actions CI/CD to automate pushes to Cloudflare Workers/Dockerhub
- [x] Add a column in the database for tracking completion
- [x] Add Hono API route to mark tasks as complete
- [x] Add Hono API route to get all tasks (with filtering options)
- [x] Add Hono API route to delete tasks
- [x] Add QR code in TodoTicket.tsx to mark as complete
- [x] Use Cloudflare Browser Rendering to render TodoTicket.tsx and store rendered image in R2
- [x] Let Docker client automatically pull latest images
