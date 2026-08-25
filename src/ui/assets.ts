/*
THESIS — The repository is one shared field, not a SaaS hero followed by cards.
OWN-WORLD — Indigo bindings, chalk folios, oxblood joins, unequal content blocks, one dashed seam.
STORY — Understand the issue-to-page mechanism, add a page, then browse the people already joined to it.
FIRST VIEWPORT — A calm mechanism block and publish action share the field with live numbered pages; no decorative textile simulation.
FORM — Common Thread with the Common Field staging; challenger selected from seed ba458f6d.
*/
export const styles = `
:root {
  --gold: #d3aa36;
  --gold-soft: #e5cf8b;
  --ink: #171b1a;
  --slate: #2b3734;
  --paper: #f1efe7;
  --paper-bright: #fffdf4;
  --rule: #8c887a;
  --green: #2f6a48;
  --red: #a94732;
  --muted: #5f625d;
  --focus: #1267d6;
  --display: "Avenir Next", Avenir, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  --body: "Avenir Next", Avenir, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
* { box-sizing: border-box; }
html { color-scheme: light; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  line-height: 1.55;
  text-rendering: optimizeLegibility;
}
a { color: inherit; text-underline-offset: .18em; }
a:hover { text-decoration-thickness: .14em; }
:focus-visible { outline: 3px solid var(--paper-bright); outline-offset: 2px; box-shadow: 0 0 0 6px var(--ink); }
img { max-width: 100%; height: auto; }
.skip-link { position: fixed; top: .75rem; left: .75rem; transform: translateY(-180%); background: var(--paper-bright); padding: .65rem 1rem; z-index: 100; }
.skip-link:focus { transform: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.site-header { border-top: 6px solid var(--gold); border-bottom: 1px solid var(--ink); background: var(--paper-bright); }
.site-header__inner { max-width: 1480px; margin: 0 auto; min-height: 76px; padding: .75rem clamp(1rem, 3vw, 2.5rem); display: flex; align-items: center; gap: 1.25rem; }
.brand { min-height: 44px; display: inline-flex; align-items: center; font: 700 clamp(1.45rem, 3vw, 2rem)/1 var(--display); letter-spacing: -.025em; text-decoration: none; white-space: nowrap; }
.header-note { font-size: .82rem; border-left: 1px solid var(--ink); padding-left: 1rem; max-width: 16rem; }
.site-nav { margin-left: auto; display: flex; align-items: center; gap: .55rem; }
.nav-link { min-height: 44px; display: inline-flex; align-items: center; padding: .55rem .75rem; font: 700 .78rem/1 var(--display); letter-spacing: .035em; text-transform: uppercase; text-decoration: none; border: 1px solid transparent; }
.nav-link:hover { border-color: var(--ink); }
.search-mini { display: flex; border: 1px solid var(--rule); background: var(--paper); }
.search-mini input { width: clamp(8rem, 16vw, 15rem); min-height: 44px; border: 0; background: transparent; padding: .55rem .75rem; color: var(--ink); font: inherit; }
.search-mini button { border: 0; border-left: 1px solid var(--ink); background: var(--ink); color: var(--paper); min-width: 48px; cursor: pointer; font: 700 .74rem/1 var(--display); text-transform: uppercase; }
main { min-height: 70vh; }
.hero { max-width: 1480px; margin: 0 auto; padding: clamp(2rem, 4vw, 4rem) clamp(1rem, 3vw, 2.5rem) 2.5rem; display: grid; grid-template-columns: minmax(280px,.78fr) minmax(560px,1.35fr); gap: clamp(2rem, 4vw, 4.5rem); align-items: center; }
.eyebrow { margin: 0 0 .8rem; font: 800 .75rem/1.2 var(--display); letter-spacing: .11em; text-transform: uppercase; }
.hero h1 { max-width: 12ch; margin: 0; font: 700 clamp(3rem, 5.3vw, 5.25rem)/.94 var(--display); letter-spacing: -.035em; text-wrap: balance; }
.hero h1 .stop { color: var(--gold); }
.hero-copy { max-width: 34rem; font-size: clamp(1rem, 1.4vw, 1.2rem); }
.publish-trust { max-width: 31rem; margin: .75rem 0 0; color: var(--muted); font-size: .82rem; }
.pilot-notice { max-width: 34rem; margin: .9rem 0 0; border: 1px solid var(--rule); background: #faf7ec; padding: .75rem .85rem; font-size: .84rem; }
.button { min-height: 48px; display: inline-flex; align-items: center; justify-content: space-between; gap: 1.5rem; border: 1px solid var(--ink); padding: .8rem 1.05rem; background: var(--ink); color: var(--paper-bright); font: 800 .86rem/1 var(--display); letter-spacing: .035em; text-transform: uppercase; text-decoration: none; box-shadow: 3px 3px 0 var(--gold-soft); transition: transform .15s ease-out, box-shadow .15s ease-out; }
.button:hover { transform: translate(1px,1px); box-shadow: 2px 2px 0 var(--gold-soft); }
.button--light { background: var(--paper-bright); color: var(--ink); box-shadow: none; }
.steps { margin: 1.5rem 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3,1fr); border-block: 1px solid var(--rule); }
.steps li { padding: .75rem .65rem; font-size: .78rem; border-right: 1px solid var(--rule); }
.steps li:last-child { border-right: 0; }
.steps strong { display: block; font: 900 .72rem/1.1 var(--display); text-transform: uppercase; letter-spacing: .04em; }
.dispatch-board { position: relative; background: var(--slate); color: var(--paper); padding: clamp(1rem, 2vw, 1.65rem); border: 1px solid var(--ink); clip-path: polygon(.65% 0,100% 0,99.35% 100%,0 100%); box-shadow: 4px 4px 0 var(--gold-soft); }
.dispatch-board__head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; border-bottom: 1px solid #89918a; padding: 0 .5rem .65rem; }
.dispatch-board h2 { margin: 0; font: 700 clamp(1.35rem,2.2vw,2rem)/1.05 var(--display); letter-spacing: -.015em; }
.dispatch-board__legend { color: #d7d6ca; font-size: .78rem; }
.dispatch-list { margin: 0; padding: 0; list-style: none; }
.dispatch-item { display: grid; grid-template-columns: 4.2rem minmax(0,1.5fr) minmax(7rem,.7fr) 6.5rem auto; align-items: stretch; border-bottom: 1px solid #59615d; min-height: 62px; }
.dispatch-item:last-child { border-bottom: 0; }
.dispatch-item > * { display: flex; align-items: center; padding: .65rem .75rem; min-width: 0; }
.dispatch-number { background: var(--gold); color: var(--ink); font: 800 1.3rem/1 var(--display); clip-path: polygon(0 0,84% 0,100% 50%,84% 100%,0 100%); text-decoration: none; }
.dispatch-title { font-weight: 600; text-decoration: none; }
.dispatch-title:hover { background: rgba(255,255,255,.06); }
.dispatch-author, .dispatch-date { color: #d7d6ca; font-size: .8rem; }
.dispatch-status { justify-content: center; margin: .75rem .65rem; padding: .25rem .5rem; border: 1px solid #759282; background: transparent; color: #cfe0d3; font: 700 .68rem/1 var(--display); text-transform: uppercase; }
.dispatch-status--archived { border-color: #b87969; color: #f1c9bf; }
.empty-dispatch { padding: 2.5rem 1rem; text-align: center; color: #d7d6ca; }
.section { max-width: 1480px; margin: 0 auto; padding: 2.5rem clamp(1rem, 3vw, 2.5rem); }
.reader-callout { max-width: 1430px; margin: 0 auto 1rem; border-block: 1px solid var(--ink); padding: 1.5rem clamp(1rem,3vw,2.5rem); display: grid; grid-template-columns: minmax(16rem,.75fr) minmax(18rem,1fr) auto; gap: clamp(1.25rem,3vw,3rem); align-items: center; }
.reader-callout h2 { max-width: 18ch; margin: 0; font: 700 clamp(1.75rem,3vw,2.8rem)/1.02 var(--display); letter-spacing: -.025em; }
.reader-callout p { margin-block: 0; }
.reader-callout__actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.section--split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.section-head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; border-bottom: 1px solid var(--ink); margin-bottom: .35rem; }
.section-head h2 { margin: 0; font: 700 clamp(1.65rem,2.6vw,2.35rem)/1.05 var(--display); letter-spacing: -.02em; }
.text-link { min-height: 44px; display: inline-flex; align-items: center; font: 800 .75rem/1 var(--display); text-transform: uppercase; }
.page-strip { display: grid; grid-template-columns: 3.8rem minmax(0,1fr) auto; border-bottom: 1px solid var(--rule); min-height: 68px; align-items: stretch; }
.page-strip__number { display: flex; align-items: center; background: var(--ink); color: var(--paper); padding: .7rem; font: 800 1.1rem/1 var(--display); text-decoration: none; }
.page-strip__body { padding: .7rem .9rem; min-width: 0; }
.page-strip__title { display: block; font-weight: 600; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.page-strip__meta { color: var(--muted); font-size: .78rem; }
.page-strip__date { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: .15rem; padding: .7rem; color: var(--muted); font-size: .75rem; text-align: right; }
.page-shell { max-width: 1360px; margin: 0 auto; padding: 2rem clamp(1rem, 3vw, 2.5rem) 4rem; display: grid; grid-template-columns: minmax(250px,.42fr) minmax(0,1fr); gap: clamp(1.5rem,4vw,4rem); }
.page-rail { align-self: start; position: sticky; top: 1.25rem; border-top: 7px solid var(--gold); padding-top: 1rem; }
.page-rail h1 { margin: .3rem 0 1rem; font: 600 clamp(2.4rem,4vw,3.9rem)/1.02 var(--display); letter-spacing: -.03em; text-wrap: balance; }
.page-rail dl { margin: 1.5rem 0; }
.page-rail dt { margin-top: .8rem; font: 800 .68rem/1 var(--display); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.page-rail dd { margin: .2rem 0 0; }
.article-pane { background: var(--paper-bright); border: 1px solid var(--rule); padding: clamp(1.25rem,4vw,4.5rem); box-shadow: 4px 5px 12px rgba(23,27,26,.09); min-width: 0; }
.article-route { display: grid; grid-template-columns: minmax(6.5rem,max-content) minmax(0,1fr) auto; border: 1px solid var(--ink); margin-bottom: 2rem; align-items: stretch; }
.article-route__number { background: var(--gold); color: var(--ink); padding: .75rem; display: flex; align-items: center; font: 800 1.4rem/1 var(--display); clip-path: polygon(0 0,84% 0,100% 50%,84% 100%,0 100%); }
.article-route__source { display: flex; align-items: center; justify-content: center; padding: .7rem 1rem; text-transform: uppercase; font: 800 .72rem/1 var(--display); }
.article-route__status { border-left: 1px solid var(--ink); background: #dce8df; color: #214c34; padding: .7rem 1rem; display: flex; align-items: center; font: 800 .7rem/1 var(--display); text-transform: uppercase; }
.article-route__status--archived { background: #f1ded8; color: #712c20; }
.prose { max-width: 74ch; font-size: clamp(1rem,1.15vw,1.12rem); line-height: 1.72; overflow-wrap: anywhere; }
.prose h1, .prose h2, .prose h3 { font-family: var(--display); font-weight: 600; line-height: 1.1; margin: 2em 0 .6em; }
.prose h1 { font-size: 2.5rem; } .prose h2 { font-size: 2rem; } .prose h3 { font-size: 1.5rem; }
.prose pre { overflow-x: auto; background: var(--ink); color: var(--paper); padding: 1rem; }
.prose code { background: #e6e0ce; padding: .08em .28em; font-size: .92em; }
.prose pre code { background: transparent; padding: 0; }
.prose blockquote { margin-inline: 0; padding-left: 1.25rem; border-left: 1px solid var(--gold); color: #3f4440; }
.prose table { display: block; width: max-content; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
.prose th, .prose td { border: 1px solid var(--rule); padding: .55rem .7rem; }
.prose img { display: block; margin: 1.5rem auto; }
.prose .contains-task-list { padding-left: .35rem; list-style: none; }
.prose .task-list-item { display: flex; align-items: baseline; gap: .55rem; }
.prose .task-list-item input { accent-color: var(--green); }
.prose details { margin: 1.5rem 0; border: 1px solid var(--rule); background: #faf7ec; padding: .7rem 1rem; }
.prose summary { cursor: pointer; font-weight: 700; }
.markdown-alert { margin: 1.5rem 0; border-left: 1px solid var(--gold); background: #faf7ec; padding: .85rem 1rem; }
.markdown-alert-title { margin: 0 0 .35rem; font: 800 .78rem/1.2 var(--display); letter-spacing: .06em; text-transform: uppercase; }
.markdown-alert-note { border-left-color: #28699b; }
.markdown-alert-tip { border-left-color: var(--green); }
.markdown-alert-important { border-left-color: #7652a7; }
.markdown-alert-warning { border-left-color: #9a6a16; }
.markdown-alert-caution { border-left-color: var(--red); }
.footnotes { margin-top: 3rem; border-top: 1px solid var(--rule); font-size: .9em; }
.color-swatch { width: 1.2rem; height: 1.2rem; margin-left: .35rem; padding: 0; border: 1px solid var(--rule); vertical-align: -.25rem; }
.math-inline math { font-size: 1.08em; }
.math-display { margin: 1.5rem 0; max-width: 100%; overflow-x: auto; text-align: center; }
.math-source { color: var(--red); }
.rich-block { margin: 1.75rem 0; border: 1px solid var(--rule); background: #faf7ec; padding: 1rem; }
.rich-block__canvas { max-width: 100%; overflow-x: auto; }
.rich-block__canvas svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.rich-block__label { margin-top: 0; font-weight: 650; }
.rich-block .rich-block__fallback { margin: .75rem 0 0; background: var(--paper-bright); }
.rich-block--mermaid[data-rendered="true"] .rich-block__fallback { display: none; }
.rich-block--mermaid[data-error="true"] .rich-block__canvas { color: var(--red); font-weight: 650; }
.highlight { overflow-x: auto; background: var(--ink); color: #e9e5d8; padding: 1rem; }
.highlight pre { margin: 0; padding: 0; background: transparent; }
.pl-k, .pl-kos { color: #efb66d; }
.pl-s, .pl-s1 { color: #b8d59e; }
.pl-c, .pl-c1 { color: #9ec7dd; }
.pl-en, .pl-ent, .pl-v { color: #e8a6a6; }
.tags { display: flex; flex-wrap: wrap; gap: .4rem; margin: 1rem 0; }
.tag { border: 1px solid currentColor; padding: .22rem .48rem; font: 750 .7rem/1 var(--display); text-decoration: none; }
.reactions { display: flex; flex-wrap: wrap; gap: .45rem; margin: 1.5rem 0; }
.reactions__label { display: inline-flex; align-items: center; min-height: 32px; margin-right: .25rem; color: var(--muted); font-size: .76rem; }
.reaction { padding: .35rem .4rem; font-size: .8rem; color: var(--muted); }
.archive-notice { border: 1px solid #b87969; background: #f1ded8; color: #712c20; padding: .75rem 1rem; margin-bottom: 1rem; font-weight: 700; }
.discussion { margin-top: 4rem; }
.discussion h2 { font: 700 1.85rem/1.1 var(--display); border-bottom: 1px solid var(--ink); }
.discussion-content--loading { min-height: 8rem; }
.discussion-loading { min-height: 8rem; display: flex; align-items: center; gap: .8rem; border-bottom: 1px solid var(--rule); color: var(--muted); font-size: .86rem; }
.discussion-loading > span:first-child { color: var(--gold); font: 800 1.25rem/1 var(--display); animation: discussion-pulse 1.2s ease-in-out infinite alternate; }
.discussion-loading strong { color: var(--ink); }
.text-button { min-height: 44px; border: 0; padding: 0 .25rem; background: transparent; color: var(--blue); cursor: pointer; font: inherit; text-decoration: underline; text-underline-offset: .14em; }
@keyframes discussion-pulse { from { transform: translateX(0); } to { transform: translateX(.35rem); } }
.comment { display: grid; grid-template-columns: 3rem minmax(0,1fr); gap: 1rem; padding: 1.25rem 0; border-bottom: 1px solid var(--rule); }
.avatar { width: 3rem; height: 3rem; border-radius: 50%; background: #ddd; }
.comment__meta { color: var(--muted); font-size: .8rem; }
.comment .prose { font-size: 1rem; }
.onward { margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--ink); display: grid; grid-template-columns: minmax(12rem,1fr) repeat(3,auto); align-items: center; gap: 1rem 1.5rem; }
.onward h2 { margin: 0; font: 600 1.5rem/1.1 var(--display); }
.onward a { min-height: 44px; display: inline-flex; align-items: center; font-size: .82rem; }
.listing-shell { max-width: 1120px; margin: 0 auto; padding: clamp(2rem,5vw,5rem) clamp(1rem,3vw,2.5rem); }
.reader-shell { max-width: 1160px; margin: 0 auto; padding: clamp(2.5rem,6vw,6rem) clamp(1rem,3vw,2.5rem); display: grid; grid-template-columns: minmax(0,.85fr) minmax(24rem,1fr); gap: clamp(2rem,6vw,6rem); align-items: start; }
.reader-intro { border-top: 7px solid var(--gold); padding-top: 1rem; }
.reader-intro h1 { max-width: 12ch; margin: 0 0 1.25rem; font: 700 clamp(2.8rem,5.4vw,5.2rem)/.96 var(--display); letter-spacing: -.035em; text-wrap: balance; }
.reader-intro > p:last-child { max-width: 38rem; font-size: 1.08rem; }
.repo-form { background: var(--slate); color: var(--paper); border: 1px solid var(--ink); box-shadow: 4px 4px 0 var(--gold-soft); padding: clamp(1.25rem,3vw,2.25rem); }
.repo-form label { display: block; margin-bottom: .65rem; font: 800 .76rem/1.2 var(--display); letter-spacing: .07em; text-transform: uppercase; }
.repo-form__control { display: grid; grid-template-columns: minmax(0,1fr) auto; border: 2px solid var(--paper); background: var(--paper-bright); }
.repo-form input { min-width: 0; min-height: 58px; border: 0; padding: .8rem 1rem; background: var(--paper-bright); color: var(--ink); font: 600 1rem/1.2 var(--body); }
.repo-form button { border: 0; border-left: 2px solid var(--paper); padding: .75rem 1rem; background: var(--gold); color: var(--ink); cursor: pointer; font: 850 .76rem/1.15 var(--display); text-transform: uppercase; }
.repo-form > p { color: #d7d6ca; font-size: .8rem; }
.repo-form .field-error { border: 1px solid #d99786; background: #5b3028; color: #ffe6df; padding: .7rem .8rem; }
.reader-boundary { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(12rem,.35fr) 1fr; gap: 1rem; border-block: 1px solid var(--rule); padding: 1rem 0; color: var(--muted); }
.reader-boundary strong { color: var(--ink); }
.embed-builder { max-width: 1260px; margin: 0 auto; padding: clamp(2rem,5vw,5rem) clamp(1rem,3vw,2.5rem); display: grid; grid-template-columns: minmax(0,.8fr) minmax(24rem,1fr); gap: clamp(1.5rem,4vw,4rem); align-items: start; }
.embed-builder__intro { border-top: 7px solid var(--gold); padding-top: 1rem; }
.embed-builder__intro h1 { max-width: 12ch; margin: 0 0 1rem; font: 700 clamp(2.7rem,5vw,4.8rem)/.96 var(--display); letter-spacing: -.035em; text-wrap: balance; }
.embed-config { box-shadow: 4px 4px 0 var(--gold-soft); }
.embed-config > input { width: 100%; }
.embed-config__options { display: grid; grid-template-columns: 1fr 1fr auto; gap: .75rem; margin: 1rem 0; }
.embed-config__options label { margin: 0; color: #d7d6ca; }
.embed-config select, .embed-config input[type="color"] { width: 100%; min-height: 46px; margin-top: .4rem; border: 1px solid var(--paper); background: var(--paper-bright); color: var(--ink); padding: .4rem .55rem; font: inherit; }
.embed-config input[type="color"] { min-width: 4.5rem; padding: .25rem; }
.embed-config > button { min-height: 48px; border: 1px solid var(--paper); background: var(--gold); color: var(--ink); padding: .75rem 1rem; cursor: pointer; font: 850 .76rem/1.15 var(--display); text-transform: uppercase; }
.embed-code, .embed-preview { grid-column: 1 / -1; border-top: 1px solid var(--ink); padding-top: 1.25rem; }
.embed-code { display: grid; grid-template-columns: minmax(14rem,.4fr) minmax(0,1fr); gap: 1rem 2rem; }
.embed-code h2, .embed-preview h2 { margin: 0; font: 700 clamp(1.7rem,3vw,2.5rem)/1 var(--display); }
.embed-code pre { max-width: 100%; overflow-x: auto; margin: 0; background: var(--slate); color: var(--paper); padding: 1rem; }
.embed-code > p { grid-column: 2; margin: 0; color: var(--muted); font-size: .82rem; }
.embed-preview > [data-issue-pages-embed] { margin-top: 1rem; }
.reader-listing { max-width: 1240px; }
.reader-listing .listing-title { overflow-wrap: anywhere; }
.repo-slash { color: var(--gold); padding-inline: .08em; }
.reader-actions { margin: 2rem 0 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.reader-actions--error { justify-content: flex-start; }
.reader-strip { grid-template-columns: 6.5rem minmax(0,1fr) auto; min-height: 88px; }
.reader-strip .page-strip__title { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.25; }
.reader-strip__excerpt { max-width: 72ch; margin: .3rem 0 0; color: var(--muted); font-size: .86rem; line-height: 1.45; }
.reader-notice { margin: 0 0 1.25rem; border: 1px solid var(--rule); background: #faf7ec; padding: .75rem 1rem; font-size: .86rem; }
.reader-notice--stale { border-color: #b87969; background: #f1ded8; color: #712c20; }
.rail-back { min-height: 44px; display: inline-flex; align-items: center; margin-top: .8rem; font-size: .84rem; }
.onward--reader { grid-template-columns: minmax(12rem,1fr) repeat(3,minmax(8rem,auto)); }
.listing-title { margin: 0 0 .7rem; font: 700 clamp(2.7rem,5.6vw,5.25rem)/.95 var(--display); letter-spacing: -.035em; text-wrap: balance; }
.listing-intro { max-width: 48rem; color: var(--muted); }
.search-form { display: grid; grid-template-columns: 1fr auto; max-width: 54rem; margin: 2rem 0; border: 2px solid var(--ink); }
.search-form input { min-height: 58px; border: 0; background: var(--paper-bright); padding: .8rem 1rem; font: inherit; font-size: 1.1rem; }
.search-form button { border: 0; border-left: 2px solid var(--ink); background: var(--ink); color: var(--paper); padding: 0 1.3rem; font: 900 .8rem/1 var(--display); text-transform: uppercase; cursor: pointer; }
.result { padding: 1.3rem 0; border-top: 1px solid var(--rule); }
.result h2 { margin: 0; font: 850 1.55rem/1.1 var(--display); }
.result p { margin: .45rem 0; }
mark { background: var(--gold-soft); color: var(--ink); padding-inline: .08em; }
.pagination { display: flex; justify-content: flex-end; margin-top: 2rem; }
.pagination--reader { justify-content: space-between; align-items: center; gap: 1rem; }
.empty-state { margin: 2rem 0; border: 1px solid var(--rule); padding: 2rem; background: var(--paper-bright); }
.identity-strip { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--rule); padding-bottom: 1rem; }
.identity-strip .eyebrow { margin-bottom: .25rem; }
.avatar--large { width: 4.5rem; height: 4.5rem; }
.error-code { font: 800 clamp(4rem,11vw,8rem)/.8 var(--display); color: var(--gold); }
.site-footer { border-top: 2px solid var(--ink); padding: 2rem clamp(1rem,3vw,2.5rem); background: var(--slate); color: var(--paper); }
.site-footer__inner { max-width: 1480px; margin: 0 auto; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
@media (max-width: 980px) {
  .header-note { display: none; }
  .hero { grid-template-columns: 1fr; }
  .hero h1 { max-width: 11ch; }
  .section--split { grid-template-columns: 1fr; }
  .reader-callout { grid-template-columns: 1fr 1fr; }
  .reader-callout .button { justify-self: start; }
  .reader-shell { grid-template-columns: 1fr; }
  .embed-builder { grid-template-columns: 1fr; }
  .page-shell { grid-template-columns: 1fr; }
  .page-rail { position: static; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .page-rail h1 { grid-column: 1 / -1; }
  .dispatch-item { grid-template-columns: 3.8rem minmax(0,1fr) auto; }
  .dispatch-number { grid-row: 1 / 3; }
  .dispatch-title { grid-column: 2; grid-row: 1; }
  .dispatch-author { display: flex; grid-column: 2; grid-row: 2; padding-top: 0; }
  .dispatch-date { display: flex; grid-column: 3; grid-row: 2; justify-content: flex-end; padding-top: 0; }
  .dispatch-status { grid-column: 3; grid-row: 1; }
}
@media (max-width: 700px) {
  .site-header__inner { flex-wrap: wrap; }
  .site-nav { width: 100%; margin-left: 0; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); }
  .search-mini { grid-column: 1 / -1; }
  .search-mini input { width: auto; min-width: 0; flex: 1; }
  .nav-link { justify-content: center; }
  .hero { padding-top: 1.5rem; }
  .hero h1 { font-size: clamp(2.85rem,12vw,4rem); }
  .reader-callout { grid-template-columns: 1fr; }
  .reader-shell { padding-top: 2rem; }
  .repo-form__control { grid-template-columns: 1fr; }
  .repo-form button { min-height: 52px; border-left: 0; border-top: 2px solid var(--paper); }
  .reader-boundary { grid-template-columns: 1fr; }
  .embed-config__options { grid-template-columns: 1fr 1fr; }
  .embed-config__options label:last-child { grid-column: 1 / -1; }
  .embed-code { grid-template-columns: 1fr; }
  .embed-code > p { grid-column: 1; }
  .steps { grid-template-columns: repeat(3,1fr); }
  .steps li { border-right: 1px solid var(--rule); }
  .steps li:last-child { border-right: 0; }
  .dispatch-board { clip-path: none; box-shadow: 5px 5px 0 var(--gold-soft); }
  .dispatch-board__head { align-items: flex-start; flex-direction: column; }
  .dispatch-item { grid-template-columns: 3.5rem minmax(0,1fr); }
  .dispatch-number { grid-row: 1 / 4; }
  .dispatch-title { grid-column: 2; grid-row: 1; }
  .dispatch-author { grid-column: 2; grid-row: 2; justify-self: start; padding: 0 .65rem .4rem; }
  .dispatch-date { grid-column: 2; grid-row: 2; justify-self: end; padding: 0 .65rem .4rem; }
  .dispatch-status { grid-column: 2; grid-row: 3; justify-self: start; margin: 0 .65rem .65rem; }
  .page-strip { grid-template-columns: 3.3rem minmax(0,1fr); }
  .page-strip__number { grid-row: 1 / 3; }
  .page-strip__date { display: flex; grid-column: 2; align-items: flex-start; padding: 0 .9rem .7rem; }
  .reader-strip { grid-template-columns: 5.5rem minmax(0,1fr); }
  .reader-strip .page-strip__number { grid-row: 1 / 4; }
  .reader-strip__excerpt { margin-bottom: .4rem; }
  .page-rail { display: block; }
  .article-pane { padding: 1rem; box-shadow: 4px 4px 0 rgba(23,27,26,.12); }
  .article-route { grid-template-columns: minmax(5.5rem,max-content) minmax(0,1fr); }
  .article-route__status { grid-column: 1 / -1; justify-content: center; }
  .comment { grid-template-columns: 2.4rem minmax(0,1fr); }
  .avatar { width: 2.4rem; height: 2.4rem; }
  .onward { grid-template-columns: 1fr; gap: .25rem; }
}
@media (max-width: 470px) {
  .nav-link { padding-inline: .4rem; text-align: center; }
}
/* Common Thread — simple, flat, and content-led. */
:root {
  --gold: #c89b3c;
  --gold-soft: #ead8a9;
  --ink: #182028;
  --slate: #17324a;
  --paper: #f7f1e5;
  --paper-bright: #fffdf8;
  --rule: #a7a296;
  --green: #376448;
  --red: #9d2f2a;
  --muted: #59636a;
  --focus: #f1c65b;
  --blue: #245c82;
  --field: #17324a;
  --field-deep: #102637;
  --field-soft: #536f82;
  --field-ink: #f7f1e5;
  --seam: #b84b41;
  --display: Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
  --meta: ui-monospace, "SFMono-Regular", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace;
  --body: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  --reading: Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
}
html { background: var(--field-deep); }
body { background: var(--paper); font-family: var(--body); line-height: 1.6; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; box-shadow: 0 0 0 2px var(--field-deep); }
.site-header { border: 0; border-bottom: 1px dashed #c6d3dc; background: var(--field-deep); color: var(--field-ink); }
.site-header__inner { max-width: 1280px; min-height: 72px; padding: .7rem clamp(1rem,3vw,2rem); gap: clamp(.8rem,2vw,1.5rem); }
.brand { gap: .7rem; color: var(--field-ink); font: 700 clamp(1.15rem,2.4vw,1.55rem)/1 var(--meta); letter-spacing: -.025em; }
.brand-mark { width: 1.55rem; height: 1.55rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 2px; border: 1px dashed currentColor; }
.brand-mark i { display: block; background: var(--field-soft); }
.brand-mark i:nth-child(2), .brand-mark i:nth-child(3) { background: var(--red); }
.header-note { max-width: 20rem; border-left: 1px dashed #c6d3dc; color: #d9e2e7; font-size: .8rem; }
.site-nav { gap: .25rem; }
.nav-link { color: var(--field-ink); border: 1px solid transparent; font: 650 .72rem/1 var(--meta); letter-spacing: 0; text-transform: none; }
.nav-link:hover, .nav-link[aria-current="page"] { border-color: #c6d3dc; text-decoration: none; }
.search-mini { border: 1px solid #c6d3dc; background: var(--paper-bright); }
.search-mini input { background: var(--paper-bright); color: var(--ink); font-size: .84rem; }
.search-mini button { border-left: 1px dashed var(--field); background: var(--red); color: #fff; font: 700 .7rem/1 var(--meta); text-transform: none; }
main { min-height: 76vh; }
.hero { max-width: 1280px; margin: 1.25rem auto 0; padding: 0 clamp(1rem,3vw,2rem); grid-template-columns: minmax(20rem,1fr) minmax(30rem,1.18fr); gap: 0; align-items: stretch; }
.hero__message { display: flex; flex-direction: column; justify-content: center; border: 1px solid #c9c1b3; border-right: 1px dashed var(--seam); background: var(--paper-bright); padding: clamp(1.5rem,3vw,2.75rem); }
.field-note, .eyebrow { margin: 0 0 1rem; color: var(--red); font: 700 .76rem/1.3 var(--meta); letter-spacing: 0; text-transform: none; }
.hero h1 { max-width: 15ch; margin: 0; font: 700 clamp(2.35rem,3.7vw,3.65rem)/1.02 var(--display); letter-spacing: -.03em; }
.hero h1 .stop { color: inherit; }
.hero-copy { max-width: 38rem; margin: 1.25rem 0; font-size: clamp(1rem,1.2vw,1.12rem); }
.hero-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.button { min-height: 46px; border: 1px solid var(--ink); border-radius: 2px; background: var(--red); color: #fff; padding: .8rem 1rem; box-shadow: none; font: 700 .78rem/1 var(--meta); letter-spacing: 0; text-transform: none; transition: background-color .12s ease-out, color .12s ease-out; }
.button:hover { transform: none; box-shadow: none; background: var(--field-deep); text-decoration: none; }
.button--light { background: var(--paper-bright); color: var(--ink); }
.button--light:hover { background: var(--field); color: var(--field-ink); }
.hero .text-link { min-height: 46px; }
.publish-trust { color: var(--muted); }
.pilot-notice { max-width: 39rem; margin: 1rem 0 0; border: 0; border-top: 1px dashed var(--rule); background: transparent; padding: .8rem 0 0; color: var(--muted); font-size: .8rem; }
.steps { display: none; }
.dispatch-board { border: 1px solid var(--field-deep); border-left: 0; background: var(--field); color: var(--field-ink); padding: clamp(1rem,2vw,1.5rem); clip-path: none; box-shadow: none; }
.dispatch-board__head { border-bottom: 1px dashed #c6d3dc; padding: 0 0 .8rem; }
.dispatch-board h2 { font: 650 clamp(1.25rem,2vw,1.7rem)/1.1 var(--display); }
.dispatch-board__legend { color: #d9e2e7; font: .72rem/1.3 var(--meta); }
.dispatch-list { display: grid; gap: .55rem; padding-top: .7rem; }
.dispatch-item { grid-template-columns: 4rem minmax(0,1fr) minmax(7rem,.55fr) auto auto; min-height: 68px; border: 0; border-bottom: 1px solid #9ca8ae; background: var(--paper-bright); color: var(--ink); }
.dispatch-item > * { padding: .65rem .7rem; }
.dispatch-number { background: var(--red); color: #fff; clip-path: none; font: 700 1rem/1 var(--meta); }
.dispatch-title { font-weight: 680; }
.dispatch-title:hover { background: transparent; text-decoration: underline; }
.dispatch-author, .dispatch-date { color: var(--muted); font-size: .75rem; }
.dispatch-status { grid-column: 5; margin: .8rem .65rem; border: 0; border-bottom: 1px dashed var(--green); color: var(--green); font: 700 .66rem/1 var(--meta); text-transform: none; }
.dispatch-status--archived { border-color: var(--red); color: var(--red); }
.empty-dispatch { color: #d9e2e7; }
.reader-callout { max-width: 1216px; margin: 0 auto; border: 0; border-inline: 1px solid #536d7f; border-bottom: 1px solid #536d7f; background: var(--field-soft); color: #fff; padding: clamp(1.2rem,2.5vw,2rem); grid-template-columns: minmax(16rem,.9fr) minmax(18rem,1fr) auto; }
.reader-callout .field-note { color: #fff; }
.reader-callout h2 { font: 650 clamp(1.45rem,2.5vw,2.15rem)/1.08 var(--display); }
.reader-callout .button--light { border-color: #fff; }
.reader-callout .text-link { color: #fff; }
.section { max-width: 1280px; padding: 1.25rem clamp(1rem,3vw,2rem) 3rem; }
.section--split { gap: 0; }
.section--split > div { border: 1px solid #c9c1b3; background: var(--paper-bright); padding: clamp(1rem,2vw,1.4rem); }
.section--split > div + div { border-left: 0; }
.section-head { border-bottom: 1px dashed var(--rule); margin-bottom: .25rem; padding-bottom: .7rem; }
.section-head h2 { font: 650 clamp(1.35rem,2.3vw,1.9rem)/1.1 var(--display); }
.text-link { font: 650 .74rem/1 var(--meta); letter-spacing: 0; text-transform: none; }
.page-strip { grid-template-columns: 4rem minmax(0,1fr) auto; min-height: 76px; border-bottom: 1px dashed var(--rule); }
.page-strip__number { background: var(--field); color: var(--field-ink); padding: .75rem; font: 700 .95rem/1 var(--meta); }
.page-strip:nth-child(even) .page-strip__number { background: var(--field-soft); }
.page-strip__body { padding: .75rem 1rem; }
.page-strip__title { font-weight: 680; }
.page-strip__meta, .page-strip__date { color: var(--muted); font-size: .74rem; }
.page-strip__date { padding: .75rem; }
.page-shell { max-width: 1280px; margin: 1.25rem auto 3rem; padding: clamp(.7rem,2vw,1.25rem); grid-template-columns: minmax(230px,.36fr) minmax(0,1fr); gap: 1px; background: var(--field); }
.page-rail { top: 1rem; border: 0; background: var(--field-deep); color: var(--field-ink); padding: clamp(1.2rem,2.5vw,2rem); }
.page-rail .eyebrow { color: #d9e2e7; }
.page-rail h1 { margin: .35rem 0 1.2rem; font: 650 clamp(2rem,3.6vw,3.4rem)/1.04 var(--display); letter-spacing: -.035em; }
.page-rail dt { color: #bfcdd5; font: 650 .68rem/1 var(--meta); letter-spacing: 0; text-transform: none; }
.page-rail a:not(.button) { color: inherit; }
.page-rail .button--light { border-color: #c6d3dc; }
.article-pane { border: 1px dashed var(--seam); background: var(--paper-bright); padding: clamp(1.25rem,4vw,4rem); box-shadow: none; }
.article-route { grid-template-columns: minmax(5rem,max-content) minmax(0,1fr) auto; border: 0; border-bottom: 1px dashed var(--rule); margin-bottom: 2.5rem; }
.article-route__number { background: var(--red); color: #fff; clip-path: none; font: 700 1rem/1 var(--meta); }
.article-route__source { justify-content: flex-start; font: 650 .72rem/1 var(--meta); text-transform: none; }
.article-route__status { border-left: 1px dashed var(--rule); background: transparent; color: var(--green); font: 650 .7rem/1 var(--meta); text-transform: none; }
.article-route__status--archived { background: transparent; color: var(--red); }
.prose { max-width: 72ch; font-family: var(--reading); font-size: clamp(1.05rem,1.15vw,1.16rem); line-height: 1.76; }
.prose h1, .prose h2, .prose h3 { font-family: var(--display); font-weight: 650; line-height: 1.16; }
.prose h1 { font-size: clamp(2rem,4vw,2.8rem); }
.prose h2 { font-size: clamp(1.55rem,3vw,2.1rem); }
.prose h3 { font-size: clamp(1.25rem,2.5vw,1.6rem); }
.prose code { background: #ede5d6; }
.prose pre, .highlight { background: var(--field-deep); color: var(--field-ink); }
.prose blockquote { border-left: 1px solid var(--red); }
.prose details, .markdown-alert, .rich-block { border: 1px dashed var(--rule); background: var(--paper); }
.markdown-alert { border-left: 1px solid currentColor; }
.tags { gap: .35rem; }
.tag { border: 1px dashed currentColor; padding: .3rem .48rem; font: 650 .68rem/1 var(--meta); }
.reactions { border-top: 1px dashed var(--rule); padding-top: 1rem; }
.discussion { margin-top: 3.5rem; }
.discussion h2 { border-bottom: 1px dashed var(--rule); font: 650 1.55rem/1.1 var(--display); }
.discussion-loading, .comment { border-bottom: 1px dashed var(--rule); }
.comment__meta { font-family: var(--body); }
.comment .prose { font-size: 1rem; }
.onward { border-top: 1px dashed var(--rule); }
.onward h2 { font: 650 1.3rem/1.1 var(--display); }
.listing-shell, .reader-shell, .embed-builder { max-width: 1180px; margin: 1.25rem auto 3rem; border: 1px dashed var(--rule); background: var(--paper-bright); padding: clamp(1.3rem,4vw,3.5rem); }
.listing-title { max-width: 20ch; font: 650 clamp(2.1rem,4.6vw,4rem)/1.02 var(--display); letter-spacing: -.035em; }
.reader-shell, .embed-builder { grid-template-columns: minmax(0,.8fr) minmax(24rem,1.1fr); gap: clamp(1.5rem,4vw,3.5rem); }
.reader-intro, .embed-builder__intro { border-top: 0; border-left: 1px dashed var(--red); padding: .4rem 0 .4rem 1.25rem; }
.reader-intro h1, .embed-builder__intro h1 { max-width: 14ch; font: 650 clamp(2rem,4.5vw,3.8rem)/1.04 var(--display); letter-spacing: -.035em; }
.repo-form { border: 0; background: var(--field); color: var(--field-ink); box-shadow: none; padding: clamp(1.2rem,3vw,2rem); }
.repo-form label { font: 650 .74rem/1.2 var(--meta); letter-spacing: 0; text-transform: none; }
.repo-form__control { border: 1px dashed #c6d3dc; }
.repo-form input { font-family: var(--body); font-weight: 500; }
.repo-form button, .embed-config > button { border: 0; border-left: 1px dashed #c6d3dc; background: var(--red); color: #fff; font: 700 .74rem/1.15 var(--meta); text-transform: none; }
.reader-boundary { border-block: 1px dashed var(--rule); }
.embed-config { box-shadow: none; }
.embed-config select, .embed-config input[type="color"] { border: 1px dashed #c6d3dc; }
.embed-code, .embed-preview { border-top: 1px dashed var(--rule); }
.embed-code h2, .embed-preview h2 { font: 650 clamp(1.5rem,2.8vw,2.15rem)/1.05 var(--display); }
.embed-code pre { background: var(--field-deep); }
.reader-strip { min-height: 92px; }
.reader-actions { border-block: 1px dashed var(--rule); padding-block: .8rem; }
.reader-notice, .empty-state { border: 1px dashed var(--rule); background: var(--paper); }
.search-form { border: 1px dashed var(--rule); }
.search-form button { border-left: 1px dashed var(--rule); background: var(--red); font: 700 .75rem/1 var(--meta); text-transform: none; }
.result { border: 0; border-top: 1px dashed var(--rule); }
.identity-strip { border: 0; border-bottom: 1px dashed var(--rule); }
.result h2 { font: 650 1.35rem/1.15 var(--display); }
.error-code { color: var(--red); font-family: var(--display); }
.site-footer { border-top: 1px dashed #c6d3dc; background: var(--field-deep); color: var(--field-ink); }
.site-footer__inner { max-width: 1280px; }
@media (max-width: 980px) {
  .hero { grid-template-columns: 1fr; }
  .dispatch-board { border-left: 1px solid var(--field-deep); border-top: 0; }
  .reader-callout { grid-template-columns: 1fr 1fr; }
  .section--split { grid-template-columns: 1fr; }
  .section--split > div + div { border-left: 1px solid #c9c1b3; border-top: 0; }
  .reader-shell, .embed-builder, .page-shell { grid-template-columns: 1fr; }
  .page-rail { position: static; display: block; }
}
@media (max-width: 700px) {
  .site-header__inner { min-height: 64px; }
  .header-note { order: 3; width: 100%; max-width: none; border: 0; padding: 0; }
  .site-nav { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .hero { margin-top: .75rem; }
  .hero__message { padding: 1.25rem; }
  .hero h1 { font-size: clamp(2rem,10.5vw,3rem); }
  .dispatch-board { padding: .9rem; }
  .dispatch-item { grid-template-columns: 3.6rem minmax(0,1fr); }
  .dispatch-number { grid-row: 1 / 4; }
  .dispatch-title { grid-column: 2; }
  .dispatch-author, .dispatch-date { grid-column: 2; grid-row: auto; justify-self: start; padding-top: 0; }
  .dispatch-status { grid-column: 2; grid-row: auto; justify-self: start; margin: 0 .65rem .65rem; }
  .reader-callout { grid-template-columns: 1fr; }
  .page-strip, .reader-strip { grid-template-columns: 3.6rem minmax(0,1fr); }
  .page-strip__number { grid-row: 1 / 3; }
  .page-strip__date { grid-column: 2; align-items: flex-start; padding: 0 1rem .75rem; }
  .article-pane { padding: 1.1rem; }
  .article-route { grid-template-columns: minmax(4.5rem,max-content) minmax(0,1fr); }
  .article-route__status { grid-column: 1 / -1; justify-content: flex-start; border-left: 0; border-top: 1px dashed var(--rule); }
  .listing-shell, .reader-shell, .embed-builder { margin-top: .75rem; padding: 1.1rem; }
  .repo-form__control { grid-template-columns: 1fr; }
  .repo-form button { border-left: 0; border-top: 1px dashed #c6d3dc; }
}
@media (max-width: 470px) {
  .brand-mark { width: 1.4rem; height: 1.4rem; }
  .nav-link { padding-inline: .3rem; }
  .hero-actions { align-items: stretch; flex-direction: column; }
  .hero-actions .button, .hero-actions .text-link { width: 100%; justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .button { transition: none; }
  .discussion-loading > span:first-child { animation: none; }
}
`;

export const articlePollingScript = `
(() => {
  const root = document.querySelector("[data-article-version]");
  if (!root) return;
  const issue = root.getAttribute("data-article-issue");
  let version = Number(root.getAttribute("data-article-version"));
  let timer;
  let delay = 15000;
  const schedule = () => {
    clearTimeout(timer);
    if (document.visibilityState === "visible") timer = setTimeout(poll, delay);
  };
  const poll = async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/api/articles/" + encodeURIComponent(issue) + "/version", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (response.ok) {
        const payload = await response.json();
        if (typeof payload.revision === "number" && payload.revision > version) {
          version = payload.revision;
          window.location.reload();
          return;
        }
      }
    } catch (_) {}
    delay = Math.min(delay * 2, 60000);
    schedule();
  };
  const start = () => {
    clearTimeout(timer);
    if (document.visibilityState === "visible") {
      delay = 15000;
      schedule();
    }
  };
  document.addEventListener("visibilitychange", start);
  start();
})();
`;
