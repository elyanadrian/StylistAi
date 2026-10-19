import "server-only";

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { StylistAIError, TAGGING_MODEL, anthropic } from "@/lib/ai/client";
import { ItemTagsSchema, type ItemTags } from "@/lib/ai/schemas";

const SYSTEM = `You catalogue clothing for a personal wardrobe app. You'll see one photo of a single item the user owns, usually on a hanger, laid flat or worn.

Tag the item itself, ignoring the background, hanger, mannequin and any other garments in frame. If several items are equally prominent, tag the most central one. These tags drive automatic outfit filtering by weather and occasion, so judge formality and warmth for how the item would realistically be worn, not by color alone. A wool blazer is warm-ish and business-formal; a graphic hoodie is casual and mid-warmth.`;

/**
 * Tags one clothing photo with Claude vision.
 * @param imageUrl short-lived signed URL to the image in Supabase Storage
 */
export async function tagItemImage(imageUrl: string): Promise<{ tags: ItemTags; model: string }> {
  const response = await anthropic().beta.messages.parse({
    model: TAGGING_MODEL,
    max_tokens: 8000,
    // No `fallbacks` here: Haiku 5.5 doesn't support server-side fallback.
    // Tagging is a quick perception task; low effort keeps it fast and cheap.
    output_config: { effort: "low", format: betaZodOutputFormat(ItemTagsSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: "Tag this item." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    // No fallback model to rescue this; the item is marked failed and the
    // user can retry or enter tags by hand.
    throw new StylistAIError("Claude declined to tag this image.", "refusal");
  }
  if (response.stop_reason === "max_tokens") {
    throw new StylistAIError("Tagging response was cut off.", "max_tokens");
  }
  const tags = response.parsed_output;
  if (!tags) throw new StylistAIError("Tagging response didn't match the schema.", "invalid_output");
  if (!tags.is_clothing) {
    throw new StylistAIError("This photo doesn't look like a clothing item.", "not_clothing");
  }

  return { tags, model: response.model };
}
