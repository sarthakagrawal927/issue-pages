import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeCursor, encodeCursor } from "../src/lib/cursor";
import { embedQuery, parseEmbedOptions } from "../src/lib/embed";
import { normalizeGitHubHtml } from "../src/lib/github-html";
import { renderGitHubMarkdown } from "../src/lib/github-markdown";
import {
  decodeReaderCursor,
  encodeReaderCursor,
  GITHUB_READER_POLICY,
  parsePublicRepository,
} from "../src/lib/github-reader";
import { renderMarkdown } from "../src/lib/markdown";
import { checkContentSafety } from "../src/lib/safety";
import { verifyGitHubSignature } from "../src/lib/signature";
import { slugify } from "../src/lib/slug";
import { detectSpam } from "../src/lib/spam";
import { parityGitHubHtml, parityMarkdown } from "./fixtures/github-markdown";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("content primitives", () => {
  it("creates stable slugs and opaque cursors", () => {
    expect(slugify("  A Page: Worth Keeping!  ")).toBe("a-page-worth-keeping");
    const cursor = encodeCursor("2026-08-25T00:00:00.000Z", 42);
    expect(cursor).not.toContain("=");
    expect(decodeCursor(cursor)).toEqual({ v: 1, sort: "2026-08-25T00:00:00.000Z", id: 42 });
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });

  it("accepts only canonical public repository identifiers", () => {
    expect(parsePublicRepository("octocat/Hello-World")).toEqual({
      owner: "octocat",
      repo: "Hello-World",
    });
    expect(parsePublicRepository("https://github.com/octocat/Hello-World.git")).toEqual({
      owner: "octocat",
      repo: "Hello-World",
    });
    for (const value of [
      "http://github.com/octocat/Hello-World",
      "https://github.com.evil/octocat/Hello-World",
      "https://github.com@evil.test/octocat/Hello-World",
      "https://github.com/octocat/Hello-World/issues/1",
      "https://github.com/octocat/Hello-World?tab=issues",
      "https://github.com/octocat%2Fevil/Hello-World",
      "octocat/../Hello-World",
      "octocat\\Hello-World",
      "localhost:8787/private",
    ]) {
      expect(parsePublicRepository(value), value).toBeNull();
    }
  });

  it("uses bounded opaque cursors for GitHub result pages", () => {
    const cursor = encodeReaderCursor(2);
    expect(cursor).not.toContain("=");
    expect(decodeReaderCursor(cursor)).toBe(2);
    expect(decodeReaderCursor("not-a-cursor")).toBeNull();
    expect(decodeReaderCursor(encodeReaderCursor(501))).toBeNull();
  });

  it("keeps embed styling bounded and serializable", () => {
    const values = new Map([
      ["theme", "dark"],
      ["density", "compact"],
      ["accent", "#12ABEF"],
      ["channel", "frame_42-safe"],
      ["label", "blog"],
      ["author", "octocat"],
      ["variant", "minimal"],
    ]);
    const options = parseEmbedOptions((name) => values.get(name));
    expect(options).toEqual({
      theme: "dark",
      density: "compact",
      accent: "#12abef",
      channel: "frame_42-safe",
      label: "blog",
      author: "octocat",
      variant: "minimal",
    });
    expect(embedQuery(options, { cursor: "page-two" })).toBe(
      "theme=dark&density=compact&accent=%2312abef&channel=frame_42-safe&label=blog&author=octocat&variant=minimal&cursor=page-two",
    );
    const invalidValues = new Map([
      ["theme", "javascript:alert(1)"],
      ["density", "spacious"],
      ["accent", "javascript:alert(1)"],
      ["channel", "not a channel"],
      ["label", `bad${String.fromCodePoint(0)}label`],
      ["author", "not a github login"],
    ]);
    expect(parseEmbedOptions((name) => invalidValues.get(name))).toEqual({
      theme: "auto",
      density: "comfortable",
      accent: "#d3aa36",
      channel: "",
      label: "",
      author: "",
      variant: "folio",
    });
  });

  it("keeps public-reader latency and cache limits explicit", () => {
    expect(GITHUB_READER_POLICY).toEqual({
      freshTtlSeconds: 600,
      softStaleTtlSeconds: 3_600,
      staleTtlSeconds: 604_800,
      timeoutMs: 4_000,
      listPageSize: 12,
    });
  });

  it("renders GFM and removes unsafe HTML", () => {
    const rendered = renderMarkdown(
      '## Safe\n\n- [x] shipped\n\n<script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    );
    expect(rendered.html).toContain("<h2>Safe</h2>");
    expect(rendered.html).toContain('type="checkbox"');
    expect(rendered.html).not.toContain("<script");
    expect(rendered.html).not.toContain('href="javascript:');
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("blocks empty and link-heavy submissions", () => {
    expect(detectSpam("", "", "issue")).toBe("missing_title");
    expect(detectSpam("A title", "", "issue")).toBe("missing_body");
    const links = Array.from({ length: 14 }, (_, index) => `https://example.com/${index}`).join(
      " ",
    );
    expect(detectSpam("A title", links, "issue")).toBe("link_heavy");
    expect(detectSpam("A title", "<!-- template guidance only -->", "issue")).toBe("missing_body");
  });

  it("allows only the repository owner while the moderation pilot is active", async () => {
    const owner = await checkContentSafety(
      undefined,
      "A pilot page",
      "Enough owner-authored content for the live pilot.",
      "issue",
      {
        mode: "owner-only",
        authorLogin: "SarthakAgrawal927",
        ownerLogin: "sarthakagrawal927",
      },
    );
    expect(owner).toMatchObject({
      publishable: true,
      moderation: { model: "owner-only-pilot", flagged: false },
    });

    const stranger = await checkContentSafety(
      undefined,
      "A held page",
      "Enough non-owner content to reach the moderation gate.",
      "issue",
      {
        mode: "owner-only",
        authorLogin: "another-publisher",
        ownerLogin: "sarthakagrawal927",
      },
    );
    expect(stranger).toMatchObject({ publishable: false, failure: "owner_only_pilot" });
  });

  it("keeps normal OpenAI moderation fail-closed when the key is absent", async () => {
    const result = await checkContentSafety(
      undefined,
      "A public page",
      "Enough content to reach the external moderation gate.",
      "issue",
      {
        mode: "openai",
        authorLogin: "sarthakagrawal927",
        ownerLogin: "sarthakagrawal927",
      },
    );
    expect(result).toMatchObject({
      publishable: false,
      failure: "moderation_not_configured",
    });
  });

  it("normalizes the GitHub issue authoring surface without executable HTML", () => {
    const rendered = normalizeGitHubHtml(parityGitHubHtml, {
      sourceUrl: "https://github.com/sarthakagrawal927/issue-pages/issues/2",
    });
    expect(rendered.features).toEqual({
      mermaid: true,
      math: true,
      fallbackDiagrams: ["geojson"],
    });
    expect(rendered.html).toContain('<div class="markdown-alert markdown-alert-note"');
    expect(rendered.html).toContain('type="checkbox"');
    expect(rendered.html).toContain('class="highlight highlight-source-js"');
    expect(rendered.html).toContain("<math");
    expect(rendered.html).toContain("data-mermaid");
    expect(rendered.html).toContain("Interactive rendering stays on GitHub");
    expect(rendered.html).toContain('type="color"');
    expect(rendered.html).toContain('value="#0969DA"');
    expect(rendered.html).toContain('id="issuepages-user-content-fn-1"');
    expect(rendered.html).toContain('href="#issuepages-user-content-fn-1"');
    expect(rendered.html).toContain(
      'href="https://github.com/sarthakagrawal927/issue-pages/issues/docs/guide.md"',
    );
    expect(rendered.html).not.toContain("<h1");
    expect(rendered.html).not.toContain("math-renderer");
    expect(rendered.html).not.toContain("javascript:");
    expect(rendered.html).not.toContain("onerror");
    expect(rendered.html).not.toContain("<script");
    expect(rendered.html).not.toContain("<style");
    expect(rendered.html).not.toContain("<iframe");
  });

  it("uses GitHub's repository-aware renderer and then normalizes its HTML", async () => {
    const outbound = vi.fn(async (_input: Request | string | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as {
        context?: unknown;
        mode?: unknown;
        text?: unknown;
      };
      expect(payload).toEqual({
        context: "sarthakagrawal927/issue-pages",
        mode: "gfm",
        text: parityMarkdown.trim(),
      });
      return new Response(parityGitHubHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    vi.stubGlobal("fetch", outbound);

    const rendered = await renderGitHubMarkdown(parityMarkdown, {
      repository: "sarthakagrawal927/issue-pages",
      sourceUrl: "https://github.com/sarthakagrawal927/issue-pages/issues/2",
    });
    expect(rendered.markdown).toBe(parityMarkdown.trim());
    expect(rendered.html).toContain("data-mermaid");
    expect(rendered.html).not.toContain("<script");
    expect(outbound).toHaveBeenCalledOnce();
  });
});

describe("GitHub signature verification", () => {
  it("accepts only the matching HMAC", async () => {
    const body = new TextEncoder().encode('{"zen":"Keep it logically awesome."}');
    const secret = "test-webhook-secret";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
    const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    await expect(verifyGitHubSignature(body, `sha256=${hex}`, secret)).resolves.toBe(true);
    await expect(verifyGitHubSignature(body, `sha256=${"0".repeat(64)}`, secret)).resolves.toBe(
      false,
    );
  });
});
