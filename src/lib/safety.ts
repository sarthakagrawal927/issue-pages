import type { SafetyDecision } from "../types";
import { renderMarkdown } from "./markdown";
import { moderateText } from "./moderation";
import { type ContentKind, detectSpam } from "./spam";

export async function checkContentSafety(
  apiKey: string,
  title: string,
  body: string,
  kind: ContentKind,
): Promise<SafetyDecision> {
  const rendered = renderMarkdown(body);
  const spamReason = detectSpam(title, body, kind);
  if (spamReason) {
    return {
      publishable: false,
      rendered,
      spamReason,
      moderation: null,
      failure: null,
    };
  }

  try {
    const moderation = await moderateText(apiKey, title, rendered.text);
    return {
      publishable: !moderation.flagged,
      rendered,
      spamReason: null,
      moderation,
      failure: null,
    };
  } catch (error) {
    return {
      publishable: false,
      rendered,
      spamReason: null,
      moderation: null,
      failure: error instanceof Error ? error.message : "moderation_failed",
    };
  }
}
