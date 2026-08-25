import type { GitHubLabel } from "../types";
import { slugify } from "./slug";

export async function resolveLabelSlugs(
  db: D1Database,
  labels: GitHubLabel[],
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const claimed = new Map<string, number>();
  for (const label of labels) {
    let candidate = slugify(label.name, "label");
    const localOwner = claimed.get(candidate);
    const stored = await db
      .prepare("SELECT github_id FROM labels WHERE slug = ? COLLATE NOCASE")
      .bind(candidate)
      .first<{ github_id: number }>();
    if (
      (localOwner !== undefined && localOwner !== label.id) ||
      (stored && stored.github_id !== label.id)
    ) {
      candidate = `${candidate}-${label.id}`;
    }
    claimed.set(candidate, label.id);
    result.set(label.id, candidate);
  }
  return result;
}
