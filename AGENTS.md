## Shared Fleet Standard

Also read and follow the shared Fleet standard at `../AGENTS.md`. This is an
independent public product repository; keep changes scoped here and never turn
the Fleet root into a repository.

## Project

- **Product**: IssuePages
- **Stack**: TypeScript, Cloudflare Workers, D1, server-rendered HTML
- **Package manager**: pnpm
- **Local dev**: `pnpm dev`
- **Checks**: `pnpm check`
- **Deploy**: `pnpm deploy` only when explicitly requested

## Product invariants

- GitHub is the editor, identity, discussion system, and source of truth.
- Normal site traffic reads D1 and Cloudflare Cache; it must not call GitHub.
- Webhook signatures and repository identity must be verified before mutation.
- New and changed user content is sanitized, spam-checked, and moderated before
  it becomes public. A flagged edit must not replace the last known-good public
  revision.
- Article identity is the GitHub issue number. Slugs are canonical but mutable.
- Closed issues remain addressable as archived pages.

## Visual work

For meaningful visual work, use the Fleet-local `$design-workflow` and
`$impeccable` skills. `PRODUCT.md` records product context and `DESIGN.md`
records the approved visual direction. Do not claim visual completion until
the design-review receipt passes.
