# TODO

- [ ] Reach v1.0 milestone
- [ ] Build an OSX menu bar app using Tauri
- [ ] Build an iOS Shortcut extension to quickly add tasks from anywhere
- [ ] Improve n8n workflows to automatically create tasks from various sources (like emails, messages, etc) with gemini-2.5-flash
- [ ] Add versioning for the client and API, autoincrementing with each push to main
- [ ] The README is a little... too much AI. Clean it up to be more human-readable.
- [ ] Add cool useful badges and integrations into the README (like uptime, version, etc)

# DONE
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
