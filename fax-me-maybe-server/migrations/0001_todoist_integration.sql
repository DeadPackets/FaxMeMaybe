-- Migration: Todoist Integration
-- This migration transforms the database from full TODO storage to a minimal ID mapping table.
-- Todoist becomes the source of truth for all TODO data.

-- Drop the old todos table if it exists
DROP TABLE IF EXISTS todos;

-- Create the new minimal mapping table
-- This maps our internal UUIDs (used in QR codes) to Todoist task IDs
CREATE TABLE todo_mappings (
  id TEXT PRIMARY KEY,              -- UUID for QR codes (our internal ID)
  todoist_task_id TEXT NOT NULL,    -- Todoist's task ID
  created_at TEXT NOT NULL,         -- ISO timestamp when created
  UNIQUE(todoist_task_id)           -- Ensure no duplicate Todoist task mappings
);

-- Index for efficient lookups by Todoist task ID (used by webhooks)
CREATE INDEX idx_todoist_task_id ON todo_mappings(todoist_task_id);
