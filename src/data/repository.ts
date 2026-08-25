import type {
  ArticleListRow,
  ArticleRow,
  CommentRow,
  GitHubComment,
  GitHubIssue,
  GitHubLabel,
  GitHubReaction,
  GitHubReactionSummary,
  GitHubUser,
  RenderedContent,
} from "../types";
import type { CursorPayload } from "../lib/cursor";

export interface ArticleMutation {
  issueNumber: number;
  previousSlug: string | null;
  slug: string;
  previousRevision: number;
  revision: number;
}

export interface PendingRevisionInput {
  entityType: "issue" | "comment";
  entityId: number;
  issueId: number;
  issueNumber: number;
  action: string;
  payload: unknown;
  rawTitle: string | null;
  rawBody: string;
  rendered: RenderedContent;
  spamReason: string | null;
  moderationFlagged: boolean;
  moderationCategories: Record<string, boolean>;
  failure: string | null;
}

export interface PendingRevisionRow {
  id: number;
  entity_type: "issue" | "comment";
  entity_id: number;
  issue_id: number;
  issue_number: number;
  action: string;
  payload_json: string;
  raw_title: string | null;
  raw_body: string;
  sanitized_html: string;
  plain_text: string;
  spam_reason: string | null;
  moderation_flagged: number;
  moderation_categories_json: string;
  status: "pending" | "approved" | "rejected" | "superseded";
  created_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
}

const articleSelect = `
  SELECT
    a.issue_id,
    a.issue_number,
    a.author_id,
    a.title,
    a.slug,
    a.body_markdown,
    a.body_html,
    a.body_text,
    a.excerpt,
    a.github_url,
    a.github_created_at,
    a.github_updated_at,
    a.state,
    a.visibility,
    a.reactions_json,
    a.published_at,
    a.last_public_at,
    a.public_revision,
    au.login AS author_login,
    au.avatar_url AS author_avatar_url,
    au.github_url AS author_github_url,
    COALESCE((
      SELECT json_group_array(json_object('name', l.name, 'slug', l.slug, 'color', l.color))
      FROM article_labels al
      JOIN labels l ON l.github_id = al.label_id
      WHERE al.article_id = a.issue_id
      ORDER BY l.name COLLATE NOCASE
    ), '[]') AS labels,
    (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.issue_id AND c.deleted_at IS NULL) AS comment_count
  FROM articles a
  JOIN authors au ON au.github_id = a.author_id
`;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeReactionSummary(summary: GitHubReactionSummary | undefined): string {
  const normalized: Record<string, number> = {};
  for (const key of [
    "+1",
    "-1",
    "laugh",
    "hooray",
    "confused",
    "heart",
    "rocket",
    "eyes",
  ] as const) {
    const count = summary?.[key];
    if (typeof count === "number" && count > 0) normalized[key] = count;
  }
  return JSON.stringify(normalized);
}

function upsertAuthor(db: D1Database, user: GitHubUser, timestamp: string): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO authors (github_id, login, avatar_url, github_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(github_id) DO UPDATE SET
         login = excluded.login,
         avatar_url = excluded.avatar_url,
         github_url = excluded.github_url,
         updated_at = excluded.updated_at`,
    )
    .bind(user.id, user.login, user.avatar_url, user.html_url, timestamp, timestamp);
}

function upsertLabel(
  db: D1Database,
  label: GitHubLabel,
  timestamp: string,
  slug: string,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO labels (github_id, name, slug, color, description, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(github_id) DO UPDATE SET
         name = excluded.name,
         slug = excluded.slug,
         color = excluded.color,
         description = excluded.description,
         updated_at = excluded.updated_at`,
    )
    .bind(label.id, label.name, slug, label.color, label.description, timestamp);
}

function rebuildSearchStatements(db: D1Database, issueId: number): D1PreparedStatement[] {
  return [
    db.prepare("DELETE FROM article_search WHERE article_id = ?").bind(String(issueId)),
    db
      .prepare(
        `INSERT INTO article_search (article_id, title, body, author, labels, comments)
         SELECT
           CAST(a.issue_id AS TEXT),
           a.title,
           a.body_text,
           au.login,
           COALESCE((
             SELECT group_concat(l.name, ' ')
             FROM article_labels al JOIN labels l ON l.github_id = al.label_id
             WHERE al.article_id = a.issue_id
           ), ''),
           COALESCE((
             SELECT group_concat(c.body_text, ' ')
             FROM comments c
             WHERE c.article_id = a.issue_id AND c.deleted_at IS NULL
           ), '')
         FROM articles a
         JOIN authors au ON au.github_id = a.author_id
         WHERE a.issue_id = ? AND a.visibility = 'published'`,
      )
      .bind(issueId),
  ];
}

export async function claimDelivery(
  db: D1Database,
  deliveryId: string,
  eventName: string,
  action: string | null,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO webhook_deliveries
       (delivery_id, event_name, action, received_at, status)
       VALUES (?, ?, ?, ?, 'processing')`,
    )
    .bind(deliveryId, eventName, action, nowIso())
    .run();
  if ((result.meta.changes ?? 0) > 0) return true;
  const retry = await db
    .prepare(
      `UPDATE webhook_deliveries
       SET status = 'processing', detail = NULL, completed_at = NULL, received_at = ?
       WHERE delivery_id = ? AND status = 'failed'`,
    )
    .bind(nowIso(), deliveryId)
    .run();
  return (retry.meta.changes ?? 0) > 0;
}

export async function completeDelivery(
  db: D1Database,
  deliveryId: string,
  status: "processed" | "pending" | "ignored" | "failed",
  detail: string | null = null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE webhook_deliveries
       SET status = ?, detail = ?, completed_at = ?
       WHERE delivery_id = ?`,
    )
    .bind(status, detail, nowIso(), deliveryId)
    .run();
}

export async function getArticleByIssueNumber(
  db: D1Database,
  issueNumber: number,
): Promise<ArticleRow | null> {
  return db
    .prepare(`${articleSelect} WHERE a.issue_number = ? AND a.visibility = 'published'`)
    .bind(issueNumber)
    .first<ArticleRow>();
}

export async function getArticleByIssueId(
  db: D1Database,
  issueId: number,
): Promise<ArticleRow | null> {
  return db.prepare(`${articleSelect} WHERE a.issue_id = ?`).bind(issueId).first<ArticleRow>();
}

export async function listArticles(
  db: D1Database,
  options: {
    sort: "newest" | "updated";
    limit: number;
    cursor: CursorPayload | null;
    author?: string;
    label?: string;
    includeArchived?: boolean;
  },
): Promise<ArticleListRow[]> {
  const sortColumn = options.sort === "updated" ? "a.last_public_at" : "a.published_at";
  const conditions = ["a.visibility = 'published'"];
  const bindings: unknown[] = [];
  if (!options.includeArchived) conditions.push("a.state = 'open'");
  if (options.author) {
    conditions.push("au.login = ? COLLATE NOCASE");
    bindings.push(options.author);
  }
  if (options.label) {
    conditions.push(
      "EXISTS (SELECT 1 FROM article_labels alf JOIN labels lf ON lf.github_id = alf.label_id WHERE alf.article_id = a.issue_id AND lf.slug = ? COLLATE NOCASE)",
    );
    bindings.push(options.label);
  }
  if (options.cursor && typeof options.cursor.sort === "string") {
    conditions.push(`(${sortColumn} < ? OR (${sortColumn} = ? AND a.issue_id < ?))`);
    bindings.push(options.cursor.sort, options.cursor.sort, options.cursor.id);
  }
  bindings.push(options.limit);
  const query = `${articleSelect}
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${sortColumn} DESC, a.issue_id DESC
    LIMIT ?`;
  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<ArticleListRow>();
  return result.results;
}

export async function getComments(db: D1Database, articleId: number): Promise<CommentRow[]> {
  const result = await db
    .prepare(
      `SELECT
         c.github_id,
         c.body_html,
         c.body_text,
         c.github_url,
         c.github_created_at,
         c.github_updated_at,
         c.reactions_json,
         au.login AS author_login,
         au.avatar_url AS author_avatar_url,
         au.github_url AS author_github_url
       FROM comments c
       JOIN authors au ON au.github_id = c.author_id
       WHERE c.article_id = ? AND c.deleted_at IS NULL
       ORDER BY c.github_created_at, c.github_id`,
    )
    .bind(articleId)
    .all<CommentRow>();
  return result.results;
}

export async function getRandomArticle(
  db: D1Database,
): Promise<{ issue_number: number; slug: string } | null> {
  return db
    .prepare(
      `SELECT issue_number, slug FROM articles
       WHERE visibility = 'published' AND state = 'open'
       ORDER BY random() LIMIT 1`,
    )
    .first<{ issue_number: number; slug: string }>();
}

export async function applyIssueProjection(
  db: D1Database,
  repositoryId: number,
  issue: GitHubIssue,
  slug: string,
  labelSlugs: Map<number, string>,
  rendered: RenderedContent,
): Promise<ArticleMutation> {
  const existing = await getArticleByIssueId(db, issue.id);
  const timestamp = nowIso();
  const previousRevision = existing?.public_revision ?? 0;
  const revision = previousRevision + 1;
  const statements: D1PreparedStatement[] = [upsertAuthor(db, issue.user, timestamp)];

  if (existing) {
    statements.push(
      db
        .prepare(
          `UPDATE articles SET
             repository_id = ?, author_id = ?, title = ?, slug = ?, body_markdown = ?,
             body_html = ?, body_text = ?, excerpt = ?, github_url = ?, github_created_at = ?,
             github_updated_at = ?, state = ?, visibility = 'published', reactions_json = ?,
             last_public_at = ?, public_revision = ?
           WHERE issue_id = ?`,
        )
        .bind(
          repositoryId,
          issue.user.id,
          issue.title.trim(),
          slug,
          rendered.markdown,
          rendered.html,
          rendered.text,
          rendered.excerpt,
          issue.html_url,
          issue.created_at,
          issue.updated_at,
          issue.state,
          normalizeReactionSummary(issue.reactions),
          timestamp,
          revision,
          issue.id,
        ),
    );
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO articles (
             issue_id, issue_number, repository_id, author_id, title, slug,
             body_markdown, body_html, body_text, excerpt, github_url,
             github_created_at, github_updated_at, state, visibility,
             reactions_json, published_at, last_public_at, public_revision
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, 1)`,
        )
        .bind(
          issue.id,
          issue.number,
          repositoryId,
          issue.user.id,
          issue.title.trim(),
          slug,
          rendered.markdown,
          rendered.html,
          rendered.text,
          rendered.excerpt,
          issue.html_url,
          issue.created_at,
          issue.updated_at,
          issue.state,
          normalizeReactionSummary(issue.reactions),
          issue.created_at,
          timestamp,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        "INSERT OR IGNORE INTO article_slugs (article_id, slug, created_at) VALUES (?, ?, ?)",
      )
      .bind(issue.id, slug, timestamp),
    db.prepare("DELETE FROM article_labels WHERE article_id = ?").bind(issue.id),
  );
  for (const label of issue.labels) {
    const labelSlug = labelSlugs.get(label.id);
    if (!labelSlug || label.name.toLowerCase() === "internal") continue;
    statements.push(
      upsertLabel(db, label, timestamp, labelSlug),
      db
        .prepare("INSERT OR IGNORE INTO article_labels (article_id, label_id) VALUES (?, ?)")
        .bind(issue.id, label.id),
    );
  }
  statements.push(
    db
      .prepare(
        `UPDATE pending_revisions SET status = 'superseded', reviewed_at = ?
         WHERE entity_type = 'issue' AND entity_id = ? AND status = 'pending'`,
      )
      .bind(timestamp, issue.id),
    ...rebuildSearchStatements(db, issue.id),
  );
  await db.batch(statements);
  return {
    issueNumber: issue.number,
    previousSlug: existing?.slug ?? null,
    slug,
    previousRevision,
    revision,
  };
}

export async function updateIssueMetadata(
  db: D1Database,
  issue: GitHubIssue,
  labelSlugs: Map<number, string>,
): Promise<ArticleMutation | null> {
  const existing = await getArticleByIssueId(db, issue.id);
  if (!existing) return null;
  const timestamp = nowIso();
  const revision = existing.public_revision + 1;
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE articles SET state = ?, visibility = 'published', github_updated_at = ?,
         reactions_json = ?, last_public_at = ?, public_revision = ? WHERE issue_id = ?`,
      )
      .bind(
        issue.state,
        issue.updated_at,
        normalizeReactionSummary(issue.reactions),
        timestamp,
        revision,
        issue.id,
      ),
    db.prepare("DELETE FROM article_labels WHERE article_id = ?").bind(issue.id),
  ];
  for (const label of issue.labels) {
    const labelSlug = labelSlugs.get(label.id);
    if (!labelSlug || label.name.toLowerCase() === "internal") continue;
    statements.push(
      upsertLabel(db, label, timestamp, labelSlug),
      db
        .prepare("INSERT OR IGNORE INTO article_labels (article_id, label_id) VALUES (?, ?)")
        .bind(issue.id, label.id),
    );
  }
  statements.push(...rebuildSearchStatements(db, issue.id));
  await db.batch(statements);
  return {
    issueNumber: issue.number,
    previousSlug: existing.slug,
    slug: existing.slug,
    previousRevision: existing.public_revision,
    revision,
  };
}

export async function hideInternalArticle(
  db: D1Database,
  issue: GitHubIssue,
): Promise<ArticleMutation | null> {
  const existing = await getArticleByIssueId(db, issue.id);
  if (!existing) return null;
  const revision = existing.public_revision + 1;
  await db.batch([
    db
      .prepare(
        `UPDATE articles SET visibility = 'internal', github_updated_at = ?,
         last_public_at = ?, public_revision = ? WHERE issue_id = ?`,
      )
      .bind(issue.updated_at, nowIso(), revision, issue.id),
    db.prepare("DELETE FROM article_search WHERE article_id = ?").bind(String(issue.id)),
  ]);
  return {
    issueNumber: issue.number,
    previousSlug: existing.slug,
    slug: existing.slug,
    previousRevision: existing.public_revision,
    revision,
  };
}

export async function markArticleDeleted(
  db: D1Database,
  issue: GitHubIssue,
): Promise<ArticleMutation | null> {
  const existing = await getArticleByIssueId(db, issue.id);
  if (!existing) return null;
  const revision = existing.public_revision + 1;
  await db.batch([
    db
      .prepare(
        `UPDATE articles SET visibility = 'deleted', last_public_at = ?, public_revision = ?
         WHERE issue_id = ?`,
      )
      .bind(nowIso(), revision, issue.id),
    db.prepare("DELETE FROM article_search WHERE article_id = ?").bind(String(issue.id)),
  ]);
  return {
    issueNumber: issue.number,
    previousSlug: existing.slug,
    slug: existing.slug,
    previousRevision: existing.public_revision,
    revision,
  };
}

export async function applyCommentProjection(
  db: D1Database,
  issue: GitHubIssue,
  comment: GitHubComment,
  rendered: RenderedContent,
): Promise<ArticleMutation | null> {
  const article = await getArticleByIssueId(db, issue.id);
  if (article?.visibility !== "published") return null;
  const timestamp = nowIso();
  const existing = await db
    .prepare("SELECT public_revision FROM comments WHERE github_id = ?")
    .bind(comment.id)
    .first<{ public_revision: number }>();
  const commentRevision = (existing?.public_revision ?? 0) + 1;
  const articleRevision = article.public_revision + 1;
  await db.batch([
    upsertAuthor(db, comment.user, timestamp),
    db
      .prepare(
        `INSERT INTO comments (
           github_id, article_id, author_id, body_markdown, body_html, body_text,
           github_url, github_created_at, github_updated_at, reactions_json,
           public_revision, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(github_id) DO UPDATE SET
           author_id = excluded.author_id,
           body_markdown = excluded.body_markdown,
           body_html = excluded.body_html,
           body_text = excluded.body_text,
           github_url = excluded.github_url,
           github_updated_at = excluded.github_updated_at,
           reactions_json = excluded.reactions_json,
           public_revision = excluded.public_revision,
           deleted_at = NULL`,
      )
      .bind(
        comment.id,
        issue.id,
        comment.user.id,
        rendered.markdown,
        rendered.html,
        rendered.text,
        comment.html_url,
        comment.created_at,
        comment.updated_at,
        normalizeReactionSummary(comment.reactions),
        commentRevision,
      ),
    db
      .prepare(
        `UPDATE pending_revisions SET status = 'superseded', reviewed_at = ?
         WHERE entity_type = 'comment' AND entity_id = ? AND status = 'pending'`,
      )
      .bind(timestamp, comment.id),
    db
      .prepare("UPDATE articles SET last_public_at = ?, public_revision = ? WHERE issue_id = ?")
      .bind(timestamp, articleRevision, issue.id),
    ...rebuildSearchStatements(db, issue.id),
  ]);
  return {
    issueNumber: issue.number,
    previousSlug: article.slug,
    slug: article.slug,
    previousRevision: article.public_revision,
    revision: articleRevision,
  };
}

export async function deleteCommentProjection(
  db: D1Database,
  issue: GitHubIssue,
  commentId: number,
): Promise<ArticleMutation | null> {
  const article = await getArticleByIssueId(db, issue.id);
  if (article?.visibility !== "published") return null;
  const timestamp = nowIso();
  const revision = article.public_revision + 1;
  await db.batch([
    db.prepare("UPDATE comments SET deleted_at = ? WHERE github_id = ?").bind(timestamp, commentId),
    db
      .prepare("UPDATE articles SET last_public_at = ?, public_revision = ? WHERE issue_id = ?")
      .bind(timestamp, revision, issue.id),
    ...rebuildSearchStatements(db, issue.id),
  ]);
  return {
    issueNumber: issue.number,
    previousSlug: article.slug,
    slug: article.slug,
    previousRevision: article.public_revision,
    revision,
  };
}

export async function applyReactionProjection(
  db: D1Database,
  action: "created" | "deleted",
  reaction: GitHubReaction,
  issue: GitHubIssue | undefined,
  comment: GitHubComment | undefined,
): Promise<ArticleMutation | null> {
  const articleId = issue?.id ?? null;
  let resolvedArticleId = articleId;
  if (!resolvedArticleId && comment) {
    const parent = await db
      .prepare("SELECT article_id FROM comments WHERE github_id = ?")
      .bind(comment.id)
      .first<{ article_id: number }>();
    resolvedArticleId = parent?.article_id ?? null;
  }
  if (!resolvedArticleId) return null;
  const article = await getArticleByIssueId(db, resolvedArticleId);
  if (article?.visibility !== "published") return null;

  const timestamp = nowIso();
  const revision = article.public_revision + 1;
  const statements: D1PreparedStatement[] = [];
  if (action === "created") {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO reactions
           (github_id, article_id, comment_id, user_id, content, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          reaction.id,
          comment ? null : resolvedArticleId,
          comment?.id ?? null,
          reaction.user.id,
          reaction.content,
          reaction.created_at,
        ),
    );
  } else {
    statements.push(db.prepare("DELETE FROM reactions WHERE github_id = ?").bind(reaction.id));
  }
  if (comment) {
    statements.push(
      db
        .prepare("UPDATE comments SET reactions_json = ? WHERE github_id = ?")
        .bind(normalizeReactionSummary(comment.reactions), comment.id),
    );
  } else if (issue) {
    statements.push(
      db
        .prepare("UPDATE articles SET reactions_json = ? WHERE issue_id = ?")
        .bind(normalizeReactionSummary(issue.reactions), issue.id),
    );
  }
  statements.push(
    db
      .prepare("UPDATE articles SET last_public_at = ?, public_revision = ? WHERE issue_id = ?")
      .bind(timestamp, revision, resolvedArticleId),
  );
  await db.batch(statements);
  return {
    issueNumber: article.issue_number,
    previousSlug: article.slug,
    slug: article.slug,
    previousRevision: article.public_revision,
    revision,
  };
}

export async function queuePendingRevision(
  db: D1Database,
  input: PendingRevisionInput,
): Promise<number> {
  const timestamp = nowIso();
  await db
    .prepare(
      `UPDATE pending_revisions SET status = 'superseded', reviewed_at = ?
       WHERE entity_type = ? AND entity_id = ? AND status = 'pending'`,
    )
    .bind(timestamp, input.entityType, input.entityId)
    .run();
  const result = await db
    .prepare(
      `INSERT INTO pending_revisions (
         entity_type, entity_id, issue_id, issue_number, action, payload_json,
         raw_title, raw_body, sanitized_html, plain_text, spam_reason,
         moderation_flagged, moderation_categories_json, created_at, reviewer_note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.entityType,
      input.entityId,
      input.issueId,
      input.issueNumber,
      input.action,
      JSON.stringify(input.payload),
      input.rawTitle,
      input.rawBody,
      input.rendered.html,
      input.rendered.text,
      input.spamReason,
      input.moderationFlagged ? 1 : 0,
      JSON.stringify(input.moderationCategories),
      timestamp,
      input.failure,
    )
    .run();
  const id = result.meta.last_row_id;
  if (typeof id !== "number") throw new Error("pending_revision_insert_failed");
  return id;
}

export async function getPendingRevision(
  db: D1Database,
  id: number,
): Promise<PendingRevisionRow | null> {
  return db
    .prepare("SELECT * FROM pending_revisions WHERE id = ?")
    .bind(id)
    .first<PendingRevisionRow>();
}

export async function listPendingRevisions(
  db: D1Database,
  limit = 50,
): Promise<PendingRevisionRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM pending_revisions
       WHERE status = 'pending'
       ORDER BY created_at, id
       LIMIT ?`,
    )
    .bind(limit)
    .all<PendingRevisionRow>();
  return result.results;
}

export async function recordModerationDecision(
  db: D1Database,
  revisionId: number,
  decision: "approved" | "rejected",
  note: string | null,
): Promise<void> {
  const timestamp = nowIso();
  await db.batch([
    db
      .prepare(
        `UPDATE pending_revisions
         SET status = ?, reviewed_at = ?, reviewer_note = ?
         WHERE id = ? AND status IN ('pending', 'superseded')`,
      )
      .bind(decision, timestamp, note, revisionId),
    db
      .prepare(
        `INSERT INTO moderation_audit (revision_id, decision, decided_at, note)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(revisionId, decision, timestamp, note),
  ]);
}

function buildFtsQuery(value: string): string | null {
  const terms =
    value
      .normalize("NFKC")
      .match(/[\p{L}\p{N}_-]+/gu)
      ?.slice(0, 8) ?? [];
  if (terms.length === 0) return null;
  return terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(" AND ");
}

export interface SearchRow extends ArticleListRow {
  rank: number;
  snippet: string;
}

export async function searchArticles(
  db: D1Database,
  query: string,
  limit: number,
  cursor: CursorPayload | null,
): Promise<SearchRow[]> {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];
  const bindings: unknown[] = [ftsQuery];
  let cursorClause = "";
  if (cursor && typeof cursor.sort === "number") {
    cursorClause =
      "AND (bm25(article_search) > ? OR (bm25(article_search) = ? AND a.issue_id < ?))";
    bindings.push(cursor.sort, cursor.sort, cursor.id);
  }
  bindings.push(limit);
  const result = await db
    .prepare(
      `SELECT
         a.issue_id,
         a.issue_number,
         a.title,
         a.slug,
         a.excerpt,
         a.state,
         a.published_at,
         a.last_public_at,
         a.public_revision,
         a.reactions_json,
         au.login AS author_login,
         au.avatar_url AS author_avatar_url,
         COALESCE((
           SELECT json_group_array(json_object('name', l.name, 'slug', l.slug, 'color', l.color))
           FROM article_labels al JOIN labels l ON l.github_id = al.label_id
           WHERE al.article_id = a.issue_id
         ), '[]') AS labels,
         (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.issue_id AND c.deleted_at IS NULL) AS comment_count,
         bm25(article_search) AS rank,
         snippet(article_search, 2, char(1), char(2), ' … ', 28) AS snippet
       FROM article_search
       JOIN articles a ON a.issue_id = CAST(article_search.article_id AS INTEGER)
       JOIN authors au ON au.github_id = a.author_id
       WHERE article_search MATCH ? AND a.visibility = 'published'
       ${cursorClause}
       ORDER BY rank ASC, a.issue_id DESC
       LIMIT ?`,
    )
    .bind(...bindings)
    .all<SearchRow>();
  return result.results;
}

export async function getAuthor(db: D1Database, login: string): Promise<GitHubUser | null> {
  const row = await db
    .prepare(
      `SELECT github_id AS id, login, avatar_url, github_url AS html_url
       FROM authors WHERE login = ? COLLATE NOCASE`,
    )
    .bind(login)
    .first<GitHubUser>();
  return row;
}

export async function getLabel(
  db: D1Database,
  slug: string,
): Promise<{ name: string; slug: string; color: string; description: string | null } | null> {
  return db
    .prepare("SELECT name, slug, color, description FROM labels WHERE slug = ? COLLATE NOCASE")
    .bind(slug)
    .first<{ name: string; slug: string; color: string; description: string | null }>();
}
