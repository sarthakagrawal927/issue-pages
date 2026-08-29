-- Scheduled reaction reconciliation state.
-- GitHub emits no standalone repository reaction webhook event, so reaction
-- summaries are reconciled by a bounded cron batch that resumes from a durable
-- cursor and uses conditional requests against stored entity ETags.

CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  cursor_issue_id INTEGER NOT NULL DEFAULT 0,
  cursor_comment_id INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  last_status TEXT,
  detail TEXT
);

ALTER TABLE articles ADD COLUMN reactions_etag TEXT;
ALTER TABLE comments ADD COLUMN reactions_etag TEXT;
