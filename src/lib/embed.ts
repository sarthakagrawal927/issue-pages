export type EmbedTheme = "auto" | "light" | "dark";
export type EmbedDensity = "compact" | "comfortable";

export interface EmbedOptions {
  theme: EmbedTheme;
  density: EmbedDensity;
  accent: string;
  channel: string;
}

const DEFAULT_ACCENT = "#d3aa36";

export function parseEmbedOptions(query: (name: string) => string | undefined): EmbedOptions {
  const theme = query("theme");
  const density = query("density");
  const accent = query("accent");
  const channel = query("channel");
  return {
    theme: theme === "light" || theme === "dark" ? theme : "auto",
    density: density === "compact" ? density : "comfortable",
    accent: accent && /^#[\da-f]{6}$/i.test(accent) ? accent.toLowerCase() : DEFAULT_ACCENT,
    channel: channel && /^[\w-]{1,80}$/.test(channel) ? channel : "",
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
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
