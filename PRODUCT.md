# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary publisher is anyone with a GitHub account who has something worth
leaving on the public web and does not want another editor, profile system, or
publishing workflow. Readers arrive through a shared link or discovery page
and should be able to read comfortably, understand provenance, and continue
browsing related people and labels.

## Product Purpose

IssuePages makes publishing a public page as small an action as opening a
GitHub issue. The experiment succeeds when issue creation reliably becomes a
page, edits and discussion stay synchronized, strangers can publish without
instructions, readers browse onward, moderation stays manageable, and at least
ten people other than the creator publish.

## Positioning

The website is a live, readable projection of one public GitHub repository.
GitHub remains the editor, identity, discussion system, and source of truth;
IssuePages adds moderation, a reading experience, discovery, and search rather
than duplicating those systems.

## Operating Context

Visitors browse the public website, choose **Publish something**, write a title
and Markdown body in GitHub, and submit the issue. GitHub webhooks synchronize
safe issue edits, labels, comments, reaction summaries carried by those
payloads, and closed state. Readers can
follow the original issue for the canonical conversation or use author, label,
newest, recently updated, random, and search views on the website.

## Capabilities and Constraints

- One public publishing repository only.
- GitHub issue number is the durable page identifier; title slugs may change.
- Normal site traffic must use Cloudflare D1 and Cache without calling GitHub.
- Every user-content change must pass sanitization, spam checks, and OpenAI
  moderation before it becomes public.
- During the temporary owner-only production pilot, only content authored by
  the configured repository owner may bypass OpenAI moderation; all other
  content remains held until public moderation is connected.
- Safe issue and comment Markdown is rendered with GitHub repository context at
  ingestion time, normalized locally, and served without GitHub reader calls.
- Common GitHub formatting, math, and bounded Mermaid are rendered directly;
  complex map/3D formats keep an accessible source fallback and GitHub link.
- Flagged revisions wait for review and cannot replace known-good public
  content.
- Maintainer product issues use the reserved `internal` label and never publish.
- Lists and search use cursor pagination; search is lexical D1 FTS5.
- Near-real-time article refresh uses lightweight visible-tab polling, not
  WebSockets or Durable Objects.
- GitHub repository webhooks do not emit a standalone reaction event. The MVP
  needs token-backed scheduled reconciliation before reaction-only changes can
  meet the automatic-update promise.
- No custom accounts/editor, private posts, direct website comments,
  personalized feeds, semantic search, newsletters, payments, custom domains,
  multiple publishing repositories, or complex ranking in the MVP.

## Brand Commitments

The product name is **IssuePages**. The homepage must plainly communicate:
“This website is a GitHub repository. Open an issue and leave your page on the
internet.” Product copy should be direct, inviting, and honest about GitHub and
moderation. There is no established logo, typeface, palette, or imagery.

## Evidence on Hand

The founding evidence is the mechanism itself and its inspectable GitHub
provenance. No testimonials, publisher corpus, audience metrics, customer
logos, or performance claims exist yet; future work must not fabricate them.
Representative page content used during design and testing must be labeled as
sample content where a visitor could mistake it for real publishing activity.

## Product Principles

- Make the mechanism obvious: an issue becomes a page.
- Preserve provenance: people can always see who wrote it and open the source.
- Prefer the open web over a captive publishing platform.
- Let discovery feel human and legible, not engagement-optimized.
- Hold unsafe changes without damaging already-safe public work.

## Accessibility & Inclusion

The responsive website must support keyboard navigation, visible focus,
semantic landmarks, reduced motion, strong text contrast, comfortable reading
measure, zoom/reflow, and clear non-color-only moderation/archive states.
