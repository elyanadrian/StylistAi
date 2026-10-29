import { describe, expect, it } from "vitest";

import { daysBefore, selectCandidates } from "@/lib/outfits/candidates";
import { buildRules } from "@/lib/outfits/rules";
import { item, weather } from "./fixtures";

// Mild day (base warmth 2–3, outerwear recommended 2–3), smart casual (formality 2–4).
const mildRules = buildRules("smart_casual", weather({ feelsLikeMinC: 12, feelsLikeMaxC: 18 }));

function basicWardrobe() {
  return [
    item({ id: "top-ok", category: "top", formality: 3, warmth: 2 }),
    item({ id: "top-too-formal", category: "top", formality: 5, warmth: 2 }),
    item({ id: "top-too-warm", category: "top", formality: 3, warmth: 5 }),
    item({ id: "bottom-ok", category: "bottom", formality: 3, warmth: 3 }),
    item({ id: "shoes-ok", category: "shoes", formality: 3, warmth: 2 }),
    item({ id: "coat-ok", category: "outerwear", formality: 3, warmth: 3 }),
    item({ id: "scarf", category: "accessory", formality: 3, warmth: 5 }),
  ];
}

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("selectCandidates", () => {
  it("keeps only items within formality and warmth bounds", () => {
    const set = selectCandidates(basicWardrobe(), mildRules);
    expect(ids(set.byCategory.top)).toEqual(["top-ok"]);
    expect(ids(set.byCategory.outerwear)).toEqual(["coat-ok"]);
    expect(set.relaxed).toEqual([]);
    expect(set.feasible).toBe(true);
  });

  it("ignores warmth for accessories", () => {
    const set = selectCandidates(basicWardrobe(), mildRules);
    expect(ids(set.byCategory.accessory)).toEqual(["scarf"]);
  });

  it("skips archived, untagged and failed items", () => {
    const set = selectCandidates(
      [
        ...basicWardrobe(),
        item({ id: "archived", category: "top", formality: 3, warmth: 2, archived_at: "2026-10-01T00:00:00Z" }),
        item({ id: "pending", category: "top", formality: 3, warmth: 2, tag_status: "pending" }),
        item({ id: "failed", category: "top", formality: null, warmth: null, tag_status: "failed" }),
      ],
      mildRules,
    );
    expect(ids(set.byCategory.top)).toEqual(["top-ok"]);
  });

  it("drops outerwear entirely when the weather doesn't call for it", () => {
    const hot = buildRules("casual", weather({ feelsLikeMinC: 24, feelsLikeMaxC: 32 }));
    const set = selectCandidates(basicWardrobe(), hot);
    expect(set.byCategory.outerwear).toEqual([]);
  });

  it("relaxes bounds when nothing in a category fits strictly, and reports it", () => {
    const wardrobe = basicWardrobe().filter((i) => i.id !== "top-ok");
    const set = selectCandidates(wardrobe, mildRules);
    // Warmth widened to 1–4 isn't enough for the warmth-5 top, but formality
    // widened to 1–5 admits the formality-5 one.
    expect(ids(set.byCategory.top)).toEqual(["top-too-formal"]);
    expect(set.relaxed).toEqual(["top"]);
  });

  it("skips recently worn items unless nothing else fits", () => {
    const wardrobe = [
      ...basicWardrobe(),
      item({ id: "top-ok-2", category: "top", formality: 3, warmth: 3 }),
    ];
    const lastWorn = new Map([
      ["top-ok", "2026-10-18"],
      ["shoes-ok", "2026-10-18"],
    ]);
    const set = selectCandidates(wardrobe, mildRules, { lastWorn, wornSince: "2026-10-16" });
    expect(ids(set.byCategory.top)).toEqual(["top-ok-2"]);
    // The only shoes were worn recently, so they come back as a last resort.
    expect(ids(set.byCategory.shoes)).toEqual(["shoes-ok"]);
    expect(set.relaxed).toContain("shoes");
  });

  it("ranks waterproof shoes first when rain is likely", () => {
    const rainy = buildRules("smart_casual", weather({ feelsLikeMinC: 12, feelsLikeMaxC: 18, precipProbability: 90 }));
    const set = selectCandidates(
      [
        item({ id: "canvas", category: "shoes", formality: 3, warmth: 2 }),
        item({ id: "boots", category: "shoes", formality: 3, warmth: 3, waterproof: true }),
      ],
      rainy,
    );
    expect(ids(set.byCategory.shoes)).toEqual(["boots", "canvas"]);
  });

  it("breaks score ties by least recently worn", () => {
    const set = selectCandidates(
      [
        item({ id: "a", category: "top", formality: 3, warmth: 2 }),
        item({ id: "b", category: "top", formality: 3, warmth: 2 }),
      ],
      mildRules,
      { lastWorn: new Map([["a", "2026-10-10"]]) },
    );
    expect(ids(set.byCategory.top)).toEqual(["b", "a"]);
  });

  it("caps each category", () => {
    const many = Array.from({ length: 20 }, (_, n) => item({ id: `t${n}`, category: "top", formality: 3, warmth: 2 }));
    const set = selectCandidates(many, mildRules, { maxPerCategory: 5 });
    expect(set.byCategory.top).toHaveLength(5);
  });

  it("reports infeasible wardrobes", () => {
    const set = selectCandidates([item({ category: "top", formality: 3, warmth: 2 })], mildRules);
    expect(set.feasible).toBe(false);
    expect(set.missing).toEqual(["a top and bottom, or a dress", "shoes"]);
  });

  it("accepts a dress in place of top + bottom", () => {
    const set = selectCandidates(
      [
        item({ category: "dress", formality: 3, warmth: 2 }),
        item({ category: "shoes", formality: 3, warmth: 2 }),
      ],
      mildRules,
    );
    expect(set.feasible).toBe(true);
  });

  it("requires outerwear when the weather demands it", () => {
    const cold = buildRules("casual", weather({ feelsLikeMinC: -5, feelsLikeMaxC: 2 }));
    const set = selectCandidates(
      [
        item({ category: "top", formality: 2, warmth: 4 }),
        item({ category: "bottom", formality: 2, warmth: 4 }),
        item({ category: "shoes", formality: 2, warmth: 4 }),
      ],
      cold,
    );
    expect(set.feasible).toBe(false);
    expect(set.missing).toEqual(["outerwear warm enough for today"]);
  });
});

describe("daysBefore", () => {
  it("subtracts days across month boundaries", () => {
    expect(daysBefore("2026-10-02", 3)).toBe("2026-09-29");
  });
});
