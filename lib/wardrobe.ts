// Shared wardrobe vocabulary. These lists mirror the check constraints in
// supabase/migrations/*_init.sql; change both together.

import type { Tables } from "@/lib/database.types";

export const CATEGORIES = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PATTERNS = ["solid", "striped", "plaid", "floral", "graphic", "polka_dot", "animal", "other"] as const;
export type Pattern = (typeof PATTERNS)[number];

// Normalized palette so filtering and prompts don't deal with "navy" vs "dark blue".
export const COLORS = [
  "black", "white", "gray", "beige", "brown", "navy", "blue", "light_blue", "green", "olive",
  "yellow", "orange", "red", "burgundy", "pink", "purple", "gold", "silver", "multicolor",
] as const;
export type Color = (typeof COLORS)[number];

/** 1 = loungewear, 2 = casual, 3 = smart casual, 4 = business, 5 = formal / black-tie. */
export type Formality = 1 | 2 | 3 | 4 | 5;
/** 1 = very light (linen tee), 3 = mid (sweater), 5 = heavy winter (parka). */
export type Warmth = 1 | 2 | 3 | 4 | 5;

export type Item = Tables<"items">;

/** An item that has finished tagging, so every filter attribute is present. */
export type TaggedItem = Item & {
  tag_status: "tagged";
  category: Category;
  pattern: Pattern;
  formality: number;
  warmth: number;
};

export function isTagged(item: Item): item is TaggedItem {
  return (
    item.tag_status === "tagged" &&
    item.category !== null &&
    item.pattern !== null &&
    item.formality !== null &&
    item.warmth !== null
  );
}
