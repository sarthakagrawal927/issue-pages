// App Health application logs for the GitHub webhook.
//
// The pilot's open question is whether strangers publish here at all, and the
// delivery table already records every outcome — but nobody reads a D1 table.
// These logs put the three outcomes that matter in the Logs tab, and the two
// that need a human in Slack.
//
// Levels are chosen so the channel stays readable: a new article is worth an
// interruption, an edit or a comment is not (debug is stored but not routed to
// Slack by the default rules), blocked content needs review, and a failed
// delivery means the site is silently missing a page.
import type { AppBindings, GitHubIssue } from "../types";
import { createPing } from "./ping";

export type WebhookOutcome = "processed" | "pending" | "failed";

export interface WebhookLogContext {
  eventName: string;
  action: string | null;
  issue: GitHubIssue | null;
  authorLogin: string | null;
}

interface LogSpec {
  event: string;
  level: "debug" | "info" | "warn" | "error";
  icon: string;
}

/** The title is public content already rendered on the site, but cap it anyway. */
function articleTitle(issue: GitHubIssue | null): string {
  const title = issue?.title?.trim();
  return title ? title.slice(0, 120) : issueLabel(issue);
}

function issueLabel(issue: GitHubIssue | null): string {
  return `issue #${issue?.number ?? "?"}`;
}

function processedSpec(context: WebhookLogContext): LogSpec | null {
  if (context.eventName === "issues") {
    if (context.action === "opened") {
      return { event: "article.published", level: "info", icon: "📄" };
    }
    if (context.action === "edited") {
      return { event: "article.updated", level: "debug", icon: "✏️" };
    }
    // labeled / closed / reopened only refresh metadata on an existing page.
    return null;
  }
  if (context.eventName === "issue_comment" && context.action === "created") {
    return { event: "comment.published", level: "debug", icon: "💬" };
  }
  return null;
}

function specFor(outcome: WebhookOutcome, context: WebhookLogContext): LogSpec | null {
  if (outcome === "processed") return processedSpec(context);
  if (outcome === "pending") return { event: "article.blocked", level: "warn", icon: "🛑" };
  return { event: "webhook.failed", level: "error", icon: "🚨" };
}

/**
 * Send one log for a finished webhook delivery, or nothing when the delivery
 * only touched metadata. Never throws; a no-op until APP_HEALTH_INGEST_KEY is
 * set, so it is safe on an unkeyed deployment.
 *
 * `reason` is the internal failure code (`flagged`, `github_markdown_failed`,
 * …). Author-controlled text is deliberately not forwarded: a blocked article's
 * title and body stay in the pending-revision queue where the owner reviews
 * them, instead of being replayed into a Slack channel.
 */
export async function logWebhookOutcome(
  env: AppBindings,
  outcome: WebhookOutcome,
  context: WebhookLogContext,
  reason?: string,
): Promise<void> {
  const spec = specFor(outcome, context);
  if (!spec) return;

  const ping = createPing({
    // exactOptionalPropertyTypes: an absent key must be an absent property.
    ...(env.APP_HEALTH_INGEST_KEY ? { key: env.APP_HEALTH_INGEST_KEY } : {}),
    environment: env.APP_HEALTH_ENVIRONMENT,
    onError: (error: unknown) => {
      console.error(
        JSON.stringify({
          event: "app_health_log_failed",
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    },
  });

  const isOwner = context.authorLogin === env.GITHUB_OWNER;
  await ping(spec.event, {
    level: spec.level,
    icon: spec.icon,
    title: outcome === "processed" ? articleTitle(context.issue) : issueLabel(context.issue),
    props: {
      issue: context.issue?.number ?? null,
      author: context.authorLogin,
      // The pilot's actual question: does anyone other than the owner publish?
      stranger: context.authorLogin ? !isOwner : null,
      action: context.action,
      reason: reason ?? null,
    },
  });
}
