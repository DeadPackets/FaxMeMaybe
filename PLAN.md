# FaxMeMaybe v1.0

## Decisions
1. Todoist is the only place to manage, complete and delete tasks. The web app is an intake form plus the ticket renderer.
2. Printing rule: every new Todoist task prints, in any project, unless it has the `noprint` label. Tasks created through `POST /api/todos` print once, at creation. (Changed after v1.0 at the owner's request; it was the FaxMeMaybe project plus a `print` label.)
3. Sync method: Todoist webhooks (`item:added`). This needs a one-time OAuth setup (see Setup).
4. Delete `/admin` and `/view-todo`. The ticket QR opens the task in the Todoist app.
5. Visual direction: A, "Physical receipt" (mocks: https://claude.ai/artifact/MEiwX5dQLi85RBp7nU52Hy). Single look, no dark mode.

## Phase 1: cut and fix
- [x] Delete `AdminDashboard.tsx`, `ViewTodo.tsx`, theme provider and toggle
- [x] Delete `GET /api/todos/:id` and `GET /api/todos/:id/complete` (public, orphaned)
- [x] QR encodes the Todoist task URL
- [x] Ticket render: 576 px viewport, screenshot the ticket element, wait on `data-ticket-ready`, render in `TIMEZONE`
- [x] Webhook `item:added` prints by rule 2, deduplicated through `todo_mappings`

## Phase 2: Direction A
- [x] One `Ticket` component, used by `/todo-ticket` and the live preview on the form
- [x] Form as a paper slip: flame importance control, labelled fields, 4.5:1 contrast, 375 px layout
- [x] Remove unused shadcn components and dependencies

## Phase 3: ship v1.0
- [x] E2E: submit → R2 PNG is 576 px wide → QR decodes to the Todoist URL. Artifact: PNG + JSON report
- [x] CI version number, README rewrite, uptime and version badges
- [ ] Tag `v1.0.0` (needs your go-ahead to commit and push)

## Setup (owner, one time)
1. Todoist App Console → create an app. Webhook callback: `https://remind.deadpackets.pw/api/webhooks/todoist`, events `item:added`.
2. Run the OAuth flow once with your own account to activate webhooks.
3. `npx wrangler secret put TODOIST_WEBHOOK_SECRET` with the app's client secret.

## Deviations
- Kept the API-key endpoints (`GET /api/todos`, `PATCH .../incomplete`, `DELETE`) after deleting `/admin`: the README documents them as API, and the E2E test uses `DELETE` for cleanup.
- Added `GET /view-todo` as a Worker redirect so QR codes on tickets printed before v1 still open their Todoist task.
- `run_worker_first` lists `/api/*` and `/view-todo`. The array form serves everything else asset-first, so `/api/*` must be listed.
- Form puts "What needs doing" first, ahead of importance (the mock had importance first). The required field leads.
- Fonts: swapped `@fontsource-variable/inter` for Instrument Sans and Martian Mono (self-hosted, so the headless render never waits on Google Fonts).
- `POST /api/todos` and the `item:added` webhook put a print job on the `faxmemaybe-print` Cloudflare Queue (3 retries, 10 s apart). The reply comes when the Todoist task is saved: 1.4-2.0 s instead of 4.9-14 s. `waitUntil` lost 2 of 5 preview prints, both on the first request to a fresh version. The `printed` field is gone from the response.
- QR uses the short `https://app.todoist.com/app/task/<id>` form (49 vs 122 chars, QR version 4 instead of about 8). Assumed: the Todoist app accepts the id-only path.
- v1.1: `item:completed` / `item:deleted` set `status` and `closed_at` in `todo_mappings`; `/api/todos/stats` reads D1 instead of 2 Todoist calls. Rows closed in Todoist before the webhooks existed count as done with no `closed_at`, so they are left out of the median.
- Not done: First Blood receipt ASCII box overflow (P3), DESIGN.md.
