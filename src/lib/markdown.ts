import { Marked, Renderer, type Tokens } from "marked";
import type { RenderedContent } from "../types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeLink(value: string, image = false): string | null {
  const trimmed = value.trim();
  if (!image && (trimmed.startsWith("#") || trimmed.startsWith("/"))) return trimmed;
  try {
    const url = new URL(trimmed);
    if (image) return url.protocol === "https:" ? url.toString() : null;
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

class SafeRenderer extends Renderer {
  override html({ text }: Tokens.HTML | Tokens.Tag): string {
    return escapeHtml(text);
  }

  override link({ href, title, tokens }: Tokens.Link): string {
    const safeHref = safeLink(href);
    const content = this.parser.parseInline(tokens);
    if (!safeHref) return content;
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(safeHref)}"${titleAttribute} rel="nofollow noopener noreferrer ugc">${content}</a>`;
  }

  override image({ href, title, text }: Tokens.Image): string {
    const safeHref = safeLink(href, true);
    if (!safeHref) return escapeHtml(text);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(safeHref)}" alt="${escapeHtml(text)}"${titleAttribute} loading="lazy" referrerpolicy="no-referrer">`;
  }

  override heading({ tokens, depth }: Tokens.Heading): string {
    const pageDepth = depth === 1 ? 2 : depth;
    return `<h${pageDepth}>${this.parser.parseInline(tokens)}</h${pageDepth}>\n`;
  }
}

const markdown = new Marked();
markdown.options({
  gfm: true,
  breaks: false,
  async: false,
  renderer: new SafeRenderer(),
});

function decodeTextEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function visibleMarkdown(value: string): string {
  return value.replace(/<!--[\s\S]*?-->/g, "");
}

export function renderMarkdown(value: string): RenderedContent {
  const source = value.trim();
  const html = markdown.parse(visibleMarkdown(source)) as string;
  const text = decodeTextEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
  return { markdown: source, html, text, excerpt };
}
