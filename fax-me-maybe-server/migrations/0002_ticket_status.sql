-- Ticket lifecycle from Todoist webhooks: printed -> done | deleted
ALTER TABLE todo_mappings ADD COLUMN status TEXT NOT NULL DEFAULT 'printed';
ALTER TABLE todo_mappings ADD COLUMN closed_at TEXT;

-- Every ticket printed before v1.0 was closed in Todoist by 21 Oct 2026; the close time is unknown
UPDATE todo_mappings SET status = 'done' WHERE created_at < '2026-10-21T13:39:58Z';
