PRAGMA foreign_keys = ON;

CREATE TABLE authors (
  github_id INTEGER PRIMARY KEY,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  avatar_url TEXT NOT NULL,
  github_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE articles (
  issue_id INTEGER PRIMARY KEY,
  issue_number INTEGER NOT NULL UNIQUE,
  repository_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(github_id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  github_url TEXT NOT NULL,
  github_created_at TEXT NOT NULL,
  github_updated_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('open', 'closed')),
  visibility TEXT NOT NULL CHECK (visibility IN ('published', 'internal', 'deleted')),
  reactions_json TEXT NOT NULL DEFAULT '{}',
  published_at TEXT NOT NULL,
  last_public_at TEXT NOT NULL,
  public_revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX articles_newest_idx
  ON articles (visibility, state, published_at DESC, issue_id DESC);
CREATE INDEX articles_updated_idx
  ON articles (visibility, state, last_public_at DESC, issue_id DESC);
CREATE INDEX articles_author_idx
  ON articles (author_id, visibility, published_at DESC, issue_id DESC);
CREATE UNIQUE INDEX articles_slug_idx ON articles (issue_number, slug);

CREATE TABLE article_slugs (
  article_id INTEGER NOT NULL REFERENCES articles(issue_id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (article_id, slug)
);

CREATE TABLE labels (
  github_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE article_labels (
  article_id INTEGER NOT NULL REFERENCES articles(issue_id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(github_id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, label_id)
);

CREATE INDEX article_labels_label_idx ON article_labels (label_id, article_id);

CREATE TABLE comments (
  github_id INTEGER PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(issue_id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES authors(github_id),
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  github_url TEXT NOT NULL,
  github_created_at TEXT NOT NULL,
  github_updated_at TEXT NOT NULL,
  reactions_json TEXT NOT NULL DEFAULT '{}',
  public_revision INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

CREATE INDEX comments_article_idx
  ON comments (article_id, deleted_at, github_created_at, github_id);

CREATE TABLE reactions (
  github_id INTEGER PRIMARY KEY,
  article_id INTEGER REFERENCES articles(issue_id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(github_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK ((article_id IS NOT NULL) <> (comment_id IS NOT NULL))
);

CREATE INDEX reactions_article_idx ON reactions (article_id, content);
CREATE INDEX reactions_comment_idx ON reactions (comment_id, content);

CREATE TABLE pending_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('issue', 'comment')),
  entity_id INTEGER NOT NULL,
  issue_id INTEGER NOT NULL,
  issue_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  raw_title TEXT,
  raw_body TEXT NOT NULL,
  sanitized_html TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  spam_reason TEXT,
  moderation_flagged INTEGER NOT NULL DEFAULT 0,
  moderation_categories_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer_note TEXT
);

CREATE INDEX pending_revisions_queue_idx
  ON pending_revisions (status, created_at, id);
CREATE INDEX pending_revisions_entity_idx
  ON pending_revisions (entity_type, entity_id, status);

CREATE TABLE webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  action TEXT,
  received_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'pending', 'ignored', 'failed')),
  detail TEXT
);

CREATE TABLE moderation_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revision_id INTEGER NOT NULL REFERENCES pending_revisions(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_at TEXT NOT NULL,
  note TEXT
);

CREATE VIRTUAL TABLE article_search USING fts5(
  article_id UNINDEXED,
  title,
  body,
  author,
  labels,
  comments,
  tokenize = 'unicode61 remove_diacritics 2'
);
