# IssuePages

> Open an issue. It appears on the website.

IssuePages is a public publishing experiment where GitHub remains the editor,
identity system, discussion system, and source of truth. A Cloudflare Worker
verifies GitHub webhooks, applies safety checks, stores a public projection in
D1, and serves cached pages without calling GitHub during normal website
traffic.

The local MVP implements issue and comment ingestion, reactions, archive state,
moderation holds and review, discovery, cursor pagination, D1 FTS5 search,
revision-aware article caching, and visible-tab update polling. It has not been
deployed or connected to a live webhook.

## Architecture

```text
GitHub issue / comment / reaction
                ↓ signed webhook
         Cloudflare Worker
                ↓
 spam → moderation → GitHub GFM render
                ↓
 sanitize → math / diagram normalization
                ↓
      D1 public projection + FTS5
                ↓
   server-rendered site + Cache API
```

Only verified webhook and moderation-review routes mutate D1. Flagged or failed
revisions stay in `pending_revisions`; they never replace the last known-good
public content. The reserved GitHub label `internal` keeps maintainer issues off
the website.

## Local development

Requirements: Node.js 22 and pnpm 10.

```sh
pnpm install
pnpm types
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

Open `http://localhost:8787`. The seed is local-only and every representative
page is visibly named `[Sample]`.

Run all checks with:

```sh
pnpm check
pnpm startup
```

`Hono` provides the small typed routing layer. `marked` provides deterministic
plain-text extraction and a safe local fallback for moderation previews. Safe
revisions are rendered with GitHub's official repository-aware Markdown API,
then parsed and allowlisted with the `hast-util` HTML utilities. KaTeX emits
server-side MathML. Mermaid is a self-hosted browser module loaded only when an
article contains a bounded Mermaid block. The OpenAI and GitHub APIs are called
with plain `fetch`, avoiding runtime SDK dependencies.

## Moderation modes

- `openai` is the default and public-launch mode. Every otherwise-safe issue or
  comment must pass the OpenAI Moderation API; a missing key or outage fails
  closed into the pending queue.
- `owner-only` is a temporary integration pilot. Only content authored by the
  configured `GITHUB_OWNER` can bypass the external moderation call. All other
  submissions are held pending and never publish automatically.

Sanitization, spam checks, signature verification, repository verification,
and the reserved `internal` label behave identically in both modes.

## GitHub formatting parity

- GitHub-rendered: GFM, issue-style line breaks, tables, task lists, alerts,
  footnotes, emoji, mentions, repository references, highlighted code,
  `details`, `picture`, images, links, and supported HTML.
- Locally enriched: inline/display math, color swatches, and bounded Mermaid
  diagrams.
- Accessible fallback: GeoJSON, TopoJSON, STL, over-limit Mermaid, and invalid
  math retain labeled source plus the original GitHub link.
- GitHub-only interaction: hovercards, notifications, editable task boxes,
  autocomplete, and issue-management controls remain on the source issue.

Every stored HTML revision passes the local allowlist after GitHub rendering.
Unsafe URLs, event handlers, scripts, styles, frames, forms, and undocumented
GitHub loader elements are not published.

## Cloudflare setup

The owner-only pilot runs at
`https://issue-pages-production.sarthakagrawal927.workers.dev`. Its production
D1 binding and public origin are checked in; the remaining secret setup stays
outside source control.

For a new environment or recovery deployment:

1. Create a production D1 database:

   ```sh
   pnpm exec wrangler d1 create issue-pages
   ```

2. Put its ID in `env.production.d1_databases[0].database_id` in
   `wrangler.jsonc`, and replace `PUBLIC_ORIGIN` with the final HTTPS origin.
3. Add the webhook and admin-review Worker secrets without storing their values
   in this repository:

   ```sh
   pnpm exec wrangler secret put GITHUB_WEBHOOK_SECRET --env production
   pnpm exec wrangler secret put ADMIN_REVIEW_SECRET --env production
   ```

   The owner-only pilot intentionally runs without `OPENAI_API_KEY`. Before
   changing `MODERATION_MODE` to `openai`, add it interactively:

   ```sh
   pnpm exec wrangler secret put OPENAI_API_KEY --env production
   ```

   GitHub's renderer supports this public repository without authentication.
   For stronger production rate-limit reliability, optionally add a
   fine-grained token with read-only Contents permission:

   ```sh
   pnpm exec wrangler secret put GITHUB_RENDER_TOKEN --env production
   ```

4. Apply migrations remotely only as part of an explicitly approved release:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --env production --remote
   ```

5. Create a GitHub repository webhook targeting
   `https://<origin>/webhooks/github`, use `application/json`, reuse the exact
   `GITHUB_WEBHOOK_SECRET`, and subscribe to Issues, Issue comments, and
   Reactions.

The checked-in deploy command SHA-tags the Worker for provenance. Do not run it
until the resource, secret, migration, and release steps are approved.

## Moderation operations

The moderation API is deliberately private and has no browser UI. Supply
`Authorization: Bearer <ADMIN_REVIEW_SECRET>` and never log or persist that
secret.

- `GET /admin/moderation` lists pending revisions.
- `POST /admin/moderation/:id/approve` publishes the sanitized held revision.
- `POST /admin/moderation/:id/reject` rejects it.
- Approval and rejection bodies may contain `{"note":"..."}`.

OpenAI, GitHub rendering, or network failures fail closed: the revision remains
unpublished and can be retried through approval without losing its raw webhook
content. GitHub remains the place to edit or delete source content.

## Public routes

- `/` — live board, newest, and recently updated pages
- `/articles/:issue/:slug` — canonical page and public discussion
- `/articles/:issue` — permanent issue-number redirect
- `/pages/newest`, `/pages/updated`, `/random`
- `/authors/:login`, `/labels/:slug`
- `/search?q=...` — lexical search across titles, bodies, authors, labels, and comments
- `/api/articles/:issue/version` — rate-limited polling response

See [PROJECT_STATUS.md](PROJECT_STATUS.md), [PRODUCT.md](PRODUCT.md), and
[DESIGN.md](DESIGN.md) for current scope and decisions.
