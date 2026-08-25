import { Hono, type Context } from "hono";
import {
  getArticleByIssueNumber,
  getAuthor,
  getComments,
  getLabel,
  getRandomArticle,
  listArticles,
  searchArticles,
} from "./data/repository";
import { decideModeration, listModerationQueue } from "./admin/handler";
import { articleCacheKey } from "./lib/cache";
import { decodeCursor, encodeCursor, type CursorPayload } from "./lib/cursor";
import {
  decodeReaderCursor,
  getPublicIssue,
  GitHubReaderError,
  listPublicIssues,
  parsePublicRepository,
} from "./lib/github-reader";
import type { AppBindings, ArticleListRow } from "./types";
import { articlePollingScript, styles } from "./ui/assets";
import {
  articlePage,
  authorIntro,
  errorPage,
  homePage,
  layout,
  listingPage,
  publicIssueReaderPage,
  readerErrorPage,
  readerFormPage,
  repositoryReaderPage,
  searchPage,
  type SiteIdentity,
} from "./ui/templates";
import { handleGitHubWebhook } from "./webhooks/handler";

type AppEnv = { Bindings: AppBindings };
const app = new Hono<AppEnv>();
const pageSize = 12;

function siteIdentity(env: AppBindings): SiteIdentity {
  return {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    moderationMode: env.MODERATION_MODE === "owner-only" ? "owner-only" : "openai",
  };
}

function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

app.use("*", async (c, next) => {
  await next();
  c.res = securityHeaders(c.res);
});

function html(c: Context<AppEnv>, title: string, body: string): Response {
  const response = c.html(layout(siteIdentity(c.env), title, body));
  response.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  return response;
}

function readerHeaders(response: Response, cacheState?: "FRESH" | "STALE"): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (cacheState) headers.set("X-IssuePages-Reader-Cache", cacheState);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

app.use("/read", async (c, next) => {
  await next();
  c.res = readerHeaders(c.res);
});

app.use("/github/*", async (c, next) => {
  await next();
  c.res = readerHeaders(c.res);
});

function readerHtml(
  c: Context<AppEnv>,
  title: string,
  body: string,
  options: { status?: 200 | 400 | 404 | 429 | 503; mermaid?: boolean; stale?: boolean } = {},
): Response {
  const status = options.status ?? 200;
  const response = c.html(
    layout(siteIdentity(c.env), title, body, {
      description: "Read public GitHub issues as clean, read-only pages.",
      reader: true,
      robots: true,
      ...(options.mermaid === undefined ? {} : { mermaid: options.mermaid }),
    }),
    status,
    {
      "Cache-Control":
        status === 200
          ? "public, max-age=60, stale-while-revalidate=300, stale-if-error=86400"
          : "no-store",
    },
  );
  return readerHeaders(response, status === 200 ? (options.stale ? "STALE" : "FRESH") : undefined);
}

function readerError(c: Context<AppEnv>, error: unknown): Response {
  const repository = parsePublicRepository(`${c.req.param("owner")}/${c.req.param("repo")}`);
  const repositoryHref = repository
    ? `/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`
    : undefined;
  const requestUrl = new URL(c.req.url);
  const retryHref = `${requestUrl.pathname}${requestUrl.search}`;
  if (error instanceof GitHubReaderError) {
    if (error.code === "not_found") {
      return readerHtml(
        c,
        "Repository unavailable",
        readerErrorPage(
          404,
          "Public issues unavailable",
          "The repository or issue may be missing, private, or have issues disabled.",
          { ...(repositoryHref ? { repositoryHref } : {}) },
        ),
        { status: 404 },
      );
    }
    const response = readerHtml(
      c,
      "GitHub temporarily unavailable",
      readerErrorPage(
        503,
        "GitHub could not answer",
        error.code === "rate_limited"
          ? "The shared public GitHub allowance is exhausted. Wait a minute and try again."
          : "The public reader could not refresh this repository. Try again shortly.",
        { retryHref, ...(repositoryHref ? { repositoryHref } : {}) },
      ),
      { status: 503 },
    );
    response.headers.set("Retry-After", "60");
    return response;
  }
  throw error;
}

function parsePageCursor(
  value: string | undefined,
  expected: "string" | "number",
): CursorPayload | null {
  if (!value) return null;
  const cursor = decodeCursor(value);
  return cursor && typeof cursor.sort === expected ? cursor : null;
}

function nextCursor(
  rows: ArticleListRow[],
  sort: "newest" | "updated",
): { page: ArticleListRow[]; cursor: string | null } {
  const page = rows.slice(0, pageSize);
  if (rows.length <= pageSize) return { page, cursor: null };
  const last = page.at(-1);
  if (!last) return { page, cursor: null };
  const value = sort === "updated" ? last.last_public_at : last.published_at;
  return { page, cursor: encodeCursor(value, last.issue_id) };
}

function appendCursor(path: string, cursor: string | null, query?: string): string | null {
  if (!cursor) return null;
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("cursor", cursor);
  return `${path}?${params.toString()}`;
}

async function withinRateLimit(
  limiter: RateLimit,
  request: Request,
  route: string,
): Promise<boolean> {
  const address = request.headers.get("cf-connecting-ip") ?? "local";
  try {
    return (await limiter.limit({ key: `${route}:${address}` })).success;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "rate_limit_unavailable",
        route,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return true;
  }
}

app.get("/styles.css", (c) => {
  return c.body(styles, 200, {
    "Cache-Control": "public, max-age=86400, immutable",
    "Content-Type": "text/css; charset=utf-8",
  });
});

app.get("/article-poll.js", (c) => {
  return c.body(articlePollingScript, 200, {
    "Cache-Control": "public, max-age=86400, immutable",
    "Content-Type": "text/javascript; charset=utf-8",
  });
});

app.get("/healthz", (c) =>
  c.json({ ok: true, service: "issue-pages" }, 200, { "Cache-Control": "no-store" }),
);

app.get("/", async (c) => {
  const [newest, updated] = await Promise.all([
    listArticles(c.env.DB, { sort: "newest", limit: 7, cursor: null, includeArchived: true }),
    listArticles(c.env.DB, { sort: "updated", limit: 5, cursor: null, includeArchived: true }),
  ]);
  return html(c, "IssuePages", homePage(siteIdentity(c.env), newest, updated));
});

app.get("/read", (c) => {
  const input = c.req.query("repo") ?? "";
  if (!input) return readerHtml(c, "Read any public repository", readerFormPage());
  const repository = parsePublicRepository(input);
  if (!repository) {
    return readerHtml(
      c,
      "Choose a public repository",
      readerFormPage(
        input.slice(0, 300),
        "Enter owner/repository or a complete https://github.com/owner/repository URL.",
      ),
      { status: 400 },
    );
  }
  return readerHeaders(
    c.redirect(
      `/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
      303,
    ),
  );
});

async function readerRepository(c: Context<AppEnv>): Promise<Response> {
  if (!(await withinRateLimit(c.env.SEARCH_RATE_LIMIT, c.req.raw, "reader"))) {
    const response = readerHtml(
      c,
      "Reader paused",
      readerErrorPage(429, "Too many repository reads", "Wait a minute, then try again.", {
        retryHref: c.req.path,
      }),
      { status: 429 },
    );
    response.headers.set("Retry-After", "60");
    return response;
  }
  const repository = parsePublicRepository(`${c.req.param("owner")}/${c.req.param("repo")}`);
  if (!repository) {
    return readerHtml(
      c,
      "Repository unavailable",
      readerErrorPage(
        404,
        "Public issues unavailable",
        "That is not a valid public repository path.",
      ),
      { status: 404 },
    );
  }
  const page = decodeReaderCursor(c.req.query("cursor"));
  if (page === null) {
    return readerHtml(
      c,
      "Invalid page",
      readerErrorPage(400, "That page link is invalid", "Return to the repository and try again.", {
        repositoryHref: `/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
      }),
      { status: 400 },
    );
  }
  try {
    const result = await listPublicIssues({
      repository,
      page,
      origin: c.env.PUBLIC_ORIGIN,
      ctx: c.executionCtx,
    });
    return readerHtml(c, `${repository.owner}/${repository.repo}`, repositoryReaderPage(result), {
      stale: result.stale,
    });
  } catch (error) {
    return readerError(c, error);
  }
}

app.get("/github/:owner/:repo", readerRepository);

async function readerIssue(c: Context<AppEnv>, redirectShort: boolean): Promise<Response> {
  if (!(await withinRateLimit(c.env.SEARCH_RATE_LIMIT, c.req.raw, "reader"))) {
    const response = readerHtml(
      c,
      "Reader paused",
      readerErrorPage(429, "Too many repository reads", "Wait a minute, then try again.", {
        retryHref: c.req.path,
      }),
      { status: 429 },
    );
    response.headers.set("Retry-After", "60");
    return response;
  }
  const repository = parsePublicRepository(`${c.req.param("owner")}/${c.req.param("repo")}`);
  const issueNumber = Number(c.req.param("number"));
  if (!repository || !Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return readerHtml(
      c,
      "Issue unavailable",
      readerErrorPage(404, "Public issue unavailable", "That is not a valid public issue path."),
      { status: 404 },
    );
  }
  try {
    const result = await getPublicIssue({
      repository,
      issueNumber,
      origin: c.env.PUBLIC_ORIGIN,
      ctx: c.executionCtx,
    });
    const canonical = `/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/issues/${issueNumber}/${encodeURIComponent(result.issue.slug)}`;
    if (redirectShort || c.req.param("slug") !== result.issue.slug) {
      return readerHeaders(c.redirect(canonical, 308));
    }
    const hasMermaid =
      result.issue.hasMermaid || result.comments.some((comment) => comment.hasMermaid);
    return readerHtml(c, result.issue.title, publicIssueReaderPage(result), {
      mermaid: hasMermaid,
      stale: result.stale,
    });
  } catch (error) {
    return readerError(c, error);
  }
}

app.get("/github/:owner/:repo/issues/:number", (c) => readerIssue(c, true));
app.get("/github/:owner/:repo/issues/:number/:slug", (c) => readerIssue(c, false));

async function renderListing(c: Context<AppEnv>, sort: "newest" | "updated"): Promise<Response> {
  const rawCursor = c.req.query("cursor");
  const cursor = parsePageCursor(rawCursor, "string");
  if (rawCursor && !cursor) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Invalid cursor",
        errorPage(
          400,
          "That page link is invalid",
          "Return to the beginning of this list and try again.",
        ),
      ),
      400,
    );
  }
  const rows = await listArticles(c.env.DB, {
    sort,
    limit: pageSize + 1,
    cursor,
    includeArchived: true,
  });
  const result = nextCursor(rows, sort);
  const path = sort === "newest" ? "/pages/newest" : "/pages/updated";
  const heading = sort === "newest" ? "Newest pages" : "Recently updated";
  const intro =
    sort === "newest"
      ? "Public pages in the order their GitHub issues were opened."
      : "Public pages ordered by their latest safe issue, comment, or reaction update.";
  return html(
    c,
    heading,
    listingPage(
      heading,
      intro,
      result.page,
      appendCursor(path, result.cursor),
      sort === "newest" ? "published_at" : "last_public_at",
    ),
  );
}

app.get("/pages/newest", (c) => renderListing(c, "newest"));
app.get("/pages/updated", (c) => renderListing(c, "updated"));

app.get("/articles/:number", async (c) => {
  const issueNumber = Number(c.req.param("number"));
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Page not found",
        errorPage(404, "Page not found", "Issue numbers are positive whole numbers."),
      ),
      404,
    );
  }
  const article = await getArticleByIssueNumber(c.env.DB, issueNumber);
  if (!article) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Page not found",
        errorPage(
          404,
          "No public page here",
          "The issue may be unpublished, reserved for project work, or missing.",
        ),
      ),
      404,
    );
  }
  return c.redirect(`/articles/${article.issue_number}/${encodeURIComponent(article.slug)}`, 308);
});

app.get("/articles/:number/:slug", async (c) => {
  const issueNumber = Number(c.req.param("number"));
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Page not found",
        errorPage(404, "Page not found", "This is not a valid public issue number."),
      ),
      404,
    );
  }
  const article = await getArticleByIssueNumber(c.env.DB, issueNumber);
  if (!article) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Page not found",
        errorPage(
          404,
          "No public page here",
          "The issue may be unpublished, reserved for project work, or missing.",
        ),
      ),
      404,
    );
  }
  if (c.req.param("slug") !== article.slug) {
    return c.redirect(`/articles/${article.issue_number}/${encodeURIComponent(article.slug)}`, 308);
  }

  const key = articleCacheKey(c.env.PUBLIC_ORIGIN, article.issue_number, article.public_revision);
  const cached = await caches.default.match(key);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-IssuePages-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const comments = await getComments(c.env.DB, article.issue_id);
  const hasMermaid =
    article.body_html.includes("data-mermaid") ||
    comments.some((comment) => comment.body_html.includes("data-mermaid"));
  const body = layout(siteIdentity(c.env), article.title, articlePage(article, comments), {
    description: article.excerpt,
    mermaid: hasMermaid,
    polling: true,
  });
  const response = c.html(body, 200, {
    "Cache-Control": "public, max-age=0, s-maxage=86400",
    ETag: `"article-${article.issue_number}-${article.public_revision}"`,
    "X-IssuePages-Cache": "MISS",
  });
  c.executionCtx.waitUntil(caches.default.put(key, response.clone()));
  return response;
});

app.get("/api/articles/:number/version", async (c) => {
  if (!(await withinRateLimit(c.env.VERSION_RATE_LIMIT, c.req.raw, "version"))) {
    return c.json({ error: "rate_limited" }, 429, {
      "Cache-Control": "no-store",
      "Retry-After": "60",
    });
  }
  const issueNumber = Number(c.req.param("number"));
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return c.json({ error: "not_found" }, 404, { "Cache-Control": "no-store" });
  }
  const article = await getArticleByIssueNumber(c.env.DB, issueNumber);
  if (!article) return c.json({ error: "not_found" }, 404, { "Cache-Control": "no-store" });
  return c.json(
    {
      issue: article.issue_number,
      revision: article.public_revision,
      updatedAt: article.last_public_at,
    },
    200,
    { "Cache-Control": "no-store" },
  );
});

app.get("/authors/:login", async (c) => {
  const login = c.req.param("login");
  const author = await getAuthor(c.env.DB, login);
  if (!author) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Author not found",
        errorPage(404, "Author not found", "No public pages belong to that GitHub author."),
      ),
      404,
    );
  }
  const rawCursor = c.req.query("cursor");
  const cursor = parsePageCursor(rawCursor, "string");
  if (rawCursor && !cursor) return c.text("Invalid cursor", 400);
  const rows = await listArticles(c.env.DB, {
    sort: "newest",
    limit: pageSize + 1,
    cursor,
    author: author.login,
    includeArchived: true,
  });
  const result = nextCursor(rows, "newest");
  const next = appendCursor(`/authors/${encodeURIComponent(author.login)}`, result.cursor);
  return html(
    c,
    `@${author.login}`,
    listingPage(
      `@${author.login}`,
      `Public pages opened by ${author.login}.`,
      result.page,
      next,
      "published_at",
      authorIntro(author),
    ),
  );
});

app.get("/labels/:slug", async (c) => {
  const label = await getLabel(c.env.DB, c.req.param("slug"));
  if (!label) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Label not found",
        errorPage(404, "Label not found", "No public pages currently use that label."),
      ),
      404,
    );
  }
  const rawCursor = c.req.query("cursor");
  const cursor = parsePageCursor(rawCursor, "string");
  if (rawCursor && !cursor) return c.text("Invalid cursor", 400);
  const rows = await listArticles(c.env.DB, {
    sort: "newest",
    limit: pageSize + 1,
    cursor,
    label: label.slug,
    includeArchived: true,
  });
  const result = nextCursor(rows, "newest");
  const next = appendCursor(`/labels/${encodeURIComponent(label.slug)}`, result.cursor);
  return html(
    c,
    label.name,
    listingPage(
      label.name,
      label.description ?? `Public pages carrying the ${label.name} GitHub label.`,
      result.page,
      next,
    ),
  );
});

app.get("/search", async (c) => {
  if (!(await withinRateLimit(c.env.SEARCH_RATE_LIMIT, c.req.raw, "search"))) {
    return c.html(
      layout(
        siteIdentity(c.env),
        "Search paused",
        errorPage(429, "Too many searches", "Wait a minute, then try again."),
      ),
      429,
      { "Retry-After": "60" },
    );
  }
  const query = (c.req.query("q") ?? "").normalize("NFKC").trim().slice(0, 200);
  const rawCursor = c.req.query("cursor");
  const cursor = parsePageCursor(rawCursor, "number");
  if (rawCursor && !cursor) return c.text("Invalid cursor", 400);
  const rows = query ? await searchArticles(c.env.DB, query, pageSize + 1, cursor) : [];
  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  const next =
    rows.length > pageSize && last
      ? appendCursor("/search", encodeCursor(last.rank, last.issue_id), query)
      : null;
  return html(c, query ? `Search: ${query}` : "Search", searchPage(query, page, next));
});

app.get("/random", async (c) => {
  const article = await getRandomArticle(c.env.DB);
  if (!article) return c.redirect("/", 302);
  return c.redirect(`/articles/${article.issue_number}/${encodeURIComponent(article.slug)}`, 302);
});

app.post("/webhooks/github", handleGitHubWebhook);
app.get("/admin/moderation", listModerationQueue);
app.post("/admin/moderation/:id/approve", (c) => decideModeration(c, "approved"));
app.post("/admin/moderation/:id/reject", (c) => decideModeration(c, "rejected"));

app.notFound((c) =>
  c.html(
    layout(
      siteIdentity(c.env),
      "Page not found",
      errorPage(404, "Page not found", "That route is not part of the public repository."),
    ),
    404,
  ),
);

app.onError((error, c) => {
  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({ event: "request_failed", requestId, error: error.message }));
  return c.html(
    layout(
      siteIdentity(c.env),
      "Something went wrong",
      errorPage(
        500,
        "Something went wrong",
        `The request could not be completed. Reference: ${requestId}`,
      ),
    ),
    500,
    { "Cache-Control": "no-store" },
  );
});

export default app;
