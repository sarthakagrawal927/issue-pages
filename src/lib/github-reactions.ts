import type { GitHubReactionSummary } from "../types";

/**
 * Authenticated reaction-summary client for the publishing repository.
 *
 * This module is deliberately separate from `github-reader.ts`. The universal
 * reader is unauthenticated by product invariant and must never reuse
 * repository credentials, so the repository-scoped client that does carry
 * `GITHUB_RENDER_TOKEN` lives here and is only reachable from the scheduled
 * reconciliation path.
 */

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const GITHUB_JSON_MEDIA = "application/vnd.github+json";
const USER_AGENT = "IssuePages-reaction-sync";
const MAX_RESPONSE_BYTES = 1_000_000;

export interface ReactionSyncLimits {
  maxArticles: number;
  maxItems: number;
  maxRequests: number;
  durationBudgetMs: number;
  timeoutMs: number;
}

/** Hard upper bounds for a single reconciliation run. Overrides may only lower these. */
export const REACTION_SYNC_LIMITS: Readonly<ReactionSyncLimits> = Object.freeze({
  /** Published articles inspected per run. */
  maxArticles: 10,
  /** Issue plus comment targets inspected per run. */
  maxItems: 40,
  /** Outbound GitHub requests per run. */
  maxRequests: 45,
  /** Wall-clock budget for a run. */
  durationBudgetMs: 20_000,
  /** Per-request upstream timeout. */
  timeoutMs: 4_000,
});

export function resolveReactionSyncLimits(
  overrides?: Partial<ReactionSyncLimits>,
): Readonly<ReactionSyncLimits> {
  const clamp = (key: keyof ReactionSyncLimits): number => {
    const requested = overrides?.[key];
    if (typeof requested !== "number" || !Number.isFinite(requested)) {
      return REACTION_SYNC_LIMITS[key];
    }
    return Math.max(1, Math.min(Math.floor(requested), REACTION_SYNC_LIMITS[key]));
  };
  return Object.freeze({
    maxArticles: clamp("maxArticles"),
    maxItems: clamp("maxItems"),
    maxRequests: clamp("maxRequests"),
    durationBudgetMs: clamp("durationBudgetMs"),
    timeoutMs: clamp("timeoutMs"),
  });
}

export type ReactionFailureCode =
  | "unauthorized"
  | "rate_limited"
  | "not_found"
  | "unavailable"
  | "budget_exhausted";

export class GitHubReactionError extends Error {
  constructor(
    public readonly code: ReactionFailureCode,
    public readonly status: number,
  ) {
    super(code);
    this.name = "GitHubReactionError";
  }
}

export interface ReactionSummaryResult {
  /** True when GitHub answered 304 for the supplied ETag. */
  notModified: boolean;
  etag: string | null;
  /** Null when `notModified` is true. */
  summary: GitHubReactionSummary | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REACTION_KEYS = [
  "+1",
  "-1",
  "laugh",
  "hooray",
  "confused",
  "heart",
  "rocket",
  "eyes",
] as const;

/** Mirrors the reader's `reactionsFrom` guard: only positive safe integers survive. */
export function reactionSummaryFrom(value: unknown): GitHubReactionSummary {
  if (!isRecord(value)) return {};
  const summary: GitHubReactionSummary = {};
  for (const key of REACTION_KEYS) {
    const count = value[key];
    if (typeof count === "number" && Number.isSafeInteger(count) && count > 0) {
      summary[key] = count;
    }
  }
  return summary;
}

function mapGitHubFailure(response: Response): GitHubReactionError {
  if (response.status === 401) return new GitHubReactionError("unauthorized", 401);
  if (response.status === 429) return new GitHubReactionError("rate_limited", 429);
  if (response.status === 403) {
    if (
      response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.has("retry-after")
    ) {
      return new GitHubReactionError("rate_limited", 403);
    }
    return new GitHubReactionError("unauthorized", 403);
  }
  if (response.status === 404 || response.status === 410) {
    return new GitHubReactionError("not_found", response.status);
  }
  return new GitHubReactionError("unavailable", response.status);
}

async function readJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    throw new GitHubReactionError("unavailable", 502);
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new GitHubReactionError("unavailable", 502);
    }
    output += decoder.decode(chunk.value, { stream: true });
  }
  output += decoder.decode();
  try {
    return JSON.parse(output) as unknown;
  } catch {
    throw new GitHubReactionError("unavailable", 502);
  }
}

function repositoryPart(value: string): string {
  if (!/^[a-z\d][a-z\d._-]*$/i.test(value) || value.length > 100) {
    throw new GitHubReactionError("not_found", 400);
  }
  return value;
}

function positiveInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new GitHubReactionError("not_found", 400);
  }
  return value;
}

export interface ReactionClientOptions {
  token: string;
  owner: string;
  repo: string;
  limits?: Readonly<ReactionSyncLimits>;
  /** Injectable clock, used by the duration budget. */
  now?: () => number;
}

export class GitHubReactionClient {
  readonly #token: string;
  readonly #owner: string;
  readonly #repo: string;
  readonly #limits: Readonly<ReactionSyncLimits>;
  readonly #now: () => number;
  readonly #deadline: number;
  #requests = 0;

  constructor(options: ReactionClientOptions) {
    if (!options.token) throw new GitHubReactionError("unauthorized", 401);
    this.#token = options.token;
    this.#owner = repositoryPart(options.owner);
    this.#repo = repositoryPart(options.repo);
    this.#limits = options.limits ?? REACTION_SYNC_LIMITS;
    this.#now = options.now ?? Date.now;
    this.#deadline = this.#now() + this.#limits.durationBudgetMs;
  }

  get requestCount(): number {
    return this.#requests;
  }

  /** True once the request or duration budget for this run is spent. */
  get exhausted(): boolean {
    return this.#requests >= this.#limits.maxRequests || this.#now() >= this.#deadline;
  }

  issueReactions(issueNumber: number, etag: string | null): Promise<ReactionSummaryResult> {
    return this.#summary(
      `/repos/${this.#owner}/${this.#repo}/issues/${positiveInteger(issueNumber)}`,
      etag,
    );
  }

  commentReactions(commentId: number, etag: string | null): Promise<ReactionSummaryResult> {
    return this.#summary(
      `/repos/${this.#owner}/${this.#repo}/issues/comments/${positiveInteger(commentId)}`,
      etag,
    );
  }

  async #summary(path: string, etag: string | null): Promise<ReactionSummaryResult> {
    if (this.exhausted) throw new GitHubReactionError("budget_exhausted", 429);
    this.#requests += 1;
    const headers = new Headers({
      Accept: GITHUB_JSON_MEDIA,
      Authorization: `Bearer ${this.#token}`,
      "User-Agent": USER_AGENT,
      "X-GitHub-Api-Version": API_VERSION,
    });
    if (etag) headers.set("If-None-Match", etag);
    let response: Response;
    try {
      response = await fetch(`${GITHUB_API}${path}`, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(this.#limits.timeoutMs),
      });
    } catch {
      throw new GitHubReactionError("unavailable", 504);
    }
    if (response.status === 304) {
      return { notModified: true, etag, summary: null };
    }
    if (!response.ok) throw mapGitHubFailure(response);
    const payload = await readJson(response);
    if (!isRecord(payload)) throw new GitHubReactionError("unavailable", 502);
    return {
      notModified: false,
      etag: response.headers.get("etag"),
      summary: reactionSummaryFrom(payload.reactions),
    };
  }
}
