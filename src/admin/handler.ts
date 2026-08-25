import type { Context } from "hono";
import {
  applyCommentProjection,
  applyIssueProjection,
  getPendingRevision,
  listPendingRevisions,
  recordModerationDecision,
} from "../data/repository";
import { invalidateArticleCache } from "../lib/cache";
import { renderGitHubMarkdown } from "../lib/github-markdown";
import { resolveLabelSlugs } from "../lib/labels";
import { readBodyWithLimit } from "../lib/request";
import { constantTimeSecretEqual } from "../lib/signature";
import { slugify } from "../lib/slug";
import type {
  AppBindings,
  CommentWebhookPayload,
  IssueWebhookPayload,
  RenderedContent,
} from "../types";

type AppContext = Context<{ Bindings: AppBindings }>;

async function authorized(c: AppContext): Promise<boolean> {
  const authorization = c.req.header("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  return constantTimeSecretEqual(authorization.slice(7), c.env.ADMIN_REVIEW_SECRET);
}

async function readNote(c: AppContext): Promise<string | null> {
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength === 0) return null;
  const body = await readBodyWithLimit(c.req.raw, 10_000);
  const payload = JSON.parse(new TextDecoder().decode(body)) as { note?: unknown };
  return typeof payload.note === "string" ? payload.note.slice(0, 500) : null;
}

export async function listModerationQueue(c: AppContext): Promise<Response> {
  if (!(await authorized(c))) return c.json({ error: "unauthorized" }, 401);
  const revisions = await listPendingRevisions(c.env.DB);
  return c.json({ revisions }, 200, { "Cache-Control": "no-store" });
}

export async function decideModeration(
  c: AppContext,
  decision: "approved" | "rejected",
): Promise<Response> {
  if (!(await authorized(c))) return c.json({ error: "unauthorized" }, 401);
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: "invalid_revision" }, 400);
  const revision = await getPendingRevision(c.env.DB, id);
  if (revision?.status !== "pending") return c.json({ error: "revision_not_pending" }, 404);
  const note = await readNote(c);

  if (decision === "rejected") {
    await recordModerationDecision(c.env.DB, revision.id, decision, note);
    return c.json({ ok: true, decision });
  }

  let rendered: RenderedContent;
  try {
    rendered = await renderGitHubMarkdown(revision.raw_body, {
      repository: `${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}`,
      sourceUrl: `https://github.com/${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}/issues/${revision.issue_number}`,
      ...(c.env.GITHUB_RENDER_TOKEN ? { token: c.env.GITHUB_RENDER_TOKEN } : {}),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "moderation_render_failed",
        revisionId: revision.id,
        error: error instanceof Error ? error.message : "github_markdown_failed",
      }),
    );
    return c.json({ error: "render_unavailable" }, 503);
  }
  let mutation = null;
  if (revision.entity_type === "issue") {
    const payload = JSON.parse(revision.payload_json) as IssueWebhookPayload;
    const labelSlugs = await resolveLabelSlugs(c.env.DB, payload.issue.labels);
    mutation = await applyIssueProjection(
      c.env.DB,
      payload.repository.id,
      payload.issue,
      slugify(revision.raw_title ?? payload.issue.title),
      labelSlugs,
      rendered,
    );
  } else {
    const payload = JSON.parse(revision.payload_json) as CommentWebhookPayload;
    mutation = await applyCommentProjection(c.env.DB, payload.issue, payload.comment, rendered);
    if (!mutation) return c.json({ error: "article_not_published" }, 409);
  }
  await recordModerationDecision(c.env.DB, revision.id, decision, note);
  c.executionCtx.waitUntil(invalidateArticleCache(c.env.PUBLIC_ORIGIN, mutation));
  return c.json({ ok: true, decision, article: mutation.issueNumber });
}
