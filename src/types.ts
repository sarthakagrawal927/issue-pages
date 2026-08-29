export type AppBindings = Omit<Env, "DB" | "SEARCH_RATE_LIMIT" | "VERSION_RATE_LIMIT"> & {
  DB: D1Database;
  SEARCH_RATE_LIMIT: RateLimit;
  VERSION_RATE_LIMIT: RateLimit;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_RENDER_TOKEN?: string;
  MODERATION_MODE?: ModerationMode;
  OPENAI_API_KEY?: string;
  ADMIN_REVIEW_SECRET: string;
};

export type ModerationMode = "openai" | "owner-only";

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubReactionSummary {
  "+1"?: number;
  "-1"?: number;
  laugh?: number;
  hooray?: number;
  confused?: number;
  heart?: number;
  rocket?: number;
  eyes?: number;
  total_count?: number;
  url?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  reactions?: GitHubReactionSummary;
}

export interface GitHubComment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser;
  reactions?: GitHubReactionSummary;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
}

export interface IssueWebhookPayload {
  action: string;
  issue: GitHubIssue;
  repository: GitHubRepository;
}

export interface CommentWebhookPayload {
  action: string;
  issue: GitHubIssue;
  comment: GitHubComment;
  repository: GitHubRepository;
}

export interface RenderedContent {
  markdown: string;
  html: string;
  text: string;
  excerpt: string;
}

export interface ModerationDecision {
  flagged: boolean;
  categories: Record<string, boolean>;
  model: string;
}

export interface SafetyDecision {
  publishable: boolean;
  rendered: RenderedContent;
  spamReason: string | null;
  moderation: ModerationDecision | null;
  failure: string | null;
}

export interface ArticleListRow {
  issue_id: number;
  issue_number: number;
  title: string;
  slug: string;
  excerpt: string;
  state: "open" | "closed";
  published_at: string;
  last_public_at: string;
  public_revision: number;
  reactions_json: string;
  author_login: string;
  author_avatar_url: string;
  labels: string | null;
  comment_count: number;
}

export interface ArticleRow extends ArticleListRow {
  author_id: number;
  author_github_url: string;
  body_markdown: string;
  body_html: string;
  body_text: string;
  github_url: string;
  github_created_at: string;
  github_updated_at: string;
  visibility: "published" | "internal" | "deleted";
}

export interface CommentRow {
  github_id: number;
  body_html: string;
  body_text: string;
  github_url: string;
  github_created_at: string;
  github_updated_at: string;
  reactions_json: string;
  author_login: string;
  author_avatar_url: string;
  author_github_url: string;
}
