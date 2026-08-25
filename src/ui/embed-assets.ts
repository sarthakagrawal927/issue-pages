export const embedStyles = `
:root { --accent:#9d2f2a; --ink:#182028; --slate:#17324a; --paper:#f7f1e5; --sheet:#fffdf8; --rule:#a7a296; --muted:#59636a; --danger:#9d2f2a; --pad:clamp(.85rem,3vw,1.5rem); --row-pad:.9rem; color-scheme:light; }
:root[data-density="compact"] { --row-pad:.62rem; }
:root[data-theme="dark"] { --ink:#f7f1e5; --slate:#102637; --paper:#10202d; --sheet:#17324a; --rule:#6f8798; --muted:#c6d3dc; color-scheme:dark; }
@media (prefers-color-scheme:dark) { :root[data-theme="auto"] { --ink:#f7f1e5; --slate:#102637; --paper:#10202d; --sheet:#17324a; --rule:#6f8798; --muted:#c6d3dc; color-scheme:dark; } }
:root[data-variant="minimal"] { --ink:#111827; --slate:#111827; --paper:#f7f9fc; --sheet:#fff; --rule:#d7dce4; --muted:#606775; }
:root[data-variant="minimal"][data-theme="dark"] { --ink:#e7e8ea; --slate:#0d0e10; --paper:#08090a; --sheet:#0d0e10; --rule:#24262a; --muted:#9296a0; }
@media (prefers-color-scheme:dark) { :root[data-variant="minimal"][data-theme="auto"] { --ink:#e7e8ea; --slate:#0d0e10; --paper:#08090a; --sheet:#0d0e10; --rule:#24262a; --muted:#9296a0; } }
* { box-sizing:border-box; }
html { background:transparent; }
body { margin:0; background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",ui-sans-serif,system-ui,sans-serif; line-height:1.55; text-rendering:optimizeLegibility; }
a { color:inherit; text-underline-offset:.18em; }
a:hover { text-decoration-thickness:.14em; }
:focus-visible { outline:3px solid #3b82f6; outline-offset:2px; box-shadow:0 0 0 5px var(--sheet),0 0 0 7px var(--ink); }
img { max-width:100%; height:auto; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.skip-link { position:fixed; top:.5rem; left:.5rem; transform:translateY(-180%); z-index:10; padding:.55rem .75rem; background:var(--sheet); }
.skip-link:focus { transform:none; }
.embed-frame { width:100%; border:1px solid var(--ink); background:var(--paper); overflow:hidden; }
.embed-header { min-height:58px; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.75rem; padding:.55rem var(--pad); border-top:1px dashed var(--embed-accent); border-bottom:1px solid var(--ink); background:var(--slate); color:#f7f1e5; }
.embed-brand { font-size:.72rem; font-weight:800; text-decoration:none; }
.embed-header strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:clamp(.95rem,3vw,1.2rem); }
.embed-header strong span,.embed-intro h1 span { color:var(--embed-accent); }
.embed-header > a:last-child { min-height:44px; display:inline-flex; align-items:center; font-size:.75rem; font-weight:750; }
.embed-intro { display:flex; justify-content:space-between; align-items:end; gap:1rem; padding:clamp(1.1rem,4vw,2rem) var(--pad) .85rem; border-bottom:1px solid var(--ink); }
.embed-intro p { margin:0 0 .35rem; color:var(--muted); font-size:.7rem; font-weight:750; }
.embed-intro h1 { margin:0; overflow-wrap:anywhere; font-family:Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif; font-size:clamp(1.55rem,5vw,2.6rem); line-height:1.05; letter-spacing:-.025em; }
.embed-intro > span { flex:none; color:var(--muted); font-size:.75rem; }
.embed-ledger { background:var(--sheet); }
.embed-row { display:grid; grid-template-columns:5.2rem minmax(0,1fr) auto; min-height:88px; border-bottom:1px solid var(--rule); }
.embed-number { display:flex; align-items:center; justify-content:center; padding:var(--row-pad); background:var(--embed-accent); color:#fff; font-size:1.05rem; font-weight:800; text-decoration:none; }
.embed-row__body { min-width:0; padding:var(--row-pad); }
.embed-row__title { display:block; font-size:1rem; font-weight:750; line-height:1.25; text-decoration:none; }
.embed-row__body p { margin:.25rem 0 0; color:var(--muted); font-size:.76rem; }
.embed-excerpt { max-width:74ch; margin-top:.35rem; color:var(--muted); font-size:.82rem; line-height:1.4; }
.embed-row__date { min-width:7rem; display:flex; flex-direction:column; justify-content:center; align-items:end; padding:var(--row-pad); color:var(--muted); font-size:.72rem; text-align:right; }
.embed-row__date span { color:var(--ink); font-size:.65rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
.embed-pager { min-height:62px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:1rem; padding:.55rem var(--pad); background:var(--paper); }
.embed-pager a { min-height:44px; display:inline-flex; align-items:center; font-size:.78rem; font-weight:800; }
.embed-pager a:last-child { justify-self:end; }
.embed-pager strong { color:var(--muted); font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; }
.embed-article { max-width:850px; margin:0 auto; padding:clamp(1.2rem,5vw,3.4rem) var(--pad); background:var(--sheet); }
.embed-back { min-height:44px; display:inline-flex; align-items:center; margin-bottom:1rem; font-size:.78rem; font-weight:800; }
.embed-article__meta { display:flex; justify-content:space-between; border-block:1px solid var(--ink); padding:.5rem 0; font-size:.7rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
.embed-article__meta span:first-child { text-decoration:3px underline var(--embed-accent); text-underline-offset:.24em; }
.embed-article h1 { max-width:19ch; margin:1.1rem 0 .7rem; font-family:Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif; font-size:clamp(2rem,7vw,3.7rem); line-height:1.04; letter-spacing:-.03em; text-wrap:balance; }
.embed-byline { margin:.75rem 0 2.2rem; color:var(--muted); font-size:.82rem; }
.embed-labels { display:flex; flex-wrap:wrap; gap:.35rem; margin:.85rem 0; }
.embed-labels span { border:1px solid currentColor; padding:.2rem .42rem; font-size:.68rem; font-weight:750; }
.prose { max-width:72ch; overflow-wrap:anywhere; font-family:Charter,"Bitstream Charter","Sitka Text",Cambria,Georgia,serif; font-size:clamp(1rem,2.4vw,1.08rem); line-height:1.72; }
.prose h1,.prose h2,.prose h3 { margin:1.8em 0 .55em; font-family:inherit; line-height:1.15; }
.prose h1 { font-size:2.25rem; }.prose h2 { font-size:1.75rem; }.prose h3 { font-size:1.35rem; }
.prose pre,.highlight { max-width:100%; overflow-x:auto; padding:1rem; background:var(--slate); color:#f2efe2; }
.prose code { padding:.08em .25em; background:color-mix(in srgb,var(--rule) 24%,transparent); font-size:.9em; }
.prose pre code { padding:0; background:transparent; }
.prose blockquote { margin-inline:0; padding-left:1rem; border-left:1px solid var(--embed-accent); color:var(--muted); }
.prose table { display:block; width:max-content; max-width:100%; overflow-x:auto; border-collapse:collapse; }
.prose th,.prose td { border:1px solid var(--rule); padding:.5rem .65rem; }
.prose details,.rich-block,.markdown-alert { margin:1.25rem 0; border:1px solid var(--rule); padding:.75rem 1rem; }
.prose summary { cursor:pointer; font-weight:750; }
.markdown-alert { border-left:1px solid var(--embed-accent); }
.contains-task-list { padding-left:.3rem; list-style:none; }
.task-list-item { display:flex; align-items:baseline; gap:.5rem; }
.math-display,.rich-block__canvas { max-width:100%; overflow-x:auto; }
.rich-block__canvas svg { display:block; max-width:100%; height:auto; }
.embed-reactions { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; margin:1.8rem 0; color:var(--muted); font-size:.76rem; }
.embed-reactions a { margin-right:.2rem; }
.embed-reactions span { padding:.2rem; }
.embed-source { margin:2rem 0; font-size:.82rem; font-weight:750; }
.embed-discussion { margin-top:3rem; }
.embed-discussion h2 { display:flex; justify-content:space-between; border-bottom:1px solid var(--ink); padding-bottom:.5rem; font-size:1.4rem; }
.embed-discussion h2 span { color:var(--muted); font-size:.85rem; }
.embed-discussion__content.is-loading { min-height:7rem; display:flex; align-items:center; color:var(--muted); }
.embed-comment { display:grid; grid-template-columns:2.25rem minmax(0,1fr); gap:.85rem; padding:1.2rem 0; border-bottom:1px solid var(--rule); }
.embed-comment img { width:2.25rem; height:2.25rem; border-radius:50%; background:var(--rule); }
.embed-comment__meta { margin:0; color:var(--muted); font-size:.75rem; }
.embed-comment .prose { font-size:1rem; }
.embed-notice,.embed-empty { margin:1rem var(--pad); border:1px solid var(--rule); padding:.8rem 1rem; background:var(--sheet); font-size:.82rem; }
.embed-article > .embed-notice { margin:1rem 0; }
.embed-error { min-height:280px; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:2rem var(--pad); }
.embed-error > span { color:var(--ink); font-size:4rem; font-weight:850; line-height:1; text-decoration:5px underline var(--embed-accent); text-underline-offset:.12em; }
.embed-error h1 { margin:.4rem 0; font-size:clamp(1.7rem,5vw,2.6rem); }
.embed-error p { max-width:50ch; color:var(--muted); }
.embed-footer { min-height:48px; display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.5rem var(--pad); border-top:1px solid var(--ink); background:var(--paper); color:var(--muted); font-size:.7rem; }
:root[data-variant="minimal"] .embed-frame { border-color:var(--rule); }
:root[data-variant="minimal"] body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",ui-sans-serif,system-ui,sans-serif; }
:root[data-variant="minimal"] .prose { font-family:inherit; }
:root[data-variant="minimal"] .embed-header { min-height:52px; border-top-width:2px; border-bottom-color:var(--rule); background:var(--sheet); color:var(--ink); }
:root[data-variant="minimal"] .embed-brand { color:var(--muted); font-weight:700; }
:root[data-variant="minimal"] .embed-header strong { font-weight:650; }
:root[data-variant="minimal"] .embed-header strong span,:root[data-variant="minimal"] .embed-intro h1 span { color:inherit; }
:root[data-variant="minimal"] .embed-intro { border-bottom-color:var(--rule); }
:root[data-variant="minimal"] .embed-intro p { font-weight:700; }
:root[data-variant="minimal"] .embed-intro h1 { font-size:clamp(1.35rem,4vw,2rem); font-weight:650; }
:root[data-variant="minimal"] .embed-row { grid-template-columns:4.25rem minmax(0,1fr) auto; min-height:78px; border-bottom-color:var(--rule); }
:root[data-variant="minimal"] .embed-number { border-right:1px solid var(--rule); background:transparent; color:var(--ink); font-size:.85rem; font-weight:700; text-decoration:3px underline var(--embed-accent); text-underline-offset:.22em; }
:root[data-variant="minimal"] .embed-row__title { font-weight:600; }
:root[data-variant="minimal"] .embed-row__date span { font-weight:700; }
:root[data-variant="minimal"] .prose h1,:root[data-variant="minimal"] .prose h2,:root[data-variant="minimal"] .prose h3 { font-family:inherit; }
:root[data-variant="minimal"] .embed-pager,:root[data-variant="minimal"] .embed-footer { border-color:var(--rule); }
@media (max-width:560px) { .embed-header { grid-template-columns:1fr auto; }.embed-brand { display:none; }.embed-row { grid-template-columns:4.1rem minmax(0,1fr); }.embed-number { grid-row:1 / 3; }.embed-row__date { grid-column:2; min-width:0; align-items:flex-start; padding:0 var(--row-pad) var(--row-pad); }.embed-excerpt { display:none; }.embed-intro { flex-direction:column; align-items:flex-start; }.embed-intro > div { width:100%; min-width:0; }.embed-intro > span { align-self:flex-end; }:root[data-variant="minimal"] .embed-intro h1 { font-size:clamp(1.35rem,7vw,1.75rem); }.embed-footer span { display:none; }.embed-footer { justify-content:flex-end; } }
@media (prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; } }
`;
