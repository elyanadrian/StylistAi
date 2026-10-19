import "server-only";

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { STYLIST_FALLBACK, STYLIST_MODEL, StylistAIError, anthropic } from "@/lib/ai/client";
import { OutfitPickSchema } from "@/lib/ai/schemas";
import type { CandidateSet } from "@/lib/outfits/candidates";
import { OCCASIONS, outfitProblems, type OutfitRules } from "@/lib/outfits/rules";
import { CATEGORIES, type Category, type TaggedItem } from "@/lib/wardrobe";
import type { WeatherSummary } from "@/lib/weather/types";

const SYSTEM = `You are a personal stylist choosing one outfit from the user's own wardrobe.

You'll get today's weather, the occasion, and a pre-filtered list of candidate items. Code has already removed items that are wrong for the weather or occasion, so focus on what makes a good outfit: color harmony, pattern mixing (usually at most one bold pattern), consistent formality across pieces, and practicality for the weather.

A complete outfit is a top and a bottom, or a dress, plus exactly one pair of shoes. You may add one outerwear piece, a second top for layering, and up to three accessories when they genuinely help. Use only refs from the candidate list, with the slot matching the item's category.

Write the explanation to the user in a warm, concise voice. Mention the weather when it influenced a choice.`;

export type PickedOutfit = {
  items: { item: TaggedItem; slot: Category }[];
  explanation: string;
  model: string;
};

type PickInput = {
  candidates: CandidateSet;
  rules: OutfitRules;
  weather: WeatherSummary;
  /** Optional free-text from the user, e.g. "outdoor wedding, garden party vibe". */
  note?: string;
};

/** Step 2 of outfit generation: Claude picks from the code-filtered candidates. */
export async function pickOutfit(input: PickInput): Promise<PickedOutfit> {
  const refs = new Map<string, TaggedItem>();
  for (const category of CATEGORIES) {
    for (const item of input.candidates.byCategory[category]) refs.set(`i${refs.size + 1}`, item);
  }

  let feedback: string[] = [];
  // One retry: if the first pick breaks a rule, ask again with the problems listed.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic().beta.messages.parse({
      model: STYLIST_MODEL,
      // Thinking counts toward this cap; hitting it surfaces as a "max_tokens" error below.
      max_tokens: 2000,
      ...STYLIST_FALLBACK,
      // Sonnet 5.5 defaults to "high"; "medium" is plenty to choose among a
      // few dozen pre-filtered items and keeps the button responsive.
      output_config: { effort: "medium", format: betaZodOutputFormat(OutfitPickSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(input, refs, feedback) }],
    });

    if (response.stop_reason === "refusal") {
      throw new StylistAIError("Claude declined to pick an outfit.", "refusal");
    }
    if (response.stop_reason === "max_tokens") {
      throw new StylistAIError("Outfit response was cut off.", "max_tokens");
    }
    const pick = response.parsed_output;
    if (!pick) throw new StylistAIError("Outfit response didn't match the schema.", "invalid_output");

    const problems: string[] = [];
    const chosen: PickedOutfit["items"] = [];
    const seen = new Set<string>();
    for (const { ref, slot } of pick.items) {
      const item = refs.get(ref);
      if (!item) problems.push(`"${ref}" is not a candidate ref`);
      else if (item.category !== slot) problems.push(`${ref} is ${item.category}, not ${slot}`);
      else if (seen.has(ref)) problems.push(`${ref} was chosen twice`);
      else {
        seen.add(ref);
        chosen.push({ item, slot });
      }
    }
    problems.push(...outfitProblems(chosen.map((c) => c.slot), input.rules.outerwear));

    if (problems.length === 0) {
      return { items: chosen, explanation: pick.explanation, model: response.model };
    }
    feedback = problems;
  }

  throw new StylistAIError(`Couldn't build a valid outfit: ${feedback.join("; ")}`, "incomplete_outfit");
}

function buildPrompt(input: PickInput, refs: Map<string, TaggedItem>, feedback: string[]): string {
  const { rules, weather, candidates, note } = input;
  const lines = [
    "<weather>",
    `${weather.description}. ${weather.tempMinC}–${weather.tempMaxC}°C (feels like ${weather.feelsLikeMinC}–${weather.feelsLikeMaxC}°C).`,
    `Chance of precipitation ${weather.precipProbability}%, ${weather.precipMm} mm. Wind up to ${weather.windMaxKph} km/h.`,
    `Outerwear: ${rules.outerwear}.${rules.preferWaterproof ? " Rain likely: prefer waterproof outerwear and shoes." : ""}`,
    "</weather>",
    "",
    `<occasion>${OCCASIONS[rules.occasion].label} (target formality ${rules.targetFormality}/5)${note ? `. User note: ${note}` : ""}</occasion>`,
    "",
    "<candidates>",
    "ref | category | name | subcategory | colors | pattern | formality | warmth | waterproof",
  ];
  for (const [ref, item] of refs) {
    lines.push(
      [ref, item.category, item.name ?? "", item.subcategory ?? "", item.colors.join("/"), item.pattern, item.formality, item.warmth, item.waterproof ? "yes" : "no"].join(" | "),
    );
  }
  lines.push("</candidates>");

  if (candidates.relaxed.length > 0) {
    lines.push("", `Few items fit strictly in: ${candidates.relaxed.join(", ")}. Those candidates are the closest matches, not perfect ones.`);
  }
  if (feedback.length > 0) {
    lines.push("", "A previous pick was rejected for these reasons. Fix them:", ...feedback.map((f) => `- ${f}`));
  }
  return lines.join("\n");
}
