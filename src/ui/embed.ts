/*
THESIS — A repository becomes a continuous issue folio, not a miniature website.
OWN-WORLD — Preserve Issue Dispatch: slate masthead, ivory sheets, gold issue markers.
STORY — Scan the ledger, turn older/newer pages, open an issue, read, then return.
FIRST VIEWPORT — Repository identity and the first issue rows must appear without ceremony.
FORM — Rectilinear, compact, typographic, responsive; seed f64d9c8f candidate 7.
*/
import type { EmbedOptions } from "../lib/embed";
import { embedQuery } from "../lib/embed";
import type {
  PublicComment,
  PublicIssueDiscussion,
  PublicIssueList,
  PublicIssuePage,
  PublicIssueSummary,
  PublicRepository,
} from "../lib/github-reader";
import { encodeReaderCursor } from "../lib/github-reader";
import { escapeHtml } from "./templates";

const reactionNames: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  laugh: "😄",
  hooray: "🎉",
  confused: "😕",
  heart: "❤️",
  rocket: "🚀",
  eyes: "👀",
};

function safeHttpsUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "https://github.com";
  } catch {
    return "https://github.com";
  }
}

function date(value: string): string {
  const parsed = new Date(value);
  const label = Number.isNaN(parsed.valueOf())
    ? "Unknown date"
    : new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(parsed);
  return `<time datetime="${escapeHtml(value)}">${escapeHtml(label)}</time>`;
}

function repositoryPath(repository: PublicRepository): string {
  return `/embed/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
}

function repositoryHref(
  repository: PublicRepository,
  options: EmbedOptions,
  cursor?: string | null,
): string {
  const query = embedQuery(options, { cursor });
  return `${repositoryPath(repository)}?${query}`;
}

function issueHref(
  repository: PublicRepository,
  issue: PublicIssueSummary,
  options: EmbedOptions,
  backCursor?: string | null,
): string {
  const query = embedQuery(options, { back: backCursor });
  return `${repositoryPath(repository)}/issues/${issue.number}/${encodeURIComponent(issue.slug)}?${query}`;
}

function freshness(stale: boolean, cachedAt: string): string {
  return stale
    ? `<div class="embed-notice" role="status"><strong>Last safe copy.</strong> GitHub could not refresh this view. Cached ${date(cachedAt)}.</div>`
    : "";
}

function labels(issue: PublicIssueSummary): string {
  if (issue.labels.length === 0) return "";
  return `<div class="embed-labels" aria-label="Labels">${issue.labels
    .map((label) => `<span>${escapeHtml(label.name)}</span>`)
    .join("")}</div>`;
}

function reactions(values: Record<string, number>, source: string, label: string): string {
  const entries = Object.entries(values).filter(([, count]) => count > 0);
  if (entries.length === 0) return "";
  return `<div class="embed-reactions" aria-label="${escapeHtml(label)} reactions"><a href="${escapeHtml(safeHttpsUrl(source))}" target="_blank" rel="external noopener">Reactions on GitHub ↗</a>${entries
    .map(
      ([name, count]) =>
        `<span><span aria-hidden="true">${reactionNames[name] ?? "•"}</span><span class="sr-only">${escapeHtml(name)}</span> ${count}</span>`,
    )
    .join("")}</div>`;
}

function issueRow(
  repository: PublicRepository,
  issue: PublicIssueSummary,
  options: EmbedOptions,
  cursor: string | null,
): string {
  const href = issueHref(repository, issue, options, cursor);
  return `<article class="embed-row">
    <a class="embed-number" href="${escapeHtml(href)}" target="_self" aria-label="Read issue ${issue.number}">#${issue.number}</a>
    <div class="embed-row__body">
      <a class="embed-row__title" href="${escapeHtml(href)}" target="_self">${escapeHtml(issue.title)}</a>
      <p>by <a href="${escapeHtml(safeHttpsUrl(issue.author.githubUrl))}" target="_blank" rel="external noopener">@${escapeHtml(issue.author.login)}</a> · ${issue.commentCount} ${issue.commentCount === 1 ? "reply" : "replies"}</p>
      ${issue.excerpt ? `<div class="embed-excerpt">${escapeHtml(issue.excerpt)}</div>` : ""}
    </div>
    <div class="embed-row__date"><span>${issue.state === "closed" ? "Closed" : "Updated"}</span>${date(issue.updatedAt)}</div>
  </article>`;
}

function shellHeader(repository: PublicRepository, options: EmbedOptions): string {
  const repoUrl = `https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  return `<header class="embed-header">
    <a class="embed-brand" href="${escapeHtml(repositoryHref(repository, options))}" target="_self" aria-label="IssuePages repository index">IssuePages</a>
    <strong>${escapeHtml(repository.owner)}<span>/</span>${escapeHtml(repository.repo)}</strong>
    <a href="${repoUrl}" target="_blank" rel="external noopener">GitHub ↗</a>
  </header>`;
}

export function embedLayout(
  title: string,
  repository: PublicRepository | null,
  body: string,
  options: EmbedOptions,
  mermaid = false,
): string {
  return `<!doctype html>
<html lang="en" data-theme="${options.theme}" data-density="${options.density}" data-embed-channel="${escapeHtml(options.channel)}" style="--embed-accent:${options.accent}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)} · IssuePages embed</title>
  <link rel="stylesheet" href="/embed.css?v=20260826-2">
  <script type="module" src="/assets/reader.js?v=20260826-2"></script>
  ${mermaid ? '<script type="module" src="/assets/mermaid.js?v=20260825-2"></script>' : ""}
</head>
<body>
  <a class="skip-link" href="#embed-main">Skip to content</a>
  <div class="embed-frame">
    ${repository ? shellHeader(repository, options) : ""}
    <main id="embed-main">${body}</main>
    <footer class="embed-footer"><span>Issues rendered by IssuePages</span><a href="https://issues.sarthakagrawal.dev" target="_blank" rel="noopener">Make your own ↗</a></footer>
  </div>
</body>
</html>`;
}

export function embedRepositoryPage(
  result: PublicIssueList,
  options: EmbedOptions,
  currentCursor: string | null,
): string {
  const issues = result.issues.length
    ? result.issues
        .map((issue) => issueRow(result.repository, issue, options, currentCursor))
        .join("")
    : '<div class="embed-empty"><strong>No issues on this page.</strong><br>It may be empty or contain only pull requests.</div>';
  const previous =
    result.page > 1
      ? repositoryHref(
          result.repository,
          options,
          result.page === 2 ? null : encodeReaderCursor(result.page - 1),
        )
      : null;
  return `${freshness(result.stale, result.cachedAt)}
    <section class="embed-intro">
      <div><p>Public issue publication</p><h1>${escapeHtml(result.repository.owner)}<span>/</span>${escapeHtml(result.repository.repo)}</h1></div>
      <span>Page ${result.page}</span>
    </section>
    <div class="embed-ledger">${issues}</div>
    ${previous || result.nextCursor ? `<nav class="embed-pager" aria-label="Issue pages">${previous ? `<a href="${escapeHtml(previous)}" target="_self">← Newer</a>` : "<span></span>"}<strong>Page ${result.page}</strong>${result.nextCursor ? `<a href="${escapeHtml(repositoryHref(result.repository, options, result.nextCursor))}" target="_self">Older →</a>` : "<span></span>"}</nav>` : ""}`;
}

function commentView(comment: PublicComment): string {
  const avatar = safeHttpsUrl(comment.author.avatarUrl);
  return `<article class="embed-comment" id="comment-${comment.id}">
    <img src="${escapeHtml(avatar)}" width="36" height="36" loading="lazy" alt="">
    <div><p class="embed-comment__meta"><a href="${escapeHtml(safeHttpsUrl(comment.author.githubUrl))}" target="_blank" rel="external noopener">@${escapeHtml(comment.author.login)}</a> · ${date(comment.createdAt)} · <a href="${escapeHtml(safeHttpsUrl(comment.githubUrl))}" target="_blank" rel="external noopener">source ↗</a></p>
    <div class="prose">${comment.bodyHtml}</div>${reactions(comment.reactions, comment.githubUrl, `Comment by ${comment.author.login}`)}</div>
  </article>`;
}

export function embedIssuePage(
  result: PublicIssuePage,
  options: EmbedOptions,
  backCursor: string | null,
): string {
  const { repository, issue } = result;
  const repoHref = repositoryHref(repository, options, backCursor);
  const discussionHref = `${repositoryPath(repository)}/issues/${issue.number}/discussion?${embedQuery(options)}`;
  const discussion =
    issue.commentCount === 0
      ? '<div class="embed-empty">No replies yet. Discussion stays on GitHub.</div>'
      : `<div class="embed-discussion__content is-loading" data-reader-discussion data-source="${escapeHtml(discussionHref)}" data-github-source="${escapeHtml(issue.githubUrl)}" aria-live="polite" aria-busy="true"><p>Loading discussion…</p></div>`;
  return `${freshness(result.stale, result.cachedAt)}
    <article class="embed-article">
      <a class="embed-back" href="${escapeHtml(repoHref)}" target="_self">← All issues</a>
      <div class="embed-article__meta"><span>#${issue.number}</span><span>${issue.state === "closed" ? "Closed" : "Open"}</span></div>
      <h1>${escapeHtml(issue.title)}</h1>
      ${labels(issue)}
      <p class="embed-byline">By <a href="${escapeHtml(safeHttpsUrl(issue.author.githubUrl))}" target="_blank" rel="external noopener">@${escapeHtml(issue.author.login)}</a> · opened ${date(issue.createdAt)} · edited ${date(issue.updatedAt)}</p>
      ${issue.state === "closed" ? '<div class="embed-notice"><strong>Closed issue.</strong> This page remains available as a read-only record.</div>' : ""}
      <div class="prose">${issue.bodyHtml || "<p>This issue has no body.</p>"}</div>
      ${reactions(issue.reactions, issue.githubUrl, "Issue")}
      <p class="embed-source"><a href="${escapeHtml(issue.githubUrl)}" target="_blank" rel="external noopener">Open original issue on GitHub ↗</a></p>
      <section class="embed-discussion" aria-labelledby="embed-discussion-title"><h2 id="embed-discussion-title">Discussion <span>${issue.commentCount}</span></h2>${discussion}</section>
    </article>`;
}

export function embedDiscussionFragment(
  result: PublicIssueDiscussion,
  githubIssueUrl: string,
): string {
  const comments = result.comments.length
    ? result.comments.map(commentView).join("")
    : '<div class="embed-empty">No replies are currently visible.</div>';
  return `${freshness(result.stale, result.cachedAt)}${comments}${
    result.commentsTruncated
      ? `<p class="embed-notice"><strong>Showing the first ${result.comments.length} comments.</strong> <a href="${escapeHtml(githubIssueUrl)}" target="_blank" rel="external noopener">Continue on GitHub ↗</a></p>`
      : ""
  }`;
}

export function embedErrorPage(
  code: number,
  heading: string,
  detail: string,
  retry?: string,
): string {
  return `<div class="embed-error"><span>${code}</span><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(detail)}</p>${retry ? `<a href="${escapeHtml(retry)}" target="_self">Try again →</a>` : ""}</div>`;
}
