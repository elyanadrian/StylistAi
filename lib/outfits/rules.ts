// Pure, deterministic rules that turn weather + occasion into filter bounds.
// These decide what Claude is allowed to choose from, so keep them tested.

import type { Category } from "@/lib/wardrobe";
import type { WeatherSummary } from "@/lib/weather/types";

export type Range = { min: number; max: number };

export const OCCASIONS = {
  lounge: { label: "Lounging at home", formality: 1 },
  workout: { label: "Workout / active", formality: 1 },
  casual: { label: "Casual day out", formality: 2 },
  date: { label: "Date night", formality: 3 },
  smart_casual: { label: "Smart casual", formality: 3 },
  office: { label: "Office", formality: 4 },
  formal: { label: "Formal event", formality: 5 },
} as const satisfies Record<string, { label: string; formality: number }>;

export type Occasion = keyof typeof OCCASIONS;

export type OuterwearNeed = "none" | "optional" | "recommended" | "required";

export type OutfitRules = {
  occasion: Occasion;
  targetFormality: number;
  formality: Range;
  /** Warmth range for tops, bottoms, dresses and shoes. */
  baseWarmth: Range;
  outerwear: OuterwearNeed;
  outerwearWarmth: Range;
  /** Rain is likely: rank waterproof outerwear and shoes first. */
  preferWaterproof: boolean;
};

const clamp = (n: number) => Math.min(5, Math.max(1, n));

export function formalityRange(occasion: Occasion): Range {
  const target = OCCASIONS[occasion].formality;
  return { min: clamp(target - 1), max: clamp(target + 1) };
}

/**
 * Base layers follow the day's average feels-like temperature; outerwear
 * follows the coldest part of the day, so a cold morning still gets a jacket.
 */
export function warmthRules(weather: WeatherSummary): Pick<OutfitRules, "baseWarmth" | "outerwear" | "outerwearWarmth"> {
  const dayTemp = (weather.feelsLikeMinC + weather.feelsLikeMaxC) / 2;
  const coldest = weather.feelsLikeMinC;

  let baseWarmth: Range;
  if (dayTemp >= 22) baseWarmth = { min: 1, max: 2 };
  else if (dayTemp >= 16) baseWarmth = { min: 1, max: 3 };
  else if (dayTemp >= 10) baseWarmth = { min: 2, max: 3 };
  else if (dayTemp >= 3) baseWarmth = { min: 2, max: 4 };
  else baseWarmth = { min: 3, max: 5 };

  let outerwear: OuterwearNeed;
  let outerwearWarmth: Range;
  if (coldest >= 20) [outerwear, outerwearWarmth] = ["none", { min: 1, max: 1 }];
  else if (coldest >= 15) [outerwear, outerwearWarmth] = ["optional", { min: 1, max: 2 }];
  else if (coldest >= 9) [outerwear, outerwearWarmth] = ["recommended", { min: 2, max: 3 }];
  else if (coldest >= 2) [outerwear, outerwearWarmth] = ["required", { min: 3, max: 4 }];
  else [outerwear, outerwearWarmth] = ["required", { min: 4, max: 5 }];

  // Rain or strong wind makes a light layer worth bringing even when it's mild.
  if (outerwear === "none" && (isWet(weather) || weather.windMaxKph >= 30)) {
    outerwear = "optional";
    outerwearWarmth = { min: 1, max: 2 };
  }

  return { baseWarmth, outerwear, outerwearWarmth };
}

export function isWet(weather: WeatherSummary): boolean {
  return weather.precipProbability >= 50 || weather.precipMm >= 1;
}

export function buildRules(occasion: Occasion, weather: WeatherSummary): OutfitRules {
  return {
    occasion,
    targetFormality: OCCASIONS[occasion].formality,
    formality: formalityRange(occasion),
    ...warmthRules(weather),
    preferWaterproof: isWet(weather),
  };
}

export function inRange(value: number, range: Range): boolean {
  return value >= range.min && value <= range.max;
}

export function widen(range: Range, by = 1): Range {
  return { min: clamp(range.min - by), max: clamp(range.max + by) };
}

/**
 * Slots that make a wearable outfit: (top + bottom) or dress, plus shoes, at
 * most one item in each clothing slot, and outerwear when the weather requires it.
 * Returns a list of problems; empty means the outfit is complete.
 */
export function outfitProblems(slots: Category[], outerwear: OuterwearNeed): string[] {
  const count = (c: Category) => slots.filter((s) => s === c).length;
  const problems: string[] = [];

  const hasSeparates = count("top") >= 1 && count("bottom") >= 1;
  const hasDress = count("dress") >= 1;
  if (!hasSeparates && !hasDress) problems.push("needs a top and bottom, or a dress");
  if (hasDress && count("bottom") > 0) problems.push("a dress shouldn't be paired with a bottom");
  if (count("shoes") !== 1) problems.push("needs exactly one pair of shoes");
  for (const c of ["bottom", "dress", "outerwear"] as const) {
    if (count(c) > 1) problems.push(`at most one ${c}`);
  }
  // Two tops is allowed (layering, e.g. shirt under sweater); more isn't.
  if (count("top") > 2) problems.push("at most two tops");
  if (count("accessory") > 3) problems.push("at most three accessories");
  if (outerwear === "required" && count("outerwear") === 0) problems.push("outerwear is required for this weather");

  return problems;
}
