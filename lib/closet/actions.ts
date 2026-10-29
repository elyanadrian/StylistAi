"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { StylistAIError } from "@/lib/ai/client";
import { tagItemImage, type ItemImage } from "@/lib/ai/tag-item";
import { parseItemEditForm } from "@/lib/closet/schemas";
import { WARDROBE_BUCKET } from "@/lib/supabase/env";
import { createClient, getUserId } from "@/lib/supabase/server";

const ItemId = z.uuid();
const MEDIA_TYPES: ItemImage["mediaType"][] = ["image/jpeg", "image/png", "image/webp"];

/** Records a photo the browser already uploaded to `{userId}/{uuid}.jpg`. */
export async function createItem(imagePath: string): Promise<{ id?: string; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { error: "You're signed out." };

  // Storage RLS and the items_image_path_owner constraint enforce the folder too; this
  // also pins the file name format.
  const expected = new RegExp(`^${userId}/[0-9a-f-]{36}\\.jpg$`);
  if (!expected.test(imagePath)) return { error: "Invalid image path." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("items").insert({ image_path: imagePath }).select("id").single();
  if (error) return { error: "Couldn't save the item." };

  refresh();
  return { id: data.id };
}

/**
 * Tags an item with Claude. Every write is filtered on `user_edited = false` so
 * tagging never overwrites (or un-tags) an item the user has fixed by hand.
 */
export async function tagItem(itemId: string): Promise<{ error?: string }> {
  const userId = await getUserId();
  if (!userId) return { error: "You're signed out." };
  if (!ItemId.safeParse(itemId).success) return { error: "Item not found." };

  const supabase = await createClient();
  const items = () => supabase.from("items");

  const { data: item } = await items()
    .update({ tag_status: "pending" })
    .eq("id", itemId)
    .eq("user_edited", false)
    .select("image_path")
    .maybeSingle();
  if (!item) return { error: "Item not found." };

  let result: { error?: string } = {};
  try {
    const { data: blob, error } = await supabase.storage.from(WARDROBE_BUCKET).download(item.image_path);
    if (error || !blob) throw new Error("Couldn't read the image.");

    const mediaType = MEDIA_TYPES.find((t) => t === blob.type) ?? "image/jpeg";
    const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const { tags, model } = await tagItemImage({ data, mediaType });

    await items()
      .update({
        name: tags.name,
        category: tags.category,
        subcategory: tags.subcategory,
        colors: tags.colors,
        pattern: tags.pattern,
        formality: tags.formality,
        warmth: tags.warmth,
        waterproof: tags.waterproof,
        ai_tags: { ...tags, model },
        tag_status: "tagged",
      })
      .eq("id", itemId)
      .eq("user_edited", false);
  } catch (err) {
    const reason = err instanceof StylistAIError ? err.reason : "unknown";
    if (!(err instanceof StylistAIError)) console.error("Tagging failed", err);
    await items()
      .update({ tag_status: "failed", ai_tags: { error: reason } })
      .eq("id", itemId)
      .eq("user_edited", false);
    result = { error: "Tagging failed." };
  }

  refresh();
  return result;
}

export type ItemEditState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

/** Saves hand-entered tags and marks the item as user-edited. */
export async function updateItemTags(itemId: string, _prev: ItemEditState, formData: FormData): Promise<ItemEditState> {
  const userId = await getUserId();
  if (!userId) return { error: "You're signed out." };
  if (!ItemId.safeParse(itemId).success) return { error: "Item not found." };

  const parsed = parseItemEditForm(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update({ ...parsed.data, user_edited: true, tag_status: "tagged" })
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save your changes." };

  refresh();
  return { ok: true };
}
