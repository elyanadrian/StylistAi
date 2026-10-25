import "server-only";

import { redirect } from "next/navigation";

import { WARDROBE_BUCKET } from "@/lib/supabase/env";
import { createClient, getUserId } from "@/lib/supabase/server";
import type { Item } from "@/lib/wardrobe";

export type ClosetItem = Item & { imageUrl: string | null };

/** The signed-in user's active items, newest first, with short-lived image URLs. */
export async function listItems(): Promise<ClosetItem[]> {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/closet");

  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (items.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from(WARDROBE_BUCKET)
    .createSignedUrls(items.map((i) => i.image_path), 60 * 60);
  const urls = new Map(signed?.map((s) => [s.path, s.signedUrl]));

  return items.map((item) => ({ ...item, imageUrl: urls.get(item.image_path) ?? null }));
}
