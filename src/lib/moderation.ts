import type { ModerationDecision } from "../types";

interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}

interface ModerationResponse {
  model?: string;
  results?: ModerationResult[];
}

function chunkText(value: string, chunkLength = 8_000): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += chunkLength) {
    chunks.push(value.slice(offset, offset + chunkLength));
  }
  return chunks.length > 0 ? chunks : [""];
}

export async function moderateText(
  apiKey: string,
  title: string,
  body: string,
): Promise<ModerationDecision> {
  if (!apiKey) throw new Error("moderation_not_configured");
  const input = chunkText(`${title ? `Title: ${title}\n\n` : ""}${body}`);
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`moderation_http_${response.status}`);

  const payload = (await response.json()) as ModerationResponse;
  if (!Array.isArray(payload.results) || payload.results.length !== input.length) {
    throw new Error("moderation_invalid_response");
  }
  const categories: Record<string, boolean> = {};
  let flagged = false;
  for (const result of payload.results) {
    flagged ||= result.flagged === true;
    for (const [category, matched] of Object.entries(result.categories ?? {})) {
      categories[category] = categories[category] === true || matched === true;
    }
  }
  return {
    flagged,
    categories,
    model: payload.model ?? "omni-moderation-latest",
  };
}
