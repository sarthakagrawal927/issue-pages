(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return;
  const source = new URL(script.src);
  const value = (script.dataset.repo ?? "").normalize("NFKC").trim();
  const match = value.match(
    /^(?:https:\/\/github\.com\/)?([a-z\d](?:[a-z\d-]*[a-z\d])?)\/([a-z\d._-]+?)(?:\.git)?\/?$/i,
  );
  const mount = document.createElement("div");
  mount.dataset.issuePagesEmbed = "";
  mount.style.cssText = "width:100%;min-width:0;contain:content";
  script.insertAdjacentElement("afterend", mount);
  if (!match) {
    mount.textContent = 'IssuePages: add a valid data-repo="owner/repository".';
    mount.setAttribute("role", "status");
    return;
  }

  const owner = match[1] ?? "";
  const repo = match[2] ?? "";
  const theme = ["light", "dark"].includes(script.dataset.theme ?? "")
    ? (script.dataset.theme ?? "auto")
    : "auto";
  const density = script.dataset.density === "compact" ? "compact" : "comfortable";
  const accent = /^#[\da-f]{6}$/i.test(script.dataset.accent ?? "")
    ? (script.dataset.accent ?? "")
    : "";
  const channel = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = new URL(
    `/embed/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    source.origin,
  );
  url.searchParams.set("theme", theme);
  url.searchParams.set("density", density);
  url.searchParams.set("channel", channel);
  if (accent) url.searchParams.set("accent", accent);

  const frame = document.createElement("iframe");
  frame.src = url.toString();
  frame.title = `Posts from ${owner}/${repo}`;
  frame.loading = "lazy";
  frame.sandbox.add(
    "allow-scripts",
    "allow-same-origin",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
  );
  frame.style.cssText = "display:block;width:100%;height:480px;border:0;overflow:hidden";
  mount.append(frame);

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.origin !== source.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const message = data as { type?: unknown; channel?: unknown; height?: unknown };
    if (
      message.type !== "issuepages:resize" ||
      message.channel !== channel ||
      typeof message.height !== "number" ||
      !Number.isFinite(message.height)
    )
      return;
    frame.style.height = `${Math.max(240, Math.min(20_000, Math.ceil(message.height)))}px`;
  });
})();
