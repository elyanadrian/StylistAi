import { z } from "zod";

import { CATEGORIES, COLORS, PATTERNS } from "@/lib/wardrobe";

const scale = (description: string) => z.number().int().min(1).max(5).describe(description);

export const ItemTagsSchema = z.object({
  is_clothing: z
    .boolean()
    .describe("False if the photo doesn't show a single wearable clothing item, shoe or accessory."),
  name: z.string().describe('Short human-friendly name, e.g. "Navy wool overcoat".'),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe('Specific type, lowercase, e.g. "t-shirt", "chinos", "ankle boots".'),
  colors: z
    .array(z.enum(COLORS))
    .min(1)
    .max(4)
    .describe("Visible colors, dominant first. Use multicolor only when no color dominates."),
  pattern: z.enum(PATTERNS),
  formality: scale("1 loungewear, 2 casual, 3 smart casual, 4 business, 5 formal / black-tie."),
  warmth: scale("1 very light (linen tee, sandals), 3 mid (sweater, jeans), 5 heavy winter (parka, snow boots)."),
  waterproof: z.boolean().describe("True only for clearly water-resistant items: rain jackets, rubber or leather boots."),
});

export type ItemTags = z.infer<typeof ItemTagsSchema>;

export const OutfitPickSchema = z.object({
  items: z
    .array(
      z.object({
        ref: z.string().describe('Candidate ref exactly as given, e.g. "i3".'),
        slot: z.enum(CATEGORIES),
      }),
    )
    .describe("The chosen items, one entry per item."),
  explanation: z
    .string()
    .describe("2–4 sentences to the user on why this outfit works for the occasion and today's weather."),
});

export type OutfitPick = z.infer<typeof OutfitPickSchema>;
