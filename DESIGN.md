---
name: IssuePages
description: A quiet publication index whose pages remain visibly connected to GitHub issues.
---

# Design System: The Index

## Creative North Star

IssuePages should feel like a small, well-kept part of the open web. The interface
recedes so titles, authors, issue numbers, and writing carry the identity. Its one
recognizable device is the permanent issue number at the start of every row.

The product is not a SaaS landing page. It does not demonstrate the issue-to-page
mechanism with diagrams or decorative UI. It states the mechanism once, offers one
publishing action, and immediately shows real pages.

## Composition

The site uses one centered column. The homepage flows from the publishing statement
to newest pages, the universal-reader entry point, and recently updated pages. Page
lists use rules and spacing rather than cards.

Articles use a narrower reading column. Title, issue number, author, dates, labels,
state, and source precede the body; discussion follows it. Repository-reader and
embed-builder surfaces use the same column, type, rules, inputs, and buttons.

On phones the same order remains. Metadata moves below titles, controls become easy
touch targets, and no core capability is hidden.

## Color

The palette is neutral paper, ink, and one familiar web-blue link color.

- Background: `#fbfbfa`
- Surface: `#ffffff`
- Text: `#1f2328`
- Muted text: `#57606a`
- Rules: `#d0d7de`
- Link and focus: `#0969da`
- Error: `#cf222e`

Color never substitutes for a state label. There are no gradients, themed fields,
decorative textures, or multiple competing accent colors.

## Typography

The interface and article body use the platform sans-serif stack. Issue numbers and
short source notation use the platform monospace stack. The display hierarchy has
few sizes, compact letter spacing, and a maximum reading measure of 72 characters.

## Components and States

- An issue row begins with the permanent issue number, followed by title, author,
  replies, and date.
- A rule separates items; a card is reserved for contained user-generated content
  such as Markdown details or alerts.
- The primary button is dark ink. Links use the single blue accent.
- Loading, stale, empty, archived, held, and error states always include text.
- Focus uses the same blue accent with a visible offset.

## Avoid

- Decorative marks, glyph fields, seams, notches, patches, or product diagrams.
- Dark technical styling borrowed from developer tools.
- Large marketing sections, feature cards, or repeated explanations.
- Serif-versus-monospace theatre, uppercase metadata, and invented brand language.
- Shadows, gradients, glass, texture, or animation without a functional reason.
- Making the embed fight its host page; the minimal embed remains host-neutral.
