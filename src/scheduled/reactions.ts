import {
  applyReactionSummaries,
  listPublishedReactionTargets,
  normalizeReactionSummary,
  type ReactionSummaryUpdate,
  readSyncCursor,
  writeSyncCursor,
} from "../data/repository";
import { invalidateArticleCache } from "../lib/cache";
import {
  GitHubReactionClient,
  GitHubReactionError,
  type ReactionSyncLimits,
  resolveReactionSyncLimits,
} from "../lib/github-reactions";
import type { AppBindings } from "../types";

export const REACTION_SYNC_KEY = "reactions";

export interface ReactionSyncResult {
  status: "skipped" | "completed" | "failed";
  reason?: string;
  scanned: number;
  changed: number;
  requests: number;
  cursorIssueId: number;
  cursorCommentId: number;
}

export interface ReactionSyncOptions {
  /** Test-only bounds. Values may only lower the hard limits. */
  limits?: Partial<ReactionSyncLimits>;
  now?: () => number;
}

function errorCode(error: unknown): string {
  if (error instanceof GitHubReactionError) return error.code;
  return error instanceof Error ? error.message : "unknown";
}

/**
 * Bounded reconciliation of GitHub reaction summaries into D1.
 *
 * GitHub emits no standalone repository reaction webhook event, so a
 * reaction-only change is invisible to the webhook path. This runs on cron,
 * never on reader traffic, and leaves public state untouched whenever it cannot
 * authenticate or complete.
 */
export async function runReactionSync(
  env: AppBindings,
  options: ReactionSyncOptions = {},
): Promise<ReactionSyncResult> {
  const limits = resolveReactionSyncLimits(options.limits);
  const now = options.now ?? Date.now;
  const startedAt = now();
  const token = env.GITHUB_RENDER_TOKEN;

  if (!token) {
    console.log(JSON.stringify({ event: "reaction_sync_skipped", reason: "missing_render_token" }));
    return {
      status: "skipped",
      reason: "missing_render_token",
      scanned: 0,
      changed: 0,
      requests: 0,
      cursorIssueId: 0,
      cursorCommentId: 0,
    };
  }

  const cursor = await readSyncCursor(env.DB, REACTION_SYNC_KEY);
  const page = await listPublishedReactionTargets(env.DB, {
    cursorIssueId: cursor.cursorIssueId,
    cursorCommentId: cursor.cursorCommentId,
    maxArticles: limits.maxArticles,
    maxItems: limits.maxItems,
  });

  const client = new GitHubReactionClient({
    token,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    limits,
    now,
  });

  const updates: ReactionSummaryUpdate[] = [];
  let scanned = 0;
  let missing = 0;
  let stoppedAt: { issueId: number; commentId: number } | null = null;

  for (const target of page.targets) {
    if (client.exhausted) {
      stoppedAt = {
        issueId: target.issueId,
        commentId: target.kind === "issue" ? 0 : target.targetId,
      };
      break;
    }
    let result: Awaited<ReturnType<GitHubReactionClient["issueReactions"]>>;
    try {
      result =
        target.kind === "issue"
          ? await client.issueReactions(target.targetId, target.etag)
          : await client.commentReactions(target.targetId, target.etag);
    } catch (error) {
      if (error instanceof GitHubReactionError && error.code === "not_found") {
        // A deleted issue or comment is not a run failure; skip it and continue.
        missing += 1;
        scanned += 1;
        continue;
      }
      const code = errorCode(error);
      console.error(
        JSON.stringify({
          event: "reaction_sync_failed",
          reason: code,
          scanned,
          requests: client.requestCount,
          cursorIssueId: cursor.cursorIssueId,
          cursorCommentId: cursor.cursorCommentId,
        }),
      );
      // Public state stays untouched and the cursor stays where it was, so the
      // next scheduled run retries the same position.
      await writeSyncCursor(env.DB, REACTION_SYNC_KEY, {
        cursorIssueId: cursor.cursorIssueId,
        cursorCommentId: cursor.cursorCommentId,
        status: "failed",
        detail: code,
      });
      return {
        status: "failed",
        reason: code,
        scanned,
        changed: 0,
        requests: client.requestCount,
        cursorIssueId: cursor.cursorIssueId,
        cursorCommentId: cursor.cursorCommentId,
      };
    }

    scanned += 1;
    if (result.notModified) continue;
    const reactionsJson = normalizeReactionSummary(result.summary ?? undefined);
    const changed = reactionsJson !== target.reactionsJson;
    if (!changed && result.etag === target.etag) continue;
    updates.push({
      kind: target.kind,
      issueId: target.issueId,
      rowId: target.kind === "issue" ? target.issueId : target.targetId,
      reactionsJson: changed ? reactionsJson : null,
      etag: result.etag,
    });
  }

  const mutations = await applyReactionSummaries(env.DB, updates);
  for (const mutation of mutations) {
    try {
      await invalidateArticleCache(env.PUBLIC_ORIGIN, mutation);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "cache_invalidation_failed",
          issueNumber: mutation.issueNumber,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  const next = stoppedAt ?? page.next;
  await writeSyncCursor(env.DB, REACTION_SYNC_KEY, {
    cursorIssueId: next?.issueId ?? 0,
    cursorCommentId: next?.commentId ?? 0,
    status: "completed",
    detail: JSON.stringify({ scanned, changed: mutations.length, missing }),
  });

  console.log(
    JSON.stringify({
      event: "reaction_sync_completed",
      scanned,
      missing,
      changed: mutations.length,
      requests: client.requestCount,
      durationMs: now() - startedAt,
      cursorIssueId: next?.issueId ?? 0,
      cursorCommentId: next?.commentId ?? 0,
    }),
  );

  return {
    status: "completed",
    scanned,
    changed: mutations.length,
    requests: client.requestCount,
    cursorIssueId: next?.issueId ?? 0,
    cursorCommentId: next?.commentId ?? 0,
  };
}

export const scheduled: ExportedHandlerScheduledHandler<AppBindings> = async (_controller, env) => {
  try {
    await runReactionSync(env);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "reaction_sync_crashed",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
};
