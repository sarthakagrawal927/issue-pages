import type { SearchRow } from "../data/repository";
import type { ArticleListRow, ArticleRow, CommentRow, GitHubUser } from "../types";

export interface SiteIdentity {
  owner: string;
  repo: string;
}

interface LabelView {
  name: string;
  slug: string;
  color: string;
}

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

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function datetime(value: string): string {
  return `<time datetime="${escapeHtml(value)}">${escapeHtml(formatDate(value))}</time>`;
}

function parseLabels(value: string | null): LabelView[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (label): label is LabelView =>
        typeof label === "object" &&
        label !== null &&
        typeof label.name === "string" &&
        typeof label.slug === "string" &&
        typeof label.color === "string",
    );
  } catch {
    return [];
  }
}

function parseReactions(value: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => {
        return typeof entry[1] === "number" && entry[1] > 0;
      }),
    );
  } catch {
    return {};
  }
}

function articleHref(article: Pick<ArticleListRow, "issue_number" | "slug">): string {
  return `/articles/${article.issue_number}/${encodeURIComponent(article.slug)}`;
}

function publishHref(site: SiteIdentity): string {
  return `https://github.com/${encodeURIComponent(site.owner)}/${encodeURIComponent(site.repo)}/issues/new?template=publish.md`;
}

function repoHref(site: SiteIdentity): string {
  return `https://github.com/${encodeURIComponent(site.owner)}/${encodeURIComponent(site.repo)}`;
}

function header(site: SiteIdentity): string {
  return `<header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="/" aria-label="IssuePages home">IssuePages</a>
      <span class="header-note">A public repository, made readable.</span>
      <nav class="site-nav" aria-label="Primary navigation">
        <form class="search-mini" role="search" action="/search" method="get">
          <label class="sr-only" for="site-search">Search pages</label>
          <input id="site-search" name="q" type="search" placeholder="Search pages" autocomplete="off">
          <button type="submit" aria-label="Search">Go</button>
        </form>
        <a class="nav-link" href="/random">Random</a>
        <a class="nav-link" href="${publishHref(site)}" rel="external">Publish</a>
      </nav>
    </div>
  </header>`;
}

function footer(site: SiteIdentity): string {
  return `<footer class="site-footer">
    <div class="site-footer__inner">
      <span>IssuePages is a readable view of a GitHub repository.</span>
      <a href="${repoHref(site)}" rel="external">View the source repository ↗</a>
    </div>
  </footer>`;
}

export function layout(
  site: SiteIdentity,
  title: string,
  body: string,
  options: { description?: string; mermaid?: boolean; polling?: boolean } = {},
): string {
  const pageTitle = title === "IssuePages" ? title : `${title} · IssuePages`;
  const description =
    options.description ?? "Open a GitHub issue and leave a public page on the internet.";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#d3aa36">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="stylesheet" href="/styles.css?v=20260825-5">
  ${options.polling ? '<script src="/article-poll.js?v=20260825-5" defer></script>' : ""}
  ${options.mermaid ? '<script type="module" src="/assets/mermaid.js?v=20260825-1"></script>' : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(site)}
  <main id="main">${body}</main>
  ${footer(site)}
</body>
</html>`;
}

function status(article: Pick<ArticleListRow, "state">): string {
  return article.state === "closed"
    ? '<span class="dispatch-status dispatch-status--archived">Archived</span>'
    : '<span class="dispatch-status">Published</span>';
}

function dispatchRow(article: ArticleListRow): string {
  return `<li class="dispatch-item">
    <a class="dispatch-number" href="${articleHref(article)}" aria-label="Open issue ${article.issue_number}">#${article.issue_number}</a>
    <a class="dispatch-title" href="${articleHref(article)}">${escapeHtml(article.title)}</a>
    <a class="dispatch-author" href="/authors/${encodeURIComponent(article.author_login)}">@${escapeHtml(article.author_login)}</a>
    <span class="dispatch-date">${datetime(article.last_public_at)}</span>
    ${status(article)}
  </li>`;
}

function pageStrip(article: ArticleListRow, dateField: "published_at" | "last_public_at"): string {
  const label = dateField === "published_at" ? "Published" : "Updated";
  return `<article class="page-strip">
    <a class="page-strip__number" href="${articleHref(article)}" aria-label="Open issue ${article.issue_number}">#${article.issue_number}</a>
    <div class="page-strip__body">
      <a class="page-strip__title" href="${articleHref(article)}">${escapeHtml(article.title)}</a>
      <span class="page-strip__meta">by <a href="/authors/${encodeURIComponent(article.author_login)}">@${escapeHtml(article.author_login)}</a> · ${article.comment_count} ${article.comment_count === 1 ? "reply" : "replies"}</span>
    </div>
    <span class="page-strip__date"><span>${label}</span>${datetime(article[dateField])}</span>
  </article>`;
}

export function homePage(
  site: SiteIdentity,
  newest: ArticleListRow[],
  updated: ArticleListRow[],
): string {
  const board = newest.length
    ? `<ol class="dispatch-list">${newest.slice(0, 7).map(dispatchRow).join("")}</ol>`
    : `<div class="empty-dispatch"><strong>No public pages yet.</strong><br>Open the first issue and start the repository.</div>`;
  const newestList = newest.length
    ? newest
        .slice(0, 5)
        .map((article) => pageStrip(article, "published_at"))
        .join("")
    : '<div class="empty-state">The newest-pages ledger is empty for now.</div>';
  const updatedList = updated.length
    ? updated
        .slice(0, 5)
        .map((article) => pageStrip(article, "last_public_at"))
        .join("")
    : '<div class="empty-state">Updates will appear here after published pages change.</div>';

  return `<section class="hero">
    <div class="hero__message">
      <p class="eyebrow">A public publishing repository</p>
      <h1>This website is a GitHub repository<span class="stop">.</span></h1>
      <p class="hero-copy">Open an issue and leave your page on the internet. GitHub stays the editor, identity, and discussion; IssuePages makes it readable and discoverable.</p>
      <a class="button" href="${publishHref(site)}" rel="external">Publish something <span aria-hidden="true">↗</span></a>
      <p class="publish-trust">Uses your GitHub account. Safe pages appear automatically; held content waits for review.</p>
      <ol class="steps" aria-label="How publishing works">
        <li><strong>Write</strong> Open an issue</li>
        <li><strong>Check</strong> Safety review runs</li>
        <li><strong>Read</strong> The page appears</li>
      </ol>
    </div>
    <section class="dispatch-board" aria-labelledby="live-board-title">
      <div class="dispatch-board__head">
        <h2 id="live-board-title">Live pages</h2>
        <span class="dispatch-board__legend">Newest public issues</span>
      </div>
      ${board}
    </section>
  </section>
  <section class="section section--split">
    <div>
      <div class="section-head"><h2>Newest</h2><a class="text-link" href="/pages/newest">All newest →</a></div>
      ${newestList}
    </div>
    <div>
      <div class="section-head"><h2>Recently updated</h2><a class="text-link" href="/pages/updated">All updates →</a></div>
      ${updatedList}
    </div>
  </section>`;
}

function labelLinks(labelsJson: string | null): string {
  const labels = parseLabels(labelsJson);
  if (labels.length === 0) return "";
  return `<div class="tags" aria-label="Labels">${labels
    .map(
      (label) =>
        `<a class="tag" href="/labels/${encodeURIComponent(label.slug)}">${escapeHtml(label.name)}</a>`,
    )
    .join("")}</div>`;
}

function reactionList(value: string, accessiblePrefix: string, sourceHref: string): string {
  const entries = Object.entries(parseReactions(value));
  if (entries.length === 0) return "";
  return `<div class="reactions" aria-label="${escapeHtml(accessiblePrefix)} reactions"><a class="reactions__label" href="${escapeHtml(sourceHref)}" rel="external">Reactions on GitHub ↗</a>${entries
    .map(
      ([name, count]) =>
        `<span class="reaction"><span aria-hidden="true">${reactionNames[name] ?? "•"}</span> <span class="sr-only">${escapeHtml(name)}</span>${count}</span>`,
    )
    .join("")}</div>`;
}

function commentView(comment: CommentRow): string {
  const avatar = safeHttpsUrl(comment.author_avatar_url);
  return `<article class="comment" id="comment-${comment.github_id}">
    ${avatar ? `<img class="avatar" src="${escapeHtml(avatar)}" width="48" height="48" loading="lazy" alt="">` : '<span class="avatar" aria-hidden="true"></span>'}
    <div>
      <div class="comment__meta"><a href="/authors/${encodeURIComponent(comment.author_login)}">@${escapeHtml(comment.author_login)}</a> · ${datetime(comment.github_created_at)} · <a href="${escapeHtml(comment.github_url)}" rel="external">source ↗</a></div>
      <div class="prose">${comment.body_html}</div>
      ${reactionList(comment.reactions_json, `Comment by ${comment.author_login}`, comment.github_url)}
    </div>
  </article>`;
}

export function articlePage(article: ArticleRow, comments: CommentRow[]): string {
  const archived = article.state === "closed";
  const discussion = comments.length
    ? comments.map(commentView).join("")
    : '<div class="empty-state">No public replies yet. Discussion stays on the original GitHub issue.</div>';
  return `<div class="page-shell" data-article-issue="${article.issue_number}" data-article-version="${article.public_revision}">
    <aside class="page-rail" aria-label="Page details">
      <p class="eyebrow">Issue #${article.issue_number}</p>
      <h1>${escapeHtml(article.title)}</h1>
      ${labelLinks(article.labels)}
      <dl>
        <dt>Author</dt><dd><a href="/authors/${encodeURIComponent(article.author_login)}">@${escapeHtml(article.author_login)}</a></dd>
        <dt>Published</dt><dd>${datetime(article.published_at)}</dd>
        <dt>Last edited</dt><dd>${datetime(article.github_updated_at)}</dd>
        <dt>Status</dt><dd>${archived ? "Archived" : "Published"}</dd>
      </dl>
      <a class="button button--light" href="${escapeHtml(article.github_url)}" rel="external">Open on GitHub <span aria-hidden="true">↗</span></a>
    </aside>
    <article class="article-pane">
      ${archived ? '<div class="archive-notice"><strong>Archived page.</strong> The source issue is closed; this page remains available as a record.</div>' : ""}
      <div class="article-route">
        <span class="article-route__number">#${article.issue_number}</span>
        <a class="article-route__source" href="${escapeHtml(article.github_url)}" rel="external">Original issue</a>
        <span class="article-route__status${archived ? " article-route__status--archived" : ""}">${archived ? "Archived" : "Published"}</span>
      </div>
      <div class="prose">${article.body_html}</div>
      ${reactionList(article.reactions_json, "Article", article.github_url)}
      <section class="discussion" aria-labelledby="discussion-title">
        <h2 id="discussion-title">Discussion <span>${comments.length}</span></h2>
        ${discussion}
      </section>
      <nav class="onward" aria-label="Keep reading">
        <h2>Keep reading</h2>
        <a href="/authors/${encodeURIComponent(article.author_login)}">More by @${escapeHtml(article.author_login)}</a>
        <a href="/random">Open a random page</a>
        <a href="/">Return to live pages</a>
      </nav>
    </article>
  </div>`;
}

function listingItems(
  articles: ArticleListRow[],
  dateField: "published_at" | "last_public_at",
): string {
  if (articles.length === 0)
    return '<div class="empty-state">Nothing public matches this view yet.</div>';
  return articles.map((article) => pageStrip(article, dateField)).join("");
}

export function listingPage(
  heading: string,
  intro: string,
  articles: ArticleListRow[],
  nextHref: string | null,
  dateField: "published_at" | "last_public_at" = "published_at",
  extra = "",
): string {
  return `<div class="listing-shell">
    ${extra}
    <h1 class="listing-title">${escapeHtml(heading)}</h1>
    <p class="listing-intro">${escapeHtml(intro)}</p>
    <div class="listing">${listingItems(articles, dateField)}</div>
    ${nextHref ? `<nav class="pagination" aria-label="Pagination"><a class="button button--light" href="${escapeHtml(nextHref)}">Older pages →</a></nav>` : ""}
  </div>`;
}

function highlightedSnippet(value: string): string {
  return escapeHtml(value).replaceAll("\u0001", "<mark>").replaceAll("\u0002", "</mark>");
}

export function searchPage(query: string, rows: SearchRow[], nextHref: string | null): string {
  const results = !query
    ? '<div class="empty-state">Search titles, page content, authors, labels, and public comments.</div>'
    : rows.length
      ? rows
          .map(
            (row) => `<article class="result">
              <h2><a href="${articleHref(row)}">${escapeHtml(row.title)}</a></h2>
              <p class="page-strip__meta">Issue #${row.issue_number} · @${escapeHtml(row.author_login)} · ${datetime(row.published_at)}</p>
              <p>${highlightedSnippet(row.snippet || row.excerpt)}</p>
            </article>`,
          )
          .join("")
      : '<div class="empty-state"><strong>No matching pages.</strong><br>Try fewer or more general words.</div>';
  return `<div class="listing-shell">
    <h1 class="listing-title">Search</h1>
    <form class="search-form" role="search" action="/search" method="get">
      <label class="sr-only" for="search-query">Search all public content</label>
      <input id="search-query" name="q" type="search" value="${escapeHtml(query)}" placeholder="Words, authors, or labels" autofocus>
      <button type="submit">Search</button>
    </form>
    <div aria-live="polite">${results}</div>
    ${nextHref ? `<nav class="pagination" aria-label="Pagination"><a class="button button--light" href="${escapeHtml(nextHref)}">More results →</a></nav>` : ""}
  </div>`;
}

export function authorIntro(author: GitHubUser): string {
  const avatar = safeHttpsUrl(author.avatar_url);
  return `<div class="identity-strip">
    ${avatar ? `<img class="avatar avatar--large" src="${escapeHtml(avatar)}" width="72" height="72" alt="">` : ""}
    <div><p class="eyebrow">GitHub author</p><a href="${escapeHtml(author.html_url)}" rel="external">View @${escapeHtml(author.login)} on GitHub ↗</a></div>
  </div>`;
}

export function errorPage(code: number, heading: string, detail: string): string {
  return `<div class="listing-shell">
    <div class="error-code" aria-hidden="true">${code}</div>
    <h1 class="listing-title">${escapeHtml(heading)}</h1>
    <p class="listing-intro">${escapeHtml(detail)}</p>
    <p><a class="button button--light" href="/">Return to live pages →</a></p>
  </div>`;
}
