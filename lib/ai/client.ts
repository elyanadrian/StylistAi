import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Why these models:
// - Tagging runs once per uploaded photo and is a narrow perception and
//   extraction task with a fixed schema. Haiku 5.5 is the fast, low-cost model
//   for high-volume classification/extraction, and it supports image input.
//   Uploading a whole wardrobe can mean hundreds of calls, so cost and latency
//   matter more than depth of reasoning here.
// - Picking an outfit is a judgment call (color harmony, pattern mixing,
//   formality, weather) plus a user-facing explanation. Sonnet 5.5 is the
//   speed/intelligence middle ground: better taste and writing than Haiku,
//   fast enough for an interactive "generate" button, and cheaper than Opus.
export const TAGGING_MODEL = "claude-haiku-5-5";
export const STYLIST_MODEL = "claude-sonnet-5-5";

// Server-side refusal fallback, for STYLIST_MODEL only. If a safety classifier
// declines a request, the API reruns it on Anthropic's recommended fallback
// model inside the same call. On Sonnet 5.5 this works on the Claude API only,
// in the "default" form, and retries only "cyber" / "frontier_llm" declines.
// Haiku 5.5 has no server-side fallback (a declined request stays declined),
// so tagging requests must not send this; they handle `refusal` themselves.
export const STYLIST_FALLBACK: {
  betas: Anthropic.Beta.AnthropicBeta[];
  fallbacks: Anthropic.Beta.Messages.BetaFallbacksParam;
} = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | undefined;

/** Lazily created so importing this module never requires credentials (e.g. during build). */
export function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export class StylistAIError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "max_tokens" | "invalid_output" | "not_clothing" | "incomplete_outfit",
  ) {
    super(message);
    this.name = "StylistAIError";
  }
}
