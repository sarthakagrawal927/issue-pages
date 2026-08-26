---
target: simplified IssuePages homepage and article
total_score: 32
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
timestamp: 2026-08-26T08-16-22Z
slug: src-ui-templates-ts
---
Method: dual-agent (A: simple_index_visual · B: simple_index_detector)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Publication and moderation states are explicit. |
| 2 | Match System / Real World | 3 | The copy is direct, with some unavoidable GitHub vocabulary. |
| 3 | User Control and Freedom | 3 | Source, repository, retry, and onward exits are visible. |
| 4 | Consistency and Standards | 4 | Tokens, rows, controls, and metadata are consistent. |
| 5 | Error Prevention | 3 | Moderation and read-only boundaries are clear. |
| 6 | Recognition Rather Than Recall | 3 | Provenance and discovery cues remain visible. |
| 7 | Flexibility and Efficiency | 2 | The MVP intentionally has few repeat-reader accelerators. |
| 8 | Aesthetic and Minimalist Design | 4 | The interface is quiet, linear, and content-led. |
| 9 | Error Recovery | 3 | Empty, stale, search, and reader errors offer recovery. |
| 10 | Help and Documentation | 4 | The publishing and read-through modes are introduced where they matter. |
| **Total** | | **32/40** | **Design workflow floor met.** |

## Design Specificity Verdict

The Index is intentionally austere and shippable. Permanent issue numbers, visible
GitHub provenance, neutral paper, rules instead of cards, and a narrow reading
column form a coherent IssuePages system. It is restrained rather than visually
showy, which matches the owner's explicit direction.

The deterministic scan returned zero findings for `src/ui/templates.ts`. Browser
inspection found no console errors or horizontal overflow on the sampled homepage,
article, search, reader, or embed-builder surfaces. A live detector overlay could
not load because the product CSP correctly blocks scripts from a different local
origin; the CLI scan and browser geometry were used as the fallback evidence.

## Overall Impression

The product now reads as a small publication rather than a generated landing page.
Its strongest quality is restraint: the writing and source history lead, while the
interface supplies provenance without staging a decorative demonstration.

## What's Working

- The mechanism, primary action, and GitHub handoff are understood within seconds.
- Article measure, type rhythm, and discussion flow make long-form reading calm.
- Issue number, author, dates, labels, state, reactions, and source remain visible.

## Priority Issues

- **P2 — Product specificity is deliberately quiet.** The issue number is the only
  strong signature. Preserve and strengthen it through real content rather than
  adding another decorative identity layer.
- **P2 — Secondary inline links can remain smaller than primary controls.** Primary
  navigation and actions meet the 44px floor; monitor dense metadata links during
  real-device dogfooding.
- **P3 — Desktop article openings are ceremonious.** The title and provenance occupy
  substantial space, but the reading body still enters the first viewport.

No P0 or P1 findings remain.

## Persona Red Flags

- **First-time publisher:** The revised copy now explains that the GitHub issue is
  immediately public and that IssuePages publication may wait for review.
- **Keyboard or motor-access user:** Primary navigation, text actions, focus rings,
  and forms are visible and reachable; test small metadata links on physical touch
  devices during dogfooding.
- **Distracted mobile reader:** The compact header and smaller article title expose
  article prose in the initial phone viewport.

## Minor Observations

- Sparse repositories intentionally omit a duplicate Recently Updated section.
- The neutral system has no visited-link treatment yet.
- The footer could distinguish the publishing experiment from the universal reader
  more explicitly in a later copy pass.

## Questions to Consider

- Does real publisher content make the issue-number signature memorable enough?
- After dogfooding, do readers need a visited-link cue or a compact history path?
- Should article title scale reduce further once long real-world titles arrive?
