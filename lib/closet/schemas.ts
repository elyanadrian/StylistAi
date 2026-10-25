import { z } from "zod";

import { ItemTagsSchema } from "@/lib/ai/schemas";

const level = z.coerce.number().int().min(1, "Pick 1–5.").max(5, "Pick 1–5.");

/** Tags a user can set by hand. Same vocabulary as the AI tags, minus the clothing check. */
export const ItemEditSchema = ItemTagsSchema.omit({ is_clothing: true }).extend({
  name: z.string().trim().min(1, "Give the item a name.").max(80),
  subcategory: z
    .string()
    .trim()
    .max(40)
    .transform((s) => s || null),
  colors: ItemTagsSchema.shape.colors.min(1, "Pick at least one color."),
  formality: level,
  warmth: level,
});

export type ItemEdit = z.infer<typeof ItemEditSchema>;

/** Parses the closet edit form. Colors arrive as repeated `colors` checkbox values. */
export function parseItemEditForm(formData: FormData) {
  return ItemEditSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category"),
    subcategory: formData.get("subcategory") ?? "",
    colors: formData.getAll("colors"),
    pattern: formData.get("pattern"),
    formality: formData.get("formality"),
    warmth: formData.get("warmth"),
    waterproof: formData.get("waterproof") === "on",
  });
}
