import type { ModerationMode, SafetyDecision } from "../types";
import { renderMarkdown } from "./markdown";
import { moderateText } from "./moderation";
import { type ContentKind, detectSpam } from "./spam";

export async function checkContentSafety(
  apiKey: string | undefined,
  title: string,
  body: string,
  kind: ContentKind,
  moderation: {
    mode: ModerationMode;
    authorLogin: string;
    ownerLogin: string;
  },
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

  if (moderation.mode === "owner-only") {
    if (moderation.authorLogin.toLowerCase() !== moderation.ownerLogin.toLowerCase()) {
      return {
        publishable: false,
        rendered,
        spamReason: null,
        moderation: null,
        failure: "owner_only_pilot",
      };
    }
    return {
      publishable: true,
      rendered,
      spamReason: null,
      moderation: {
        flagged: false,
        categories: {},
        model: "owner-only-pilot",
      },
      failure: null,
    };
  }

  try {
    const decision = await moderateText(apiKey ?? "", title, rendered.text);
    return {
      publishable: !decision.flagged,
      rendered,
      spamReason: null,
      moderation: decision,
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
