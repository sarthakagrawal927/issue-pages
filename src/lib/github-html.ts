import type { Element, ElementContent, Properties, Root, RootContent, Text } from "hast";
import { fromHtml } from "hast-util-from-html";
import { defaultSchema, sanitize, type Schema } from "hast-util-sanitize";
import { toHtml } from "hast-util-to-html";
import katex from "katex";

export interface GitHubHtmlFeatures {
  mermaid: boolean;
  math: boolean;
  fallbackDiagrams: string[];
}

export interface NormalizedGitHubHtml {
  html: string;
  features: GitHubHtmlFeatures;
}

interface NormalizeOptions {
  /** Absolute URL of the issue or comment, used for "view on GitHub" fallback links. */
  sourceUrl: string;
  /**
   * Base URL that relative hrefs, image sources, and srcset candidates resolve against.
   * GitHub resolves relative links in issue bodies against the repository blob root,
   * not against the issue URL.
   */
  baseUrl: string;
}

const MATH_TAGS = [
  "annotation",
  "math",
  "menclose",
  "mfrac",
  "mi",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "semantics",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
] as const;

function attributesFor(tagName: string): NonNullable<Schema["attributes"]>[string] {
  return [...(defaultSchema.attributes?.[tagName] ?? [])];
}

function attributesWithout(
  tagName: string,
  excluded: string[],
): NonNullable<Schema["attributes"]>[string] {
  return attributesFor(tagName).filter((definition) => {
    const property = typeof definition === "string" ? definition : definition[0];
    return !excluded.includes(property);
  });
}

const githubSchema: Schema = {
  ...defaultSchema,
  clobber: [],
  tagNames: [...(defaultSchema.tagNames ?? []), ...MATH_TAGS],
  strip: [
    ...(defaultSchema.strip ?? []),
    "button",
    "embed",
    "form",
    "iframe",
    "noscript",
    "object",
    "option",
    "select",
    "style",
    "template",
    "textarea",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...attributesWithout("a", ["className"]),
      "rel",
      ["className", "data-footnote-backref", "issue-link", "user-mention"],
    ],
    annotation: ["encoding"],
    code: [
      ...attributesWithout("code", ["className"]),
      ["className", "notranslate", "math-source"],
    ],
    div: [
      ...attributesWithout("div", ["className"]),
      "ariaLabel",
      "ariaLive",
      [
        "className",
        "highlight",
        /^highlight-source-/,
        "markdown-alert",
        /^markdown-alert-/,
        "math-display",
        "rich-block__canvas",
      ],
    ],
    details: [
      ...attributesWithout("details", ["className"]),
      ["className", "rich-block__fallback"],
    ],
    img: [...attributesFor("img"), "loading", "referrerPolicy"],
    input: [
      ...attributesWithout("input", ["className", "type"]),
      "ariaLabel",
      ["className", "color-swatch"],
      ["type", "checkbox", "color"],
    ],
    math: ["display", "xmlns"],
    p: [
      ...attributesWithout("p", ["className"]),
      ["className", "markdown-alert-title", "rich-block__label"],
    ],
    pre: [...attributesWithout("pre", ["className"]), ["className", "notranslate"]],
    section: [
      ...attributesWithout("section", ["className"]),
      "ariaLabel",
      "dataMermaid",
      ["className", "footnotes", "rich-block", "rich-block--fallback", "rich-block--mermaid"],
    ],
    source: [...attributesFor("source"), "media", "srcSet"],
    span: [
      ...attributesWithout("span", ["className"]),
      "ariaLabel",
      ["className", /^pl-/, "katex", "katex-mathml", "math-inline", "sr-only"],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["https"],
    srcSet: ["https"],
  },
};

function text(value: string): Text {
  return { type: "text", value };
}

function element(
  tagName: string,
  properties: Properties = {},
  children: RootContent[] = [],
): Element {
  return {
    type: "element",
    tagName,
    properties,
    children: children.filter((child): child is ElementContent => child.type !== "doctype"),
  };
}

function isElement(node: RootContent): node is Element {
  return node.type === "element";
}

function classNames(node: Element): string[] {
  const value = node.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function nodeText(node: RootContent | Root): string {
  if (node.type === "text") return node.value;
  if (!("children" in node)) return "";
  return node.children.map((child) => nodeText(child)).join("");
}

function findDataPlain(node: RootContent): string | null {
  if (!isElement(node)) return null;
  const plain = node.properties.dataPlain;
  if (typeof plain === "string") return plain;
  const json = node.properties.dataJson;
  if (typeof json === "string") {
    try {
      const parsed: unknown = JSON.parse(json);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "data" in parsed &&
        typeof parsed.data === "string"
      ) {
        return parsed.data;
      }
    } catch {
      // The visible raw source remains available below.
    }
  }
  for (const child of node.children) {
    const value = findDataPlain(child);
    if (value !== null) return value;
  }
  return null;
}

function sourceBlock(source: string): Element {
  return element("pre", { className: ["notranslate"] }, [
    element("code", { className: ["notranslate"] }, [text(source)]),
  ]);
}

function githubLink(sourceUrl: string): Element {
  return element("a", { href: sourceUrl, rel: ["nofollow", "noopener", "noreferrer", "ugc"] }, [
    text("Open the original on GitHub"),
  ]);
}

function diagramFallback(type: string, source: string, sourceUrl: string): Element {
  const label = type === "stl" ? "STL 3D model" : `${type.toUpperCase()} diagram`;
  return element("section", { className: ["rich-block", "rich-block--fallback"] }, [
    element("p", { className: ["rich-block__label"] }, [
      text(`${label}. Interactive rendering stays on GitHub. `),
      githubLink(sourceUrl),
      text("."),
    ]),
    element("details", { className: ["rich-block__fallback"] }, [
      element("summary", {}, [text("View source")]),
      sourceBlock(source),
    ]),
  ]);
}

function mermaidBlock(source: string, sourceUrl: string, features: GitHubHtmlFeatures): Element {
  if (source.length > 20_000 || source.split("\n").length > 500) {
    features.fallbackDiagrams.push("mermaid");
    return diagramFallback("mermaid", source, sourceUrl);
  }
  features.mermaid = true;
  return element(
    "section",
    {
      ariaLabel: "Mermaid diagram",
      className: ["rich-block", "rich-block--mermaid"],
      dataMermaid: "",
    },
    [
      element("div", {
        ariaLabel: "Rendered Mermaid diagram",
        ariaLive: "polite",
        className: ["rich-block__canvas"],
      }),
      element("details", { className: ["rich-block__fallback"], open: true }, [
        element("summary", {}, [text("Diagram source")]),
        sourceBlock(source),
        element("p", {}, [githubLink(sourceUrl)]),
      ]),
    ],
  );
}

function stripMathDelimiters(value: string): string {
  const source = value.trim();
  if (source.startsWith("$$") && source.endsWith("$$")) return source.slice(2, -2).trim();
  if (source.startsWith("$`") && source.endsWith("`$")) return source.slice(2, -2).trim();
  if (source.startsWith("$") && source.endsWith("$")) return source.slice(1, -1).trim();
  return source;
}

function mathBlock(node: Element, features: GitHubHtmlFeatures): Element {
  const source = stripMathDelimiters(nodeText(node));
  const displayMode = classNames(node).includes("js-display-math");
  if (source.length === 0 || source.length > 10_000) {
    return element("code", { className: ["math-source"] }, [text(source)]);
  }
  try {
    const rendered = katex.renderToString(source, {
      displayMode,
      maxExpand: 1_000,
      maxSize: 100,
      output: "mathml",
      strict: "error",
      throwOnError: true,
      trust: false,
    });
    const root = fromHtml(rendered, { fragment: true }) as Root;
    features.math = true;
    return element(
      displayMode ? "div" : "span",
      { className: [displayMode ? "math-display" : "math-inline"] },
      root.children,
    );
  } catch {
    return element("code", { className: ["math-source"], title: "Invalid math expression" }, [
      text(source),
    ]);
  }
}

function parseColor(value: string): string | null {
  const source = value.trim();
  if (/^#[\da-f]{6}$/i.test(source)) return source.toUpperCase();
  const rgb = source.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) {
      return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    }
  }
  const hsl = source.match(
    /^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i,
  );
  if (!hsl) return null;
  const hue = ((Number(hsl[1]) % 360) + 360) % 360;
  const saturation = Number(hsl[2]) / 100;
  const lightness = Number(hsl[3]) / 100;
  if (saturation > 1 || lightness > 1) return null;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightness - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function replaceColorChip(node: Element): void {
  if (node.tagName !== "code") return;
  const color = parseColor(nodeText(node));
  if (!color) return;
  const chipIndex = node.children.findIndex(
    (child) => isElement(child) && classNames(child).includes("color-border-subtle"),
  );
  if (chipIndex === -1) return;
  node.children[chipIndex] = element("input", {
    ariaLabel: `Color ${nodeText(node).trim()}`,
    className: ["color-swatch"],
    disabled: true,
    type: "color",
    value: color,
  });
}

function normalizeUrl(value: unknown, baseUrl: string, media = false): string | null {
  if (typeof value !== "string" || value.length > 4_096) return null;
  if (!media && value.startsWith("#")) return value;
  try {
    const url = new URL(value, baseUrl);
    if (media) return url.protocol === "https:" ? url.toString() : null;
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeSrcSet(value: unknown, baseUrl: string): string | null {
  if (typeof value !== "string" || value.length > 16_384) return null;
  const candidates: string[] = [];
  for (const candidate of value.split(",")) {
    const [rawUrl, descriptor, ...extra] = candidate.trim().split(/\s+/);
    if (!rawUrl || extra.length > 0) return null;
    const url = normalizeUrl(rawUrl, baseUrl, true);
    if (!url || (descriptor && !/^\d+(?:\.\d+)?[wx]$/.test(descriptor))) return null;
    candidates.push(descriptor ? `${url} ${descriptor}` : url);
  }
  return candidates.join(", ");
}

function transformElement(
  node: Element,
  options: NormalizeOptions,
  features: GitHubHtmlFeatures,
): Element {
  if (node.tagName === "math-renderer") return mathBlock(node, features);
  const enrichmentType = node.properties.dataType;
  if (node.tagName === "section" && typeof enrichmentType === "string") {
    const source = findDataPlain(node) ?? nodeText(node).trim();
    const type = enrichmentType.toLowerCase();
    if (type === "mermaid") return mermaidBlock(source, options.sourceUrl, features);
    if (["geojson", "topojson", "stl"].includes(type)) {
      features.fallbackDiagrams.push(type);
      return diagramFallback(type, source, options.sourceUrl);
    }
  }

  node.children = node.children.map((child) =>
    isElement(child) ? transformElement(child, options, features) : child,
  );
  if (node.tagName === "h1") node.tagName = "h2";
  if (node.tagName === "a") {
    const href = normalizeUrl(node.properties.href, options.baseUrl);
    if (href) node.properties.href = href;
    else delete node.properties.href;
    node.properties.rel = ["nofollow", "noopener", "noreferrer", "ugc"];
    delete node.properties.target;
  }
  if (node.tagName === "img") {
    const src = normalizeUrl(node.properties.src, options.baseUrl, true);
    if (src) node.properties.src = src;
    else delete node.properties.src;
    node.properties.loading = "lazy";
    node.properties.referrerPolicy = "no-referrer";
    delete node.properties.style;
  }
  if (node.tagName === "source") {
    const srcSet = normalizeSrcSet(node.properties.srcSet, options.baseUrl);
    if (srcSet) node.properties.srcSet = srcSet;
    else delete node.properties.srcSet;
  }
  replaceColorChip(node);
  return node;
}

function prefixIdentifiers(root: Root): void {
  const identifiers = new Map<string, string>();
  const collect = (node: RootContent): void => {
    if (!isElement(node)) return;
    for (const property of ["id", "name"] as const) {
      const value = node.properties[property];
      if (typeof value === "string" && value.length <= 512) {
        const prefixed = `issuepages-${value.replace(/^issuepages-/, "")}`;
        identifiers.set(value, prefixed);
        node.properties[property] = prefixed;
      }
    }
    for (const child of node.children) collect(child);
  };
  for (const child of root.children) collect(child);

  const rewrite = (node: RootContent): void => {
    if (!isElement(node)) return;
    const href = node.properties.href;
    if (typeof href === "string" && href.startsWith("#")) {
      const target = identifiers.get(href.slice(1));
      if (target) node.properties.href = `#${target}`;
    }
    for (const property of ["ariaDescribedBy", "ariaLabelledBy"] as const) {
      const value = node.properties[property];
      if (Array.isArray(value)) {
        node.properties[property] = value.map((part) => identifiers.get(String(part)) ?? part);
      }
    }
    for (const child of node.children) rewrite(child);
  };
  for (const child of root.children) rewrite(child);
}

/**
 * Base URL relative links in an issue body resolve against on GitHub: the repository
 * blob root, e.g. `https://github.com/owner/repo/blob/HEAD/`.
 */
export function repositoryBaseUrl(repository: string): string {
  return `https://github.com/${repository}/blob/HEAD/`;
}

export function normalizeGitHubHtml(
  value: string,
  options: NormalizeOptions,
): NormalizedGitHubHtml {
  const root = fromHtml(value, { fragment: true }) as Root;
  const features: GitHubHtmlFeatures = { mermaid: false, math: false, fallbackDiagrams: [] };
  root.children = root.children.map((child) =>
    isElement(child) ? transformElement(child, options, features) : child,
  );
  prefixIdentifiers(root);
  const safe = sanitize(root, githubSchema) as Root;
  return { html: toHtml(safe), features };
}
