import { visibleMarkdown } from "./markdown";

export type ContentKind = "issue" | "comment";

export function detectSpam(title: string, body: string, kind: ContentKind): string | null {
  const normalizedTitle = title.trim();
  const normalizedBody = visibleMarkdown(body).trim();
  const maximumBody = kind === "issue" ? 100_000 : 64_000;

  if (kind === "issue" && normalizedTitle.length === 0) return "missing_title";
  if (normalizedTitle.length > 256) return "title_too_long";
  if (normalizedBody.length === 0) return "missing_body";
  if (normalizedBody.length > maximumBody) return "body_too_long";
  if (/(.)\1{19,}/u.test(normalizedBody)) return "repeated_characters";

  const links = normalizedBody.match(/https?:\/\/[^\s)\]]+/gi) ?? [];
  if (links.length > 20) return "too_many_links";
  const nonWhitespaceLength = normalizedBody.replace(/\s/g, "").length || 1;
  const linkedLength = links.reduce((total, link) => total + link.length, 0);
  if (links.length >= 4 && linkedLength / nonWhitespaceLength > 0.55) return "link_heavy";

  const lines = normalizedBody
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length >= 24);
  const counts = new Map<string, number>();
  for (const line of lines) {
    const count = (counts.get(line) ?? 0) + 1;
    if (count >= 6) return "repeated_lines";
    counts.set(line, count);
  }
  return null;
}
