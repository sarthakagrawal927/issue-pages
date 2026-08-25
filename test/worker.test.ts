import { env, exports } from "cloudflare:workers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { encodeReaderCursor } from "../src/lib/github-reader";

let renderProbeAvailable = false;
const readerRequests: Array<{
  url: string;
  headers: Headers;
  redirect: string | undefined;
  cf: RequestInitCfProperties | undefined;
}> = [];

function publicIssue(number = 7, pullRequest = false): Record<string, unknown> {
  return {
    id: 70 + number,
    number,
    title: number === 7 ? "A public reader issue" : "Pull request result",
    body: "Reader **body**.",
    body_text: "Reader body.",
    body_html: '<p dir="auto">Reader <strong>body</strong>.</p><script>alert(1)</script>',
    html_url: `https://github.com/acme/notes/issues/${number}`,
    state: "open",
    created_at: "2026-08-20T09:00:00.000Z",
    updated_at: "2026-08-25T09:00:00.000Z",
    comments: 1,
    user: {
      id: 41,
      login: "reader-author",
      avatar_url: "https://avatars.githubusercontent.com/u/41?v=4",
      html_url: "https://github.com/reader-author",
    },
    labels: [{ id: 1, name: "notes", color: "d3aa36", description: null }],
    reactions: { heart: 2, total_count: 2 },
    ...(pullRequest ? { pull_request: { url: "https://api.github.com/pulls/8" } } : {}),
  };
}

function publicComment(): Record<string, unknown> {
  return {
    id: 701,
    body: "A reply.",
    body_text: "A reply.",
    body_html: '<p dir="auto">A <em>reply</em>.</p><img src="javascript:alert(1)">',
    html_url: "https://github.com/acme/notes/issues/7#issuecomment-701",
    created_at: "2026-08-21T09:00:00.000Z",
    updated_at: "2026-08-21T09:00:00.000Z",
    user: {
      id: 42,
      login: "commenter",
      avatar_url: "https://avatars.githubusercontent.com/u/42?v=4",
      html_url: "https://github.com/commenter",
    },
    reactions: { "+1": 1, total_count: 1 },
  };
}

async function seedStaleReaderIssue(repository: string, ageMs = 0): Promise<void> {
  const key = encodeURIComponent(`issue:acme/${repository}:7`);
  const request = new Request(new URL(`/__cache/github-reader/v1/stale/${key}`, env.PUBLIC_ORIGIN));
  await caches.default.put(
    request,
    Response.json(
      {
        version: 1,
        storedAt: new Date(Date.now() - ageMs).toISOString(),
        etag: '"issue-etag"',
        value: {
          number: 7,
          title: "A cached public issue",
          slug: "a-cached-public-issue",
          excerpt: "Cached public body.",
          state: "open",
          createdAt: "2026-08-20T09:00:00.000Z",
          updatedAt: "2026-08-25T09:00:00.000Z",
          author: {
            login: "reader-author",
            avatarUrl: "https://avatars.githubusercontent.com/u/41?v=4",
            githubUrl: "https://github.com/reader-author",
          },
          labels: [],
          commentCount: 0,
          githubUrl: `https://github.com/acme/${repository}/issues/7`,
          bodyHtml: "<p>Cached public body.</p>",
          bodyText: "Cached public body.",
          reactions: {},
          hasMermaid: false,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    ),
  );
}

async function signedWebhook(payload: unknown, delivery: string): Promise<Request> {
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("test-webhook-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request("http://localhost:8787/webhooks/github", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-delivery": delivery,
      "x-github-event": "issues",
      "x-hub-signature-256": `sha256=${hex}`,
    },
    body,
  });
}

async function seedArticle(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO authors (github_id, login, avatar_url, github_url, created_at, updated_at)
       VALUES (1, 'octocat', 'https://avatars.githubusercontent.com/u/583231?v=4',
       'https://github.com/octocat', '2026-08-20T09:00:00.000Z', '2026-08-25T09:00:00.000Z')`,
    ),
    env.DB.prepare(
      `INSERT INTO articles
       (issue_id, issue_number, repository_id, author_id, title, slug, body_markdown,
        body_html, body_text, excerpt, github_url, github_created_at, github_updated_at,
        state, visibility, reactions_json, published_at, last_public_at, public_revision)
       VALUES (101, 42, 1345783913, 1, 'A tested public page', 'a-tested-public-page',
       'Hello **world**.', '<p>Hello <strong>world</strong>.</p>', 'Hello world.',
       'Hello world.', 'https://github.com/sarthakagrawal927/issue-pages/issues/42',
       '2026-08-21T10:00:00.000Z', '2026-08-25T10:00:00.000Z', 'open', 'published',
       '{"heart":2}', '2026-08-21T10:00:00.000Z', '2026-08-25T10:00:00.000Z', 1)`,
    ),
    env.DB.prepare(
      `INSERT INTO article_search (article_id, title, body, author, labels, comments)
       VALUES ('101', 'A tested public page', 'Hello world.', 'octocat', 'testing', '')`,
    ),
  ]);
}

beforeAll(() => {
  vi.stubGlobal("fetch", async (input: Request | string | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.hostname === "api.openai.com") {
      return Response.json({
        model: "omni-moderation-latest",
        results: [{ flagged: false, categories: {} }],
      });
    }
    if (url.hostname === "api.github.com") {
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      if (
        method === "POST" &&
        String(init?.body).includes("render-failure-probe") &&
        !renderProbeAvailable
      ) {
        return new Response("Unavailable", { status: 503 });
      }
      if (method === "POST") {
        return new Response(
          '<p dir="auto">Published through <strong>GitHub</strong>.</p><script>alert(1)</script>',
          { headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : {}));
      readerRequests.push({
        url: url.toString(),
        headers,
        redirect: init?.redirect,
        cf: init?.cf,
      });
      if (
        url.pathname.includes("/not-modified/") &&
        headers.get("if-none-match") === '"issue-etag"'
      ) {
        return new Response(null, { status: 304 });
      }
      if (url.pathname.includes("/missing/") || url.pathname.includes("/private-repo/")) {
        return Response.json({ message: "Not Found" }, { status: 404 });
      }
      if (url.pathname.includes("/rate-limited/")) {
        return Response.json(
          { message: "API rate limit exceeded" },
          { status: 403, headers: { "x-ratelimit-remaining": "0" } },
        );
      }
      if (url.pathname.includes("/stale-repo/")) {
        return Response.json(
          { message: "API rate limit exceeded" },
          { status: 403, headers: { "x-ratelimit-remaining": "0" } },
        );
      }
      if (url.pathname.endsWith("/issues/7/comments")) {
        if (url.pathname.includes("/comments-down/")) {
          return Response.json({ message: "Unavailable" }, { status: 503 });
        }
        return Response.json([publicComment()], {
          headers: {
            etag: '"comments-v1"',
            link: '<https://api.github.com/next>; rel="next"',
          },
        });
      }
      if (url.pathname.endsWith("/comments")) {
        return Response.json([publicComment()], {
          headers: {
            etag: '"comments-v1"',
            link: '<https://api.github.com/next>; rel="next"',
          },
        });
      }
      if (/\/issues\/\d+$/.test(url.pathname)) {
        const number = Number(url.pathname.split("/").at(-1));
        const issue = publicIssue(number, number === 8);
        if (url.pathname.includes("/no-comments/")) issue.comments = 0;
        return Response.json(issue, {
          headers: { etag: '"issue-v1"' },
        });
      }
      if (url.pathname.endsWith("/issues")) {
        const onlyPulls = url.pathname.includes("/all-prs/");
        return Response.json(
          onlyPulls ? [publicIssue(8, true)] : [publicIssue(), publicIssue(8, true)],
          {
            headers: {
              etag: '"list-v1"',
              link: '<https://api.github.com/next>; rel="next"',
            },
          },
        );
      }
      return Response.json({ message: "Not Found" }, { status: 404 });
    }
    throw new Error(`unexpected_outbound_request:${url.hostname}`);
  });
});

afterAll(() => vi.unstubAllGlobals());

beforeAll(seedArticle);

describe("public Worker routes", () => {
  it("renders homepage data from D1", async () => {
    const response = await exports.default.fetch(new Request("http://localhost:8787/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    const body = await response.text();
    expect(body).toContain("A tested public page");
    expect(body).toContain("This website is a GitHub repository");
    expect(body).toContain("Owner-only pilot");
    expect(body).toContain("Everyone else is held for review");
    expect(body).toContain('href="/embed"');
  });

  it("redirects the permanent issue URL and renders the canonical article", async () => {
    const short = await exports.default.fetch(
      new Request("http://localhost:8787/articles/42", { redirect: "manual" }),
    );
    expect(short.status).toBe(308);
    expect(short.headers.get("location")).toBe("/articles/42/a-tested-public-page");

    const response = await exports.default.fetch(
      new Request("http://localhost:8787/articles/42/a-tested-public-page"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"article-42-1"');
    const body = await response.text();
    expect(body).toContain("Hello <strong>world</strong>");
    expect(body).toContain('data-article-version="1"');
  });

  it("searches the D1 FTS index", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/search?q=tested"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("A tested public page");
  });

  it("redirects a validated repository input into the noindex reader namespace", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/read?repo=https%3A%2F%2Fgithub.com%2Facme%2Fnotes", {
        redirect: "manual",
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/github/acme/notes");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("rejects malformed repository input without an outbound request", async () => {
    const before = readerRequests.length;
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/read?repo=https%3A%2F%2Fgithub.com.evil%2Facme%2Fnotes"),
    );
    expect(response.status).toBe(400);
    expect(readerRequests).toHaveLength(before);
    const body = await response.text();
    expect(body).toContain("complete https://github.com/owner/repository URL");
    expect(body).toContain('<meta name="robots" content="noindex,nofollow,noarchive">');
  });

  it("builds a copy-paste embed and a live preview without calling GitHub server-side", async () => {
    const before = readerRequests.length;
    const response = await exports.default.fetch(
      new Request(
        "http://localhost:8787/embed?repo=acme%2Fbuilder-notes&theme=inherit&density=compact&accent=%23123456&label=blog&author=octocat",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(readerRequests).toHaveLength(before);
    const body = await response.text();
    expect(body).toContain("Paste one script. Get the whole repository.");
    expect(body).toContain("data-repo=&quot;acme/builder-notes&quot;");
    expect(body).toContain('data-repo="acme/builder-notes"');
    expect(body).toContain('data-theme="inherit"');
    expect(body).toContain('data-density="compact"');
    expect(body).toContain('data-accent="#123456"');
    expect(body).toContain('data-label="blog"');
    expect(body).toContain('data-author="octocat"');
  });

  it("lists public issues, excludes pull requests, and never sends credentials", async () => {
    const beforeArticles = await env.DB.prepare("SELECT COUNT(*) AS count FROM articles").first();
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/notes"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("x-issuepages-reader-cache")).toBe("FRESH");
    const body = await response.text();
    expect(body).toContain("A public reader issue");
    expect(body).not.toContain("Pull request result");
    expect(body).toContain("Older GitHub results");
    expect(body).toContain('<meta name="robots" content="noindex,nofollow,noarchive">');
    const outbound = readerRequests.find((entry) =>
      entry.url.includes("/repos/acme/notes/issues?"),
    );
    expect(outbound?.headers.get("accept")).toBe("application/vnd.github+json");
    expect(outbound?.headers.has("authorization")).toBe(false);
    expect(outbound?.redirect).toBe("manual");
    expect(outbound?.cf).toEqual({
      cacheEverything: true,
      cacheTtlByStatus: { "200-299": 600, "300-599": 0 },
    });
    await expect(env.DB.prepare("SELECT COUNT(*) AS count FROM articles").first()).resolves.toEqual(
      beforeArticles,
    );
  });

  it("renders a frame-safe, styled, paginated repository publication", async () => {
    const response = await exports.default.fetch(
      new Request(
        "http://localhost:8787/embed/acme/embed-notes?theme=dark&density=compact&accent=%23123456&channel=test-channel",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors https: http:",
    );
    const body = await response.text();
    expect(body).toContain('data-theme="dark"');
    expect(body).toContain('data-density="compact"');
    expect(body).toContain("--embed-accent:#123456");
    expect(body).toContain('data-embed-channel="test-channel"');
    expect(body).toContain("A public reader issue");
    expect(body).not.toContain("Pull request result");
    expect(body).toContain("Page 1");
    expect(body).toContain("Older →");
    expect(body).toContain(
      "/embed/acme/embed-notes/issues/7/a-public-reader-issue?theme=dark&amp;density=compact&amp;accent=%23123456&amp;channel=test-channel",
    );
  });

  it("filters an embed by label and issue author and preserves both filters", async () => {
    const response = await exports.default.fetch(
      new Request(
        "http://localhost:8787/embed/acme/filter-notes?label=blog&author=reader-author&theme=inherit",
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data-theme="auto"');
    expect(body).toContain("Issues tagged blog and by @reader-author");
    expect(body).toContain("label=blog&amp;author=reader-author");
    const outbound = readerRequests.find((entry) =>
      entry.url.includes("/repos/acme/filter-notes/issues?"),
    );
    expect(outbound?.url).toContain("labels=blog");
    expect(outbound?.url).toContain("creator=reader-author");
  });

  it("keeps custom accents away from accessibility-critical focus contrast", async () => {
    const response = await exports.default.fetch(new Request("http://localhost:8787/embed.css"));
    expect(response.status).toBe(200);
    const css = await response.text();
    expect(css).toContain(":focus-visible { outline:3px solid #3b82f6");
    expect(css).toContain("box-shadow:0 0 0 5px var(--sheet),0 0 0 7px var(--ink)");
    expect(css).not.toContain(":focus-visible { outline:3px solid var(--embed-accent)");
  });

  it("provides previous and next cursors inside the embed", async () => {
    const cursor = encodeReaderCursor(2);
    const response = await exports.default.fetch(
      new Request(`http://localhost:8787/embed/acme/embed-page-two?cursor=${cursor}`),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("← Newer");
    expect(body).toContain("Page 2");
    expect(body).toContain("Older →");
    expect(body).toContain('href="/embed/acme/embed-page-two?theme=auto&amp;density=comfortable"');
  });

  it("preserves embed appearance and pagination when opening a full issue", async () => {
    const back = encodeReaderCursor(2);
    const query = `theme=dark&density=compact&accent=%23123456&channel=frame-7&back=${back}`;
    const short = await exports.default.fetch(
      new Request(`http://localhost:8787/embed/acme/embed-article/issues/7?${query}`, {
        redirect: "manual",
      }),
    );
    expect(short.status).toBe(308);
    expect(short.headers.get("location")).toContain(
      "/embed/acme/embed-article/issues/7/a-public-reader-issue?theme=dark&density=compact&accent=%23123456&channel=frame-7&back=",
    );

    const response = await exports.default.fetch(
      new Request(
        `http://localhost:8787/embed/acme/embed-article/issues/7/a-public-reader-issue?${query}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBeNull();
    const body = await response.text();
    expect(body).toContain("Reader <strong>body</strong>");
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).not.toContain("A <em>reply</em>");
    expect(body).toContain("data-reader-discussion");
    expect(body).toContain(
      `/embed/acme/embed-article?theme=dark&amp;density=compact&amp;accent=%23123456&amp;channel=frame-7&amp;cursor=${back}`,
    );
    expect(body).toContain('target="_blank" rel="external noopener"');

    const discussion = await exports.default.fetch(
      new Request(
        "http://localhost:8787/embed/acme/embed-article/issues/7/discussion?theme=dark&channel=frame-7",
      ),
    );
    expect(discussion.status).toBe(200);
    const discussionBody = await discussion.text();
    expect(discussionBody).toContain("A <em>reply</em>");
    expect(discussionBody).not.toContain("javascript:");
    expect(discussionBody).toContain('target="_blank" rel="external noopener"');
  });

  it("rejects malformed embed cursors before calling GitHub", async () => {
    const before = readerRequests.length;
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/embed/acme/embed-invalid?cursor=not-a-cursor"),
    );
    expect(response.status).toBe(400);
    expect(readerRequests).toHaveLength(before);
    expect(await response.text()).toContain("That page link is invalid");
  });

  it("renders a sanitized issue before loading its bounded discussion", async () => {
    const short = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/notes/issues/7", { redirect: "manual" }),
    );
    expect(short.status).toBe(308);
    expect(short.headers.get("location")).toBe("/github/acme/notes/issues/7/a-public-reader-issue");
    expect(short.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");

    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/notes/issues/7/a-public-reader-issue"),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Reader <strong>body</strong>");
    expect(body).toContain("Loading the discussion");
    expect(body).toContain('data-source="/github/acme/notes/issues/7/discussion"');
    expect(body).not.toContain("A <em>reply</em>");
    expect(body).not.toContain("javascript:");
    const issueOutbound = readerRequests.find((entry) =>
      entry.url.endsWith("/repos/acme/notes/issues/7"),
    );
    expect(
      readerRequests.some((entry) => entry.url.includes("/repos/acme/notes/issues/7/comments?")),
    ).toBe(false);

    const discussionResponse = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/notes/issues/7/discussion"),
    );
    expect(discussionResponse.status).toBe(200);
    const discussion = await discussionResponse.text();
    expect(discussion).toContain("A <em>reply</em>");
    expect(discussion).toContain("Showing the first 1 comments");
    expect(discussion).not.toContain("<script");
    expect(discussion).not.toContain("javascript:");
    const commentsOutbound = readerRequests.find((entry) =>
      entry.url.includes("/repos/acme/notes/issues/7/comments?"),
    );
    expect(issueOutbound?.headers.get("accept")).toBe("application/vnd.github.full+json");
    expect(commentsOutbound?.headers.get("accept")).toBe("application/vnd.github.full+json");
  });

  it("does not request discussion data for an issue with zero replies", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/no-comments/issues/7/a-public-reader-issue"),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("No replies yet");
    expect(body).not.toContain("data-reader-discussion");
    expect(
      readerRequests.some(
        (entry) =>
          entry.url.includes("/repos/acme/no-comments/") && entry.url.includes("/comments"),
      ),
    ).toBe(false);
  });

  it("rejects direct pull-request issue paths", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/notes/issues/8/not-an-issue"),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("keeps repository absence private and maps exhausted shared limits to retryable errors", async () => {
    const missing = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/missing"),
    );
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("missing, private, or have issues disabled");

    const limited = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/rate-limited"),
    );
    expect(limited.status).toBe(503);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect(limited.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("keeps an issue readable when only fresh comments are unavailable", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/comments-down/issues/7/a-public-reader-issue"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Loading the discussion");
    const discussion = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/comments-down/issues/7/discussion"),
    );
    expect(discussion.status).toBe(503);
  });

  it("keeps all-pull-request result pages navigable", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/all-prs"),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("contain only pull requests");
    expect(body).toContain("Older GitHub results");
  });

  it("serves the last safe issue on a transient GitHub limit", async () => {
    await seedStaleReaderIssue("stale-repo", 2 * 60 * 60 * 1_000);
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/stale-repo/issues/7/a-cached-public-issue"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-issuepages-reader-cache")).toBe("STALE");
    const body = await response.text();
    expect(body).toContain("Cached public body");
    expect(body).toContain("Showing the last safe copy");
  });

  it("revalidates a stale issue with its GitHub ETag", async () => {
    await seedStaleReaderIssue("not-modified");
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/not-modified/issues/7/a-cached-public-issue"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-issuepages-reader-cache")).toBe("REFRESHING");
    expect(
      readerRequests.some(
        (entry) =>
          entry.url.includes("/repos/acme/not-modified/issues/7") &&
          entry.headers.get("if-none-match") === '"issue-etag"',
      ),
    ).toBe(true);
    const refreshed = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/not-modified/issues/7/a-cached-public-issue"),
    );
    expect(refreshed.headers.get("x-issuepages-reader-cache")).toBe("FRESH");
  });

  it("drops a soft-stale copy after a definitive GitHub absence", async () => {
    await seedStaleReaderIssue("private-repo");
    const immediate = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/private-repo/issues/7/a-cached-public-issue"),
    );
    expect(immediate.status).toBe(200);
    expect(immediate.headers.get("x-issuepages-reader-cache")).toBe("REFRESHING");

    const afterRefresh = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/private-repo/issues/7/a-cached-public-issue"),
    );
    expect(afterRefresh.status).toBe(404);
  });

  it("does not serve a stale copy after GitHub says the issue is unavailable", async () => {
    await seedStaleReaderIssue("missing", 2 * 60 * 60 * 1_000);
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/github/acme/missing/issues/7/a-cached-public-issue"),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("Cached public body");
  });

  it("keeps maintainer issue #1 unpublished", async () => {
    const response = await exports.default.fetch(new Request("http://localhost:8787/articles/1"));
    expect(response.status).toBe(404);
  });

  it("publishes safe content using normalized GitHub-rendered HTML", async () => {
    const payload = {
      action: "opened",
      repository: { id: 1345783913, full_name: "sarthakagrawal927/issue-pages" },
      issue: {
        id: 1_000,
        number: 100,
        title: "A rich public page",
        body: "A public page with **formatting**.",
        html_url: "https://github.com/sarthakagrawal927/issue-pages/issues/100",
        state: "open",
        created_at: "2026-08-25T11:00:00.000Z",
        updated_at: "2026-08-25T11:00:00.000Z",
        user: {
          id: 10,
          login: "sarthakagrawal927",
          avatar_url: "https://avatars.githubusercontent.com/u/10?v=4",
          html_url: "https://github.com/sarthakagrawal927",
        },
        labels: [],
      },
    };
    const response = await exports.default.fetch(await signedWebhook(payload, crypto.randomUUID()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    const article = await env.DB.prepare(
      "SELECT body_html, visibility FROM articles WHERE issue_id = 1000",
    ).first<{ body_html: string; visibility: string }>();
    expect(article?.visibility).toBe("published");
    expect(article?.body_html).toContain("Published through <strong>GitHub</strong>");
    expect(article?.body_html).not.toContain("<script");
  });

  it("holds non-owner content during the owner-only pilot", async () => {
    const payload = {
      action: "opened",
      repository: { id: 1345783913, full_name: "sarthakagrawal927/issue-pages" },
      issue: {
        id: 1_002,
        number: 102,
        title: "A stranger pilot page",
        body: "This otherwise safe submission must wait for public moderation.",
        html_url: "https://github.com/sarthakagrawal927/issue-pages/issues/102",
        state: "open",
        created_at: "2026-08-25T11:10:00.000Z",
        updated_at: "2026-08-25T11:10:00.000Z",
        user: {
          id: 12,
          login: "another-publisher",
          avatar_url: "https://avatars.githubusercontent.com/u/12?v=4",
          html_url: "https://github.com/another-publisher",
        },
        labels: [],
      },
    };
    const response = await exports.default.fetch(await signedWebhook(payload, crypto.randomUUID()));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ ok: true, pending: true });
    await expect(
      env.DB.prepare(
        "SELECT reviewer_note, status FROM pending_revisions WHERE entity_id = 1002",
      ).first(),
    ).resolves.toMatchObject({ reviewer_note: "owner_only_pilot", status: "pending" });
    await expect(
      env.DB.prepare("SELECT COUNT(*) AS count FROM articles WHERE issue_id = 1002").first(),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("holds a render failure and publishes it after a successful retry", async () => {
    const payload = {
      action: "opened",
      repository: { id: 1345783913, full_name: "sarthakagrawal927/issue-pages" },
      issue: {
        id: 1_001,
        number: 101,
        title: "A temporarily held page",
        body: "render-failure-probe with enough public text",
        html_url: "https://github.com/sarthakagrawal927/issue-pages/issues/101",
        state: "open",
        created_at: "2026-08-25T11:30:00.000Z",
        updated_at: "2026-08-25T11:30:00.000Z",
        user: {
          id: 10,
          login: "sarthakagrawal927",
          avatar_url: "https://avatars.githubusercontent.com/u/10?v=4",
          html_url: "https://github.com/sarthakagrawal927",
        },
        labels: [],
      },
    };
    const response = await exports.default.fetch(await signedWebhook(payload, crypto.randomUUID()));
    expect(response.status).toBe(202);
    const queued = await env.DB.prepare(
      "SELECT id, reviewer_note, status FROM pending_revisions WHERE entity_id = 1001",
    ).first<{ id: number; reviewer_note: string; status: string }>();
    expect(queued).toMatchObject({
      reviewer_note: "github_markdown_http_503",
      status: "pending",
    });
    await expect(
      env.DB.prepare("SELECT COUNT(*) AS count FROM articles WHERE issue_id = 1001").first(),
    ).resolves.toMatchObject({ count: 0 });

    renderProbeAvailable = true;
    const approval = await exports.default.fetch(
      new Request(`http://localhost:8787/admin/moderation/${queued?.id}/approve`, {
        method: "POST",
        headers: { Authorization: "Bearer test-admin-secret" },
      }),
    );
    expect(approval.status).toBe(200);
    await expect(
      env.DB.prepare("SELECT visibility FROM articles WHERE issue_id = 1001").first(),
    ).resolves.toMatchObject({ visibility: "published" });
  });

  it("holds an unsafe issue revision until an admin approves it", async () => {
    const payload = {
      action: "opened",
      repository: { id: 1345783913, full_name: "sarthakagrawal927/issue-pages" },
      issue: {
        id: 999,
        number: 99,
        title: "Empty submission",
        body: "",
        html_url: "https://github.com/sarthakagrawal927/issue-pages/issues/99",
        state: "open",
        created_at: "2026-08-25T10:00:00.000Z",
        updated_at: "2026-08-25T10:00:00.000Z",
        user: {
          id: 9,
          login: "publisher",
          avatar_url: "https://avatars.githubusercontent.com/u/9?v=4",
          html_url: "https://github.com/publisher",
        },
        labels: [],
      },
    };
    const response = await exports.default.fetch(await signedWebhook(payload, crypto.randomUUID()));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ ok: true, pending: true });
    const queued = await env.DB.prepare(
      "SELECT id, spam_reason, status FROM pending_revisions WHERE entity_id = 999",
    ).first<{ id: number; spam_reason: string; status: string }>();
    expect(queued).toMatchObject({ spam_reason: "missing_body", status: "pending" });
    expect(
      await env.DB.prepare("SELECT COUNT(*) AS count FROM articles WHERE issue_id = 999").first(),
    ).toMatchObject({ count: 0 });

    const approval = await exports.default.fetch(
      new Request(`http://localhost:8787/admin/moderation/${queued?.id}/approve`, {
        method: "POST",
        headers: { Authorization: "Bearer test-admin-secret" },
      }),
    );
    expect(approval.status).toBe(200);
    await expect(
      env.DB.prepare("SELECT status FROM pending_revisions WHERE entity_id = 999").first(),
    ).resolves.toMatchObject({ status: "approved" });
    await expect(
      env.DB.prepare("SELECT visibility FROM articles WHERE issue_id = 999").first(),
    ).resolves.toMatchObject({ visibility: "published" });
  });

  it("rejects a webhook before parsing when its signature is wrong", async () => {
    const response = await exports.default.fetch(
      new Request("http://localhost:8787/webhooks/github", {
        method: "POST",
        headers: {
          "x-github-delivery": crypto.randomUUID(),
          "x-github-event": "issues",
          "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
        },
        body: "not-json",
      }),
    );
    expect(response.status).toBe(401);
  });
});
