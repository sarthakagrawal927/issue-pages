import { embedAccentForeground } from "../lib/embed";

const discussion = document.querySelector<HTMLElement>("[data-reader-discussion]");

function renderDiscussionError(container: HTMLElement, source: string): void {
  container.replaceChildren();
  container.classList.remove("discussion-content--loading");
  container.classList.add("discussion-content--error");
  container.setAttribute("aria-busy", "false");

  const message = document.createElement("div");
  message.className = "empty-state";
  const heading = document.createElement("strong");
  heading.textContent = "Discussion is temporarily unavailable.";
  message.append(heading, document.createElement("br"));
  message.append("The article is complete. You can retry here or continue on GitHub. ");

  const retry = document.createElement("button");
  retry.className = "text-button";
  retry.type = "button";
  retry.textContent = "Retry";
  retry.addEventListener("click", () => {
    void loadDiscussion(container);
  });

  const github = document.createElement("a");
  github.href = source;
  github.rel = "external noopener";
  github.target = "_blank";
  github.textContent = "Open GitHub ↗";
  message.append(retry, " · ", github);
  container.append(message);
}

async function loadDiscussion(container: HTMLElement): Promise<void> {
  const source = container.dataset.source;
  const githubSource = container.dataset.githubSource ?? "https://github.com";
  if (!source) return;

  container.classList.add("discussion-content--loading");
  container.classList.remove("discussion-content--error");
  container.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(source, {
      headers: { Accept: "text/html" },
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`Discussion request failed with ${response.status}`);
    container.innerHTML = await response.text();
    container.classList.remove("discussion-content--loading");
    container.setAttribute("aria-busy", "false");
    if (container.querySelector("[data-mermaid]")) {
      const mermaidModule = "/assets/mermaid.js?v=20260825-2";
      const renderer = (await import(mermaidModule)) as {
        renderMermaidBlocks(root: ParentNode): Promise<void>;
      };
      await renderer.renderMermaidBlocks(container);
    }
  } catch {
    renderDiscussionError(container, githubSource);
  }
}

if (discussion) void loadDiscussion(discussion);

const prefetched = new Set<string>();
const hoverTimers = new WeakMap<HTMLAnchorElement, number>();

function issueLink(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const link = target.closest<HTMLAnchorElement>(
    'a[href^="/github/"][href*="/issues/"],a[href^="/embed/"][href*="/issues/"]',
  );
  if (!link || link.href.endsWith("/discussion")) return null;
  return link;
}

function prefetch(link: HTMLAnchorElement): void {
  if (prefetched.has(link.href)) return;
  prefetched.add(link.href);
  const hint = document.createElement("link");
  hint.rel = "prefetch";
  hint.as = "document";
  hint.href = link.href;
  document.head.append(hint);
}

function schedulePrefetch(link: HTMLAnchorElement): void {
  if (prefetched.has(link.href) || hoverTimers.has(link)) return;
  const timer = window.setTimeout(() => {
    hoverTimers.delete(link);
    prefetch(link);
  }, 120);
  hoverTimers.set(link, timer);
}

document.addEventListener("pointerover", (event) => {
  const link = issueLink(event.target);
  if (link) schedulePrefetch(link);
});

document.addEventListener("pointerout", (event) => {
  const link = issueLink(event.target);
  if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;
  const timer = hoverTimers.get(link);
  if (timer !== undefined) window.clearTimeout(timer);
  hoverTimers.delete(link);
});

document.addEventListener("focusin", (event) => {
  const link = issueLink(event.target);
  if (link) schedulePrefetch(link);
});

const embedChannel = document.documentElement.dataset.embedChannel;
if (embedChannel) {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const message = data as {
      type?: unknown;
      channel?: unknown;
      theme?: unknown;
      accent?: unknown;
    };
    if (
      message.type !== "issuepages:appearance" ||
      message.channel !== embedChannel ||
      (message.theme !== "light" && message.theme !== "dark")
    )
      return;
    document.documentElement.dataset.theme = message.theme;
    if (typeof message.accent === "string" && /^#[\da-f]{6}$/i.test(message.accent)) {
      document.documentElement.style.setProperty("--embed-accent", message.accent);
      document.documentElement.style.setProperty(
        "--embed-accent-ink",
        embedAccentForeground(message.accent),
      );
    }
  });

  for (const link of document.querySelectorAll<HTMLAnchorElement>(".prose a")) {
    if (link.origin !== window.location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  }

  let lastHeight = 0;
  let scheduled = false;
  const reportHeight = () => {
    scheduled = false;
    const height = Math.ceil(
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    );
    if (height === lastHeight) return;
    lastHeight = height;
    window.parent.postMessage({ type: "issuepages:resize", channel: embedChannel, height }, "*");
  };
  const scheduleHeight = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(reportHeight);
  };
  new ResizeObserver(scheduleHeight).observe(document.body);
  window.addEventListener("load", scheduleHeight, { once: true });
  void document.fonts.ready.then(scheduleHeight);
  scheduleHeight();
}
