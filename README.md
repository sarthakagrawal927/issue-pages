# IssuePages

> Open an issue. It appears on the website.

IssuePages is a public publishing experiment where GitHub remains the editor,
identity system, discussion system, and source of truth. A Cloudflare Worker
verifies GitHub webhooks, applies safety checks, stores a public projection in
D1, and serves cached publishing pages without calling GitHub. A separate,
uncatalogued reader can fetch issues from any public repository on demand.

The deployed pilot implements issue and comment ingestion, reaction summaries, archive state,
moderation holds and review, discovery, cursor pagination, D1 FTS5 search,
revision-aware article caching, visible-tab update polling, and a read-through
view of arbitrary public repository issues.

## Embed a repository publication

Paste one script anywhere that accepts custom HTML:

```html
<script
  async
  src="https://issues.sarthakagrawal.dev/embed.js"
  data-repo="owner/repository"
  data-theme="inherit"
  data-label="blog"
  data-author="octocat"
></script>
```

The embed is a complete read-only publication, not a preview card. Readers can
page through the repository, open full issue bodies, read labels and reactions,
and load the bounded GitHub discussion without leaving the frame. Pull requests
are excluded. The frame resizes itself as readers navigate.

The supported presentation controls are deliberately bounded:

- `data-theme="auto|inherit|light|dark"`
- `data-density="comfortable|compact"`
- `data-accent="#RRGGBB"`
- `data-accent-light="#RRGGBB"` and `data-accent-dark="#RRGGBB"`
- `data-label="label name"` to include only issues carrying one GitHub label
- `data-author="github-login"` to include only issues opened by one GitHub user

`inherit` reads the host document's `data-theme="light|dark"` value, follows
later changes to it, and falls back to the operating-system preference. The
light and dark accent overrides are useful when the host theme needs different
contrast in each mode.

Set width or surrounding spacing on the host page as normal CSS. Arbitrary
in-frame CSS and remote fonts are not accepted, so content remains isolated and
updates cannot silently break a host website. Invalid repository values render
an inert error and make no GitHub request.

## Architecture

```text
GitHub issue / comment
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

The universal reader uses a separate path:

```text
owner/repository input
          ↓ strict parser
unauthenticated GitHub REST
          ↓ bounded JSON + GitHub HTML
 tiered fetch cache → sanitize
          ↓
10m fresh → 1h background refresh → last-safe cache
          ↓
noindex repository and issue pages
```

Only verified webhook and moderation-review routes mutate D1. Flagged or failed
revisions stay in `pending_revisions`; they never replace the last known-good
public content. The reserved GitHub label `internal` keeps maintainer issues off
the website.

Arbitrary repositories never enter D1, moderation, search, discovery, author
pages, label pages, or the sitemap. Reader calls always use the fixed GitHub API
origin without credentials, apply explicit payload/time limits, reject pull
requests, and serve a dated last-safe copy only for transient failures. A
definitive missing/private response purges any previously safe cached copy.

Successful GitHub subrequests use Cloudflare's tiered `fetch` cache for ten
minutes. Repository indexes request the compact JSON representation; rendered
HTML is requested only for issue bodies and comments. After the ten-minute
fresh window, a safe copy up to one hour old is returned immediately while an
ETag refresh runs through `waitUntil`; older safe copies are used only when a
synchronous refresh fails transiently. Issue bodies render before comments,
which arrive through a same-origin sanitized fragment with a bounded retry
state. Zero-comment issues skip that request entirely. The upstream timeout is
four seconds.

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
server-side MathML. Mermaid is a self-hosted, diagram-split browser module
loaded only when an article or deferred discussion contains a bounded Mermaid
block. The OpenAI and GitHub APIs are called
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

The owner-only pilot runs at `https://issues.sarthakagrawal.dev`. The
`workers.dev` hostname remains a provider fallback. The production custom
domain, D1 binding, and public origin are checked in; secret setup stays outside
source control.

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

   GitHub's renderer can accept unauthenticated requests, but the production
   pilot observed HTTP 403 responses from Cloudflare's shared egress. Add a
   fine-grained token with read-only Contents permission before accepting live
   comments or depending on reliable edit ingestion:

   ```sh
   pnpm exec wrangler secret put GITHUB_RENDER_TOKEN --env production
   ```

4. Apply migrations remotely only as part of an explicitly approved release:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --env production --remote
   ```

5. Create a GitHub repository webhook targeting
   `https://<origin>/webhooks/github`, use `application/json`, reuse the exact
   `GITHUB_WEBHOOK_SECRET`, and subscribe to Issues and Issue comments.

GitHub does not expose a standalone repository `reaction` webhook event.
Reaction totals included in later issue/comment payloads are projected, but a
reaction by itself is not near-real-time in this release. Token-backed scheduled
reconciliation is tracked separately; canonical publishing-reader traffic will
continue to avoid GitHub. Only the explicitly namespaced universal reader calls
GitHub during a page request.

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
- `/read` — choose any public GitHub repository
- `/github/:owner/:repo` — read its issues; pull requests are excluded
- `/github/:owner/:repo/issues/:issue/:slug` — read one issue and its bounded discussion
- `/embed/:owner/:repo` — frame-safe, cursor-paginated repository publication
- `/embed/:owner/:repo/issues/:issue/:slug` — full issue and deferred discussion inside the embed

Universal-reader routes are read-only and send both HTML and HTTP `noindex`,
`nofollow`, and `noarchive` directives.

See [PROJECT_STATUS.md](PROJECT_STATUS.md), [PRODUCT.md](PRODUCT.md), and
[DESIGN.md](DESIGN.md) for current scope and decisions.
