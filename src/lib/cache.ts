import type { ArticleMutation } from "../data/repository";

export function articleCacheKey(origin: string, issueNumber: number, revision: number): Request {
  const url = new URL(`/__cache/articles/${issueNumber}/${revision}`, origin);
  return new Request(url.toString(), { method: "GET" });
}

export async function invalidateArticleCache(
  origin: string,
  mutation: ArticleMutation | null,
): Promise<void> {
  if (!mutation || mutation.previousRevision <= 0) return;
  const cache = caches.default;
  await cache.delete(articleCacheKey(origin, mutation.issueNumber, mutation.previousRevision));
}
