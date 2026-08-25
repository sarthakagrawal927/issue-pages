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
  const requestedTheme = ["inherit", "light", "dark"].includes(script.dataset.theme ?? "")
    ? (script.dataset.theme ?? "auto")
    : "auto";
  const density = script.dataset.density === "compact" ? "compact" : "comfortable";
  const variant = script.dataset.variant === "minimal" ? "minimal" : "folio";
  const baseAccent = /^#[\da-f]{6}$/i.test(script.dataset.accent ?? "")
    ? (script.dataset.accent ?? "")
    : "";
  const lightAccent = /^#[\da-f]{6}$/i.test(script.dataset.accentLight ?? "")
    ? (script.dataset.accentLight ?? "")
    : baseAccent;
  const darkAccent = /^#[\da-f]{6}$/i.test(script.dataset.accentDark ?? "")
    ? (script.dataset.accentDark ?? "")
    : baseAccent;
  const label = (script.dataset.label ?? "").normalize("NFKC").trim();
  const author = (script.dataset.author ?? "").normalize("NFKC").trim();
  const hasControlCharacters = (value: string): boolean =>
    [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    });
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const inheritedTheme = (): "light" | "dark" =>
    document.documentElement.dataset.theme === "light" ||
    document.documentElement.dataset.theme === "dark"
      ? (document.documentElement.dataset.theme as "light" | "dark")
      : systemTheme.matches
        ? "dark"
        : "light";
  const activeTheme = (): "auto" | "light" | "dark" =>
    requestedTheme === "inherit" ? inheritedTheme() : (requestedTheme as "auto" | "light" | "dark");
  const activeAccent = (theme: "auto" | "light" | "dark"): string =>
    theme === "light" ? lightAccent : theme === "dark" ? darkAccent : baseAccent;
  const channel = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = new URL(
    `/embed/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    source.origin,
  );
  const initialTheme = activeTheme();
  const initialAccent = activeAccent(initialTheme);
  url.searchParams.set("theme", initialTheme);
  url.searchParams.set("density", density);
  if (variant === "minimal") url.searchParams.set("variant", variant);
  url.searchParams.set("channel", channel);
  if (initialAccent) url.searchParams.set("accent", initialAccent);
  if (label && label.length <= 50 && !hasControlCharacters(label)) {
    url.searchParams.set("label", label);
  }
  if (/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(author)) {
    url.searchParams.set("author", author);
  }

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

  const syncAppearance = () => {
    const theme = activeTheme();
    frame.contentWindow?.postMessage(
      {
        type: "issuepages:appearance",
        channel,
        theme,
        accent: activeAccent(theme),
      },
      source.origin,
    );
  };
  frame.addEventListener("load", syncAppearance);

  if (requestedTheme === "inherit") {
    new MutationObserver(syncAppearance).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    systemTheme.addEventListener("change", syncAppearance);
  }

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
