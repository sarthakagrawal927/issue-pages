---
name: IssuePages
description: A public collection whose pages stay visibly joined to their GitHub issues.
---

# Design System: IssuePages

## Creative North Star

**Common Thread** treats the repository as a shared field assembled by many
authors. Every issue is a distinct typographic block; the seams between blocks
carry provenance, updates, labels, and discussion. The system borrows the
topology of a hand-pieced quilt, not literal fabric decoration.

The product must remain simpler than the reference world. It uses flat color,
measured asymmetry, strong type, and one dashed seam rule. It does not simulate
cloth, needles, patches, or handcraft in controls. The memorable product moment
is seeing a numbered issue remain visibly connected to its public page.

## Composition

The homepage is a calm Common Field, not a marketing hero followed by feature
cards. The mechanism statement, publishing action, newest pages, and recently
updated pages occupy unequal but connected regions in one shared composition.
Real issue titles and authors provide the variation.

Article pages open a quiet chalk reading folio inside the indigo field. The
title, issue number, author, dates, labels, source, and archive state sit on the
bound edge; Markdown and discussion receive the largest uninterrupted area.
Discovery, search, the repository reader, and the embed builder reuse the same
binding, field, folio, and seam grammar without reproducing the homepage grid.

On phones, the field becomes an ordered vertical sequence. The reading order is
mechanism, publish action, newest pages, repository reader, and updates. No
desktop patch may become a tiny tile merely to preserve the composition.

## Color

The strategy is restrained full palette: indigo owns the shared public field;
chalk owns reading and input surfaces; oxblood marks the action and active
join; faded blue distinguishes secondary regions; near-black carries ink.

- Field indigo: `#17324a`
- Deep indigo: `#102637`
- Chalk: `#f7f1e5`
- Clean paper: `#fffdf8`
- Oxblood: `#9d2f2a`
- Faded blue: `#6f8798`
- Ink: `#182028`
- Muted ink: `#59636a`
- Stitch gold: `#c89b3c`, reserved for focus and exceptional state

Secondary text on a colored field is a tint of that field's foreground, never
neutral gray. Oxblood is actionable or connective; it is not scattered accent.

## Typography

UI and metadata use the platform monospaced face because issue numbers,
repository names, dates, labels, and state are source notation. Headlines use
the same face at ordinary widths and humane sizes; they do not imitate stamped
or handwritten lettering. Long-form prose uses Charter or the closest durable
reading serif available on the platform.

The body measure stays between 65 and 74 characters. Article type is never
compressed to preserve the surrounding field. Uppercase appears only in short
source/state labels, not as a universal section eyebrow.

## Components and States

- A **block** is one meaningful region, not a generic card. Its size follows
  content priority.
- A **seam** is a 1px dashed boundary that indicates adjacency or provenance.
  It is never used around every nested element.
- A **binding** is a full-width indigo navigation or provenance band.
- A **folio** is the clean article, form, or result surface.
- The permanent issue number is the strongest compact identifier.
- Published, archived, loading, stale, empty, and held states always include
  text; color is supplementary.
- Focus uses a gold outline with enough separation from both indigo and chalk.

Controls are rectilinear with small corner softening only where the browser
control benefits. Hover changes color or underline weight; nothing lifts or
bounces. Motion is limited to the existing article/discussion update behavior.

## Avoid

- Literal fabric photos, textile grain overlays, skeuomorphic stitches, or
  decorative patch icons.
- A giant slogan with an eyebrow, three-step explainer, showcase card, and
  symmetric section stack.
- Rounded card grids, pill collections, glass, gradients, glows, or fake
  terminal chrome.
- Monospace article prose or cramped metadata columns.
- Making the embed fight its host page; the minimal embed remains host-neutral.
