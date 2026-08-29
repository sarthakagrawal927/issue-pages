import type { RenderedContent } from "../types";
import { normalizeGitHubHtml, repositoryBaseUrl } from "./github-html";
import { renderMarkdown } from "./markdown";
import { readResponseTextWithLimit } from "./request";

const GITHUB_MARKDOWN_ENDPOINT = "https://api.github.com/markdown";
const MAX_MARKDOWN_BYTES = 400_000;
const MAX_RENDERED_HTML_BYTES = 2_000_000;

interface GitHubMarkdownOptions {
  repository: string;
  sourceUrl: string;
  token?: string;
}

function validRepository(value: string): boolean {
  return /^[a-z\d](?:[a-z\d._-]{0,99})\/[a-z\d._-]{1,100}$/i.test(value);
}

function validSourceUrl(value: string, repository: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith(`/${repository}/issues/`)
    );
  } catch {
    return false;
  }
}

export async function renderGitHubMarkdown(
  value: string,
  options: GitHubMarkdownOptions,
): Promise<RenderedContent> {
  if (!validRepository(options.repository)) throw new Error("github_markdown_invalid_repository");
  if (!validSourceUrl(options.sourceUrl, options.repository)) {
    throw new Error("github_markdown_invalid_source_url");
  }

  const fallback = renderMarkdown(value);
  const encodedLength = new TextEncoder().encode(fallback.markdown).byteLength;
  if (encodedLength > MAX_MARKDOWN_BYTES) throw new Error("github_markdown_input_too_large");
  if (fallback.markdown.length === 0) return fallback;

  const headers = new Headers({
    Accept: "text/html",
    "Content-Type": "application/json",
    "User-Agent": "IssuePages-Worker",
    "X-GitHub-Api-Version": "2026-03-10",
  });
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(GITHUB_MARKDOWN_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: fallback.markdown,
      mode: "gfm",
      context: options.repository,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`github_markdown_http_${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    throw new Error("github_markdown_invalid_content_type");
  }
  const rawHtml = await readResponseTextWithLimit(response, MAX_RENDERED_HTML_BYTES);
  const normalized = normalizeGitHubHtml(rawHtml, {
    sourceUrl: options.sourceUrl,
    baseUrl: repositoryBaseUrl(options.repository),
  });
  return { ...fallback, html: normalized.html };
}
