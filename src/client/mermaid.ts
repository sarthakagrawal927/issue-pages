import mermaid from "mermaid";

const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-mermaid]"));

if (blocks.length > 0) {
  mermaid.initialize({
    flowchart: { htmlLabels: false },
    securityLevel: "strict",
    startOnLoad: false,
    suppressErrorRendering: true,
    theme: "base",
    themeVariables: {
      background: "#fffdf6",
      fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
      lineColor: "#31404a",
      primaryBorderColor: "#31404a",
      primaryColor: "#f2df9c",
      primaryTextColor: "#18242b",
      secondaryColor: "#e8edf0",
      tertiaryColor: "#fffdf6",
    },
  });

  for (const [index, block] of blocks.entries()) {
    const source = block.querySelector(".rich-block__fallback code")?.textContent ?? "";
    const target = block.querySelector<HTMLElement>(".rich-block__canvas");
    if (!target || source.length === 0 || source.length > 20_000) continue;
    try {
      const identifier = `issuepages-mermaid-${index}-${crypto.randomUUID().replaceAll("-", "")}`;
      const result = await mermaid.render(identifier, source);
      target.innerHTML = result.svg;
      result.bindFunctions?.(target);
      block.dataset.rendered = "true";
      const fallback = block.querySelector<HTMLDetailsElement>(".rich-block__fallback");
      if (fallback) fallback.open = false;
    } catch (error) {
      console.warn("IssuePages could not render a Mermaid diagram.", error);
      block.dataset.error = "true";
      target.textContent =
        "This diagram could not be rendered safely. Its source is available below.";
    }
  }
}
