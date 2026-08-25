export type EmbedTheme = "auto" | "inherit" | "light" | "dark";
export type EmbedDensity = "compact" | "comfortable";
export type EmbedVariant = "folio" | "minimal";

export interface EmbedOptions {
  theme: EmbedTheme;
  density: EmbedDensity;
  accent: string;
  channel: string;
  label: string;
  author: string;
  variant: EmbedVariant;
}

interface FilterableIssue {
  author: { login: string };
  labels: Array<{ name: string }>;
}

const DEFAULT_ACCENT = "#d3aa36";

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export function parseEmbedOptions(query: (name: string) => string | undefined): EmbedOptions {
  const theme = query("theme");
  const density = query("density");
  const accent = query("accent");
  const channel = query("channel");
  const rawLabel = query("label")?.normalize("NFKC").trim() ?? "";
  const rawAuthor = query("author")?.normalize("NFKC").trim() ?? "";
  const variant = query("variant");
  return {
    theme: theme === "inherit" || theme === "light" || theme === "dark" ? theme : "auto",
    density: density === "compact" ? density : "comfortable",
    accent: accent && /^#[\da-f]{6}$/i.test(accent) ? accent.toLowerCase() : DEFAULT_ACCENT,
    channel: channel && /^[\w-]{1,80}$/.test(channel) ? channel : "",
    label: rawLabel.length <= 50 && !hasControlCharacters(rawLabel) ? rawLabel : "",
    author: /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(rawAuthor) ? rawAuthor : "",
    variant: variant === "minimal" ? "minimal" : "folio",
  };
}

export function embedQuery(
  options: EmbedOptions,
  extra: Record<string, string | null | undefined> = {},
): string {
  const params = new URLSearchParams({
    theme: options.theme,
    density: options.density,
  });
  if (options.accent !== DEFAULT_ACCENT) params.set("accent", options.accent);
  if (options.channel) params.set("channel", options.channel);
  if (options.label) params.set("label", options.label);
  if (options.author) params.set("author", options.author);
  if (options.variant === "minimal") params.set("variant", options.variant);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function issueMatchesEmbedFilters(
  issue: FilterableIssue,
  options: Pick<EmbedOptions, "author" | "label">,
): boolean {
  const authorMatches =
    !options.author || issue.author.login.toLowerCase() === options.author.toLowerCase();
  const normalizedLabel = options.label.normalize("NFKC").toLowerCase();
  const labelMatches =
    !normalizedLabel ||
    issue.labels.some((label) => label.name.normalize("NFKC").toLowerCase() === normalizedLabel);
  return authorMatches && labelMatches;
}
