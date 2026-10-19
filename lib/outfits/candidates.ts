// Step 1 of outfit generation: narrow the wardrobe with code before Claude sees it.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { CATEGORIES, isTagged, type Category, type Item, type TaggedItem } from "@/lib/wardrobe";
import { inRange, widen, type OutfitRules, type Range } from "@/lib/outfits/rules";

export const MAX_PER_CATEGORY = 12;
export const RECENTLY_WORN_DAYS = 3;

export type CandidateSet = {
  byCategory: Record<Category, TaggedItem[]>;
  /** Categories where nothing matched strictly and the bounds were widened. */
  relaxed: Category[];
  /** Whether a complete outfit can be built from the candidates at all. */
  feasible: boolean;
  missing: string[];
};

type Options = {
  /** item id → last date worn (YYYY-MM-DD). */
  lastWorn?: Map<string, string>;
  /** Items worn on or after this date are skipped unless nothing else fits. */
  wornSince?: string;
  maxPerCategory?: number;
};

const WARMTH_SCOPED: ReadonlySet<Category> = new Set(["top", "bottom", "dress", "shoes"]);

function warmthRangeFor(category: Category, rules: OutfitRules): Range | null {
  if (category === "outerwear") return rules.outerwearWarmth;
  if (WARMTH_SCOPED.has(category)) return rules.baseWarmth;
  return null; // accessories: formality only
}

function matches(item: TaggedItem, formality: Range, warmth: Range | null): boolean {
  return inRange(item.formality, formality) && (warmth === null || inRange(item.warmth, warmth));
}

/** Lower is better: close to target formality, middle of the warmth band, waterproof when wet. */
function score(item: TaggedItem, rules: OutfitRules): number {
  const warmth = warmthRangeFor(item.category, rules);
  let s = Math.abs(item.formality - rules.targetFormality);
  if (warmth) s += Math.abs(item.warmth - (warmth.min + warmth.max) / 2);
  if (rules.preferWaterproof && (item.category === "outerwear" || item.category === "shoes") && item.waterproof) {
    s -= 1;
  }
  return s;
}

export function selectCandidates(items: Item[], rules: OutfitRules, options: Options = {}): CandidateSet {
  const { lastWorn = new Map(), wornSince, maxPerCategory = MAX_PER_CATEGORY } = options;
  const active = items.filter((i) => i.archived_at === null).filter(isTagged);

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, [] as TaggedItem[]])) as Record<Category, TaggedItem[]>;
  const relaxed: Category[] = [];

  for (const category of CATEGORIES) {
    if (category === "outerwear" && rules.outerwear === "none") continue;

    const pool = active.filter((i) => i.category === category);
    const fresh = wornSince ? pool.filter((i) => (lastWorn.get(i.id) ?? "") < wornSince) : pool;
    const warmth = warmthRangeFor(category, rules);

    // Strict bounds first; if nothing fits, widen warmth, then formality, then
    // allow recently worn items. Claude is told which categories were relaxed.
    const attempts: Array<[TaggedItem[], Range, Range | null]> = [
      [fresh, rules.formality, warmth],
      [fresh, rules.formality, warmth && widen(warmth)],
      [fresh, widen(rules.formality), warmth && widen(warmth)],
      [pool, widen(rules.formality), warmth && widen(warmth)],
    ];

    let picked: TaggedItem[] = [];
    for (const [index, [source, f, w]] of attempts.entries()) {
      picked = source.filter((i) => matches(i, f, w));
      if (picked.length > 0) {
        if (index > 0) relaxed.push(category);
        break;
      }
    }

    byCategory[category] = picked
      .map((item) => ({ item, s: score(item, rules), worn: lastWorn.get(item.id) ?? "" }))
      // Best score first; ties go to the item worn least recently.
      .sort((a, b) => a.s - b.s || a.worn.localeCompare(b.worn) || a.item.id.localeCompare(b.item.id))
      .slice(0, maxPerCategory)
      .map(({ item }) => item);
  }

  const missing: string[] = [];
  const has = (c: Category) => byCategory[c].length > 0;
  if (!(has("top") && has("bottom")) && !has("dress")) missing.push("a top and bottom, or a dress");
  if (!has("shoes")) missing.push("shoes");
  if (rules.outerwear === "required" && !has("outerwear")) missing.push("outerwear warm enough for today");

  return { byCategory, relaxed, feasible: missing.length === 0, missing };
}

type Supabase = SupabaseClient<Database>;

/** Loads the signed-in user's wardrobe and recent wear history, then filters it. */
export async function fetchCandidates(supabase: Supabase, rules: OutfitRules, today: string): Promise<CandidateSet> {
  const [{ data: items, error: itemsError }, { data: worn, error: wornError }] = await Promise.all([
    supabase.from("items").select("*").is("archived_at", null).eq("tag_status", "tagged"),
    // Wear history only matters for recency, so a 30-day window is enough.
    supabase
      .from("outfit_items")
      .select("item_id, outfits!inner(worn_on)")
      .gte("outfits.worn_on", daysBefore(today, 30)),
  ]);
  if (itemsError) throw itemsError;
  if (wornError) throw wornError;

  const lastWorn = new Map<string, string>();
  for (const row of worn ?? []) {
    const wornOn = (row.outfits as { worn_on: string | null } | null)?.worn_on;
    if (wornOn && wornOn > (lastWorn.get(row.item_id) ?? "")) lastWorn.set(row.item_id, wornOn);
  }

  return selectCandidates(items ?? [], rules, { lastWorn, wornSince: daysBefore(today, RECENTLY_WORN_DAYS) });
}

export function daysBefore(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
