import { env, exports } from "cloudflare:workers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let renderProbeAvailable = false;

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
      if (String(init?.body).includes("render-failure-probe") && !renderProbeAvailable) {
        return new Response("Unavailable", { status: 503 });
      }
      return new Response(
        '<p dir="auto">Published through <strong>GitHub</strong>.</p><script>alert(1)</script>',
        { headers: { "content-type": "text/html; charset=utf-8" } },
      );
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
    const body = await response.text();
    expect(body).toContain("A tested public page");
    expect(body).toContain("This website is a GitHub repository");
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
          login: "rich-publisher",
          avatar_url: "https://avatars.githubusercontent.com/u/10?v=4",
          html_url: "https://github.com/rich-publisher",
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
          id: 11,
          login: "retry-publisher",
          avatar_url: "https://avatars.githubusercontent.com/u/11?v=4",
          html_url: "https://github.com/retry-publisher",
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
