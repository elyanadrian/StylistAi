// Display helpers for wardrobe vocabulary.

import type { Color } from "@/lib/wardrobe";

export const COLOR_SWATCHES: Record<Color, string> = {
  black: "#111111",
  white: "#ffffff",
  gray: "#9ca3af",
  beige: "#e8dcc4",
  brown: "#7b4b2a",
  navy: "#1e2a4a",
  blue: "#2f6fd6",
  light_blue: "#9cc9f0",
  green: "#2f8f4e",
  olive: "#6b6b2f",
  yellow: "#f2cf3b",
  orange: "#f08a24",
  red: "#d23a32",
  burgundy: "#7a1f2b",
  pink: "#f2a7c3",
  purple: "#7a4bb3",
  gold: "#c9a227",
  silver: "#c0c4c8",
  multicolor: "conic-gradient(#d23a32, #f2cf3b, #2f8f4e, #2f6fd6, #7a4bb3, #d23a32)",
};

export const FORMALITY_LABELS = { 1: "Loungewear", 2: "Casual", 3: "Smart casual", 4: "Business", 5: "Formal" } as const;
export const WARMTH_LABELS = { 1: "Very light", 2: "Light", 3: "Mid", 4: "Warm", 5: "Heavy winter" } as const;

/** "light_blue" → "Light blue" */
export function label(value: string): string {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
