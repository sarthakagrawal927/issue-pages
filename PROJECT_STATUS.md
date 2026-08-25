# IssuePages — PROJECT STATUS

Last updated: 2026-08-25

## Why / What

IssuePages turns a public GitHub repository into a lightweight publishing
community: open an issue and, after safety checks, it becomes a public page.

**Users:** People who can write a GitHub issue and readers who want to discover
small, personal pages without another account or publishing tool.

**IN scope:** One public repository; issues as pages; edits, labels, comments,
reaction summaries, and archive state synchronized into D1; discovery; lexical
search; moderation; cursor pagination; cached server-rendered pages.

**OUT of scope:** Custom accounts or editor, private posts, direct on-site
comments, personalized feeds, semantic search, newsletters, payments, custom
domains, and multiple publishing repositories.

## Dependencies

### External

- GitHub repository issues and webhooks
- Cloudflare Workers, D1, Cache, and static assets
- OpenAI Moderation API

### Internal

- Fleet design and deployment verification workflows

## Timeline

- 2026-08-25 — public repository created and MVP specification started
- 2026-08-25 — owner delegated final visual approval; design review passed
- 2026-08-25 — GitHub-aware rich Markdown parity implemented locally
- 2026-08-25 — rich renderer browser acceptance passed at 390, 768, and 1440px
- 2026-08-25 — owner-only moderation pilot approved pending production setup
- 2026-08-25 — production D1 migrated and owner-only Worker deployed to workers.dev
- 2026-08-25 — signed production webhook and live issue/edit/close/reopen/search/cache acceptance passed
- 2026-08-25 — production Chromium acceptance passed at 390px and 1440px

## Products

- Public responsive website
- GitHub webhook ingestion endpoint
- D1-backed read/search API

## Features (deployed owner-only pilot)

- Signed, repository-scoped, idempotent GitHub webhook ingestion
- Repository-aware GitHub Markdown rendering during verified webhook/review
  processing, followed by local HAST sanitization and URL normalization
- Alerts, footnotes, tasks, emoji, contextual references, highlighted code,
  selected GitHub HTML, MathML, lazy Mermaid, and explicit map/3D fallbacks
- Retryable render holds that preserve the last known-good public revision
- Fail-closed spam and OpenAI moderation pipeline with private review API
- Explicit owner-only pilot mode that holds every non-owner submission pending
- D1 public projection for issues, authors, labels, comments, and reactions
- D1 FTS5 search and cursor pagination
- Newest, updated, random, author, label, search, and archived page views
- Revision-aware Cloudflare Cache keys and visible-tab article polling
- Responsive Issue Dispatch interface and local sample fixtures
- Worker integration tests, local migration verification, and dry-run bundle

## Todo / Planned / Deferred / Blocked

1. Add a fine-grained `GITHUB_RENDER_TOKEN` with read-only Contents permission,
   then retry the two owner comments held after GitHub's Markdown endpoint
   returned HTTP 403 from production.
2. Add `ADMIN_REVIEW_SECRET` before using the private moderation-review API.
3. Reconcile standalone reaction changes on a token-backed schedule. GitHub's
   repository webhook catalog has no standalone reaction event; current totals
   refresh when a later issue or comment payload carries GitHub's summary.
4. Switch `MODERATION_MODE` to `openai` and add `OPENAI_API_KEY` before opening
   automatic publishing to other GitHub users.
