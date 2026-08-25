---
target: IssuePages public homepage and article system
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
timestamp: 2026-08-25T07-56-44Z
slug: src-ui-templates-ts
---
# IssuePages public surfaces critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Public states are clear; publish completion expectations are not. |
| 2 | Match system / real world | 3 | Direct language, with some GitHub and moderation knowledge assumed. |
| 3 | User control and freedom | 3 | Clear exits, but no local breadcrumb or active location. |
| 4 | Consistency and standards | 4 | Cohesive dispatch grammar and terminology. |
| 5 | Error prevention | 3 | Guardrails exist but are not explained before handoff. |
| 6 | Recognition rather than recall | 3 | Core routes and state are visible; some static elements resemble controls. |
| 7 | Flexibility and efficiency | 2 | Search and random help, but expert acceleration is limited. |
| 8 | Aesthetic and minimalist design | 3 | Restrained and specific, with some repeated identity. |
| 9 | Error recovery | 3 | Good local error copy; publish recovery remains external. |
| 10 | Help and documentation | 2 | Good three-step orientation, thin task-level publish guidance. |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

Strongly product-authored. Permanent issue-number cells, the live status board,
repository language, timestamps, and GitHub provenance make this recognizable
as IssuePages even without the product name. The deterministic detector found
zero issues in `src/ui/templates.ts` and `src/ui/assets.ts`. Browser evidence
found no overflow, console errors, unlabeled controls, or contrast failure; the
lowest sampled contrast was 5.38:1.

## Overall Impression

The quiet Live Board direction works. Its largest opportunity is completing
the human journey around the GitHub handoff and the end of an article, not
changing the visual world or font again.

## What's Working

- The dispatch strip is a reusable product signature rather than decoration.
- Responsive tables become readable rows, with no horizontal overflow.
- Skip link, landmarks, labels, status text, focus, and reading measure form a
  strong accessibility foundation.

## Priority Issues

1. **[P1] Publish handoff lacks a trust contract.** Explain GitHub account use,
   automated review, held content, and where completion appears.
2. **[P2] Article identity repeats before reading.** Keep one page H1 and avoid
   duplicating title and status across rail and body.
3. **[P2] Articles lack an onward-reading end state.** Add author, random, and
   live-board continuation routes.
4. **[P2] Issue numbers look navigational but are inert.** Link the permanent
   number cells.
5. **[P2] Read-only reactions resemble controls.** Label and quiet them or link
   their source.

## Persona Red Flags

- **First-time publisher:** Cannot predict prerequisites, review timing, or a
  moderation hold at the handoff.
- **Distracted mobile reader:** Repeated title and provenance delay the prose.
- **Keyboard or screen-reader reader:** Duplicate H1 structure and visual versus
  semantic affordance mismatches add friction.

## Minor Observations

- The original repository note sounded unnatural.
- Header search used an arrow whose visible meaning was unclear.
- Ledger date label/value spacing compressed visually.
- Blanket reduced-motion timing removed all feedback indiscriminately.

## Questions to Consider

- Is the first viewport primarily proving that publishing works, or asking the
  visitor to publish?
- If the permanent issue number is the signature object, should any instance be
  non-interactive?
- What should a reader want to do after the final reply?
