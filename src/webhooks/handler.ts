import type { Context } from "hono";
import {
  applyCommentProjection,
  applyIssueProjection,
  applyReactionProjection,
  claimDelivery,
  completeDelivery,
  deleteCommentProjection,
  getArticleByIssueId,
  hideInternalArticle,
  markArticleDeleted,
  queuePendingRevision,
  updateIssueMetadata,
  type ArticleMutation,
} from "../data/repository";
import { invalidateArticleCache } from "../lib/cache";
import { renderGitHubMarkdown } from "../lib/github-markdown";
import { resolveLabelSlugs } from "../lib/labels";
import { readBodyWithLimit } from "../lib/request";
import { checkContentSafety } from "../lib/safety";
import { slugify } from "../lib/slug";
import { verifyGitHubSignature } from "../lib/signature";
import type {
  AppBindings,
  CommentWebhookPayload,
  GitHubIssue,
  IssueWebhookPayload,
  ReactionWebhookPayload,
  RenderedContent,
} from "../types";

type AppContext = Context<{ Bindings: AppBindings }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function repositoryMatches(payload: unknown, env: AppBindings): boolean {
  if (!isRecord(payload) || !isRecord(payload.repository)) return false;
  return (
    String(payload.repository.id) === env.GITHUB_REPOSITORY_ID &&
    payload.repository.full_name === `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`
  );
}

function hasInternalLabel(issue: GitHubIssue): boolean {
  return issue.labels.some((label) => label.name.toLowerCase() === "internal");
}

function issueSourceUrl(env: AppBindings, issueNumber: number): string {
  return `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function scheduleInvalidation(c: AppContext, mutation: ArticleMutation | null): void {
  if (!mutation) return;
  c.executionCtx.waitUntil(
    invalidateArticleCache(c.env.PUBLIC_ORIGIN, mutation).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: "cache_invalidation_failed",
          issueNumber: mutation.issueNumber,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }),
  );
}

async function queueIssue(
  c: AppContext,
  payload: IssueWebhookPayload,
  reason: string | null,
): Promise<void> {
  const body = payload.issue.body ?? "";
  const safety = await checkContentSafety(c.env.OPENAI_API_KEY, payload.issue.title, body, "issue");
  if (safety.publishable) {
    let rendered: RenderedContent;
    try {
      rendered = await renderGitHubMarkdown(body, {
        repository: `${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}`,
        sourceUrl: issueSourceUrl(c.env, payload.issue.number),
        ...(c.env.GITHUB_RENDER_TOKEN ? { token: c.env.GITHUB_RENDER_TOKEN } : {}),
      });
    } catch (error) {
      const failure = errorMessage(error, "github_markdown_failed");
      await queuePendingRevision(c.env.DB, {
        entityType: "issue",
        entityId: payload.issue.id,
        issueId: payload.issue.id,
        issueNumber: payload.issue.number,
        action: payload.action,
        payload,
        rawTitle: payload.issue.title,
        rawBody: body,
        rendered: safety.rendered,
        spamReason: null,
        moderationFlagged: false,
        moderationCategories: safety.moderation?.categories ?? {},
        failure,
      });
      throw new PendingContentError(failure);
    }
    const labelSlugs = await resolveLabelSlugs(c.env.DB, payload.issue.labels);
    const mutation = await applyIssueProjection(
      c.env.DB,
      payload.repository.id,
      payload.issue,
      slugify(payload.issue.title),
      labelSlugs,
      rendered,
    );
    scheduleInvalidation(c, mutation);
    return;
  }
  await queuePendingRevision(c.env.DB, {
    entityType: "issue",
    entityId: payload.issue.id,
    issueId: payload.issue.id,
    issueNumber: payload.issue.number,
    action: payload.action,
    payload,
    rawTitle: payload.issue.title,
    rawBody: body,
    rendered: safety.rendered,
    spamReason: safety.spamReason,
    moderationFlagged: safety.moderation?.flagged ?? false,
    moderationCategories: safety.moderation?.categories ?? {},
    failure: reason ?? safety.failure,
  });
  throw new PendingContentError(safety.spamReason ?? safety.failure ?? reason ?? "flagged");
}

async function handleIssueEvent(c: AppContext, payload: IssueWebhookPayload): Promise<void> {
  const { action, issue } = payload;
  if (hasInternalLabel(issue)) {
    scheduleInvalidation(c, await hideInternalArticle(c.env.DB, issue));
    return;
  }
  if (action === "opened" || action === "edited") {
    await queueIssue(c, payload, null);
    return;
  }
  if (action === "deleted") {
    scheduleInvalidation(c, await markArticleDeleted(c.env.DB, issue));
    return;
  }
  if (["labeled", "unlabeled", "closed", "reopened"].includes(action)) {
    const existing = await getArticleByIssueId(c.env.DB, issue.id);
    if (!existing) {
      await queueIssue(
        c,
        payload,
        action === "unlabeled" ? "internal_label_removed" : "article_not_published",
      );
      return;
    }
    const labelSlugs = await resolveLabelSlugs(c.env.DB, issue.labels);
    scheduleInvalidation(c, await updateIssueMetadata(c.env.DB, issue, labelSlugs));
  }
}

async function handleCommentEvent(c: AppContext, payload: CommentWebhookPayload): Promise<void> {
  if (hasInternalLabel(payload.issue)) return;
  if (payload.action === "deleted") {
    scheduleInvalidation(
      c,
      await deleteCommentProjection(c.env.DB, payload.issue, payload.comment.id),
    );
    return;
  }
  if (payload.action !== "created" && payload.action !== "edited") return;
  const safety = await checkContentSafety(
    c.env.OPENAI_API_KEY,
    "",
    payload.comment.body,
    "comment",
  );
  if (safety.publishable) {
    let rendered: RenderedContent;
    try {
      rendered = await renderGitHubMarkdown(payload.comment.body, {
        repository: `${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}`,
        sourceUrl: issueSourceUrl(c.env, payload.issue.number),
        ...(c.env.GITHUB_RENDER_TOKEN ? { token: c.env.GITHUB_RENDER_TOKEN } : {}),
      });
    } catch (error) {
      const failure = errorMessage(error, "github_markdown_failed");
      await queuePendingRevision(c.env.DB, {
        entityType: "comment",
        entityId: payload.comment.id,
        issueId: payload.issue.id,
        issueNumber: payload.issue.number,
        action: payload.action,
        payload,
        rawTitle: null,
        rawBody: payload.comment.body,
        rendered: safety.rendered,
        spamReason: null,
        moderationFlagged: false,
        moderationCategories: safety.moderation?.categories ?? {},
        failure,
      });
      throw new PendingContentError(failure);
    }
    const mutation = await applyCommentProjection(
      c.env.DB,
      payload.issue,
      payload.comment,
      rendered,
    );
    if (!mutation) {
      await queuePendingRevision(c.env.DB, {
        entityType: "comment",
        entityId: payload.comment.id,
        issueId: payload.issue.id,
        issueNumber: payload.issue.number,
        action: payload.action,
        payload,
        rawTitle: null,
        rawBody: payload.comment.body,
        rendered: safety.rendered,
        spamReason: null,
        moderationFlagged: false,
        moderationCategories: safety.moderation?.categories ?? {},
        failure: "article_not_published",
      });
      throw new PendingContentError("article_not_published");
    }
    scheduleInvalidation(c, mutation);
    return;
  }
  await queuePendingRevision(c.env.DB, {
    entityType: "comment",
    entityId: payload.comment.id,
    issueId: payload.issue.id,
    issueNumber: payload.issue.number,
    action: payload.action,
    payload,
    rawTitle: null,
    rawBody: payload.comment.body,
    rendered: safety.rendered,
    spamReason: safety.spamReason,
    moderationFlagged: safety.moderation?.flagged ?? false,
    moderationCategories: safety.moderation?.categories ?? {},
    failure: safety.failure,
  });
  throw new PendingContentError(safety.spamReason ?? safety.failure ?? "flagged");
}

class PendingContentError extends Error {}

export async function handleGitHubWebhook(c: AppContext): Promise<Response> {
  let body: Uint8Array;
  try {
    body = await readBodyWithLimit(c.req.raw, 1_000_000);
  } catch {
    return c.json({ error: "payload_too_large" }, 413);
  }
  const validSignature = await verifyGitHubSignature(
    body,
    c.req.header("x-hub-signature-256") ?? null,
    c.env.GITHUB_WEBHOOK_SECRET,
  );
  if (!validSignature) return c.json({ error: "invalid_signature" }, 401);

  const eventName = c.req.header("x-github-event") ?? "";
  const deliveryId = c.req.header("x-github-delivery") ?? "";
  if (!/^[a-z0-9-]{1,100}$/i.test(deliveryId)) return c.json({ error: "invalid_delivery" }, 400);

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (!repositoryMatches(payload, c.env)) return c.json({ error: "wrong_repository" }, 403);
  const action = isRecord(payload) && typeof payload.action === "string" ? payload.action : null;
  if (!(await claimDelivery(c.env.DB, deliveryId, eventName, action))) {
    return c.json({ ok: true, duplicate: true });
  }

  try {
    if (eventName === "issues") {
      await handleIssueEvent(c, payload as IssueWebhookPayload);
    } else if (eventName === "issue_comment") {
      await handleCommentEvent(c, payload as CommentWebhookPayload);
    } else if (eventName === "reaction") {
      const reactionPayload = payload as ReactionWebhookPayload;
      scheduleInvalidation(
        c,
        await applyReactionProjection(
          c.env.DB,
          reactionPayload.action,
          reactionPayload.reaction,
          reactionPayload.issue,
          reactionPayload.comment,
        ),
      );
    } else if (eventName === "ping") {
      // Repository identity and signature have already been verified.
    } else {
      await completeDelivery(c.env.DB, deliveryId, "ignored", "unsupported_event");
      return c.json({ ok: true, ignored: true });
    }
    await completeDelivery(c.env.DB, deliveryId, "processed");
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof PendingContentError) {
      await completeDelivery(c.env.DB, deliveryId, "pending", error.message);
      return c.json({ ok: true, pending: true }, 202);
    }
    const message = error instanceof Error ? error.message : "webhook_failed";
    await completeDelivery(c.env.DB, deliveryId, "failed", message);
    console.error(
      JSON.stringify({ event: "webhook_failed", deliveryId, eventName, error: message }),
    );
    return c.json({ error: "webhook_failed" }, 500);
  }
}
