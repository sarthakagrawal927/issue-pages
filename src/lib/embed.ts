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

const DEFAULT_ACCENT = "#9d2f2a";

function relativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((value) => {
    const channel = Number.parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function embedAccentForeground(accent: string): "#000000" | "#ffffff" {
  if (!/^#[\da-f]{6}$/i.test(accent)) return "#ffffff";
  const accentLuminance = relativeLuminance(accent);
  const whiteContrast = 1.05 / (accentLuminance + 0.05);
  const blackContrast = (accentLuminance + 0.05) / 0.05;
  return blackContrast > whiteContrast ? "#000000" : "#ffffff";
}

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
