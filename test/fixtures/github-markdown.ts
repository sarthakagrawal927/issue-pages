export const parityMarkdown = `# Rich issue body

> [!NOTE]
> Alerts render as callouts.

- [x] A completed task

@octocat see #2 and :tada:.

\`\`\`javascript
const answer = 42;
\`\`\`

Inline math $x^2$.

\`\`\`mermaid
graph TD; A-->B;
\`\`\`
`;

export const parityGitHubHtml = `<h1 dir="auto">Rich issue body</h1>
<div class="markdown-alert markdown-alert-note" dir="auto"><p class="markdown-alert-title"><svg onload="alert(1)"><path></path></svg>Note</p><p>Alerts render as callouts.</p></div>
<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" disabled checked aria-label="Completed task"> A completed task</li></ul>
<p><a class="user-mention" href="https://github.com/octocat">@octocat</a> see <a class="issue-link" href="https://github.com/sarthakagrawal927/issue-pages/issues/2">#2</a> and 🎉.</p>
<div class="highlight highlight-source-js"><pre class="notranslate"><span class="pl-k">const</span> answer = <span class="pl-c1">42</span>;</pre></div>
<p><a href="docs/guide.md">relative link</a></p>
<details open><summary>More</summary><p>Hidden details.</p></details>
<p><themed-picture><picture><source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.png"><img src="https://example.com/light.png" alt="Example" onerror="alert(1)" style="width:9999px"></picture></themed-picture></p>
<p>Color <code class="notranslate">#0969DA<span class="ml-1 d-inline-block border circle color-border-subtle" style="background:url(javascript:alert(1))"></span></code>.</p>
<p>Math <math-renderer class="js-inline-math">$x^2$</math-renderer>.</p>
<section class="js-render-needs-enrichment" data-type="mermaid"><div data-plain="graph TD; A--&gt;B;"><pre>graph TD; A--&gt;B;</pre></div></section>
<section class="js-render-needs-enrichment" data-type="geojson"><div data-plain="{&quot;type&quot;:&quot;Point&quot;,&quot;coordinates&quot;:[0,0]}"><pre>{"type":"Point","coordinates":[0,0]}</pre></div></section>
<p>Footnote<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref="">1</a></sup>.</p>
<section data-footnotes="" class="footnotes"><h2 id="footnote-label" class="sr-only">Footnotes</h2><ol><li id="user-content-fn-1"><p>Text <a href="#user-content-fnref-1" data-footnote-backref="" aria-label="Back">↩</a></p></li></ol></section>
<script>alert(1)</script><style>body{display:none}</style><iframe src="javascript:alert(1)"></iframe>`;
