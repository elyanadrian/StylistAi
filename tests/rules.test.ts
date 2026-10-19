import { describe, expect, it } from "vitest";

import { buildRules, formalityRange, isWet, outfitProblems, warmthRules, widen } from "@/lib/outfits/rules";
import { weather } from "./fixtures";

describe("formalityRange", () => {
  it("allows one step either side of the occasion's target", () => {
    expect(formalityRange("smart_casual")).toEqual({ min: 2, max: 4 });
  });

  it("clamps to the 1–5 scale", () => {
    expect(formalityRange("lounge")).toEqual({ min: 1, max: 2 });
    expect(formalityRange("formal")).toEqual({ min: 4, max: 5 });
  });
});

describe("warmthRules", () => {
  it("hot day: light base layers, no outerwear", () => {
    const r = warmthRules(weather({ feelsLikeMinC: 22, feelsLikeMaxC: 32 }));
    expect(r.baseWarmth).toEqual({ min: 1, max: 2 });
    expect(r.outerwear).toBe("none");
  });

  it("cold morning on a mild day still recommends outerwear", () => {
    const r = warmthRules(weather({ feelsLikeMinC: 10, feelsLikeMaxC: 24 }));
    expect(r.baseWarmth).toEqual({ min: 1, max: 3 });
    expect(r.outerwear).toBe("recommended");
  });

  it("freezing: heavy outerwear required", () => {
    const r = warmthRules(weather({ feelsLikeMinC: -6, feelsLikeMaxC: 1 }));
    expect(r.baseWarmth).toEqual({ min: 3, max: 5 });
    expect(r.outerwear).toBe("required");
    expect(r.outerwearWarmth).toEqual({ min: 4, max: 5 });
  });

  it("rain on a warm day makes a light layer optional", () => {
    const r = warmthRules(weather({ feelsLikeMinC: 21, feelsLikeMaxC: 27, precipProbability: 80 }));
    expect(r.outerwear).toBe("optional");
    expect(r.outerwearWarmth).toEqual({ min: 1, max: 2 });
  });

  it("boundary temperatures fall into the warmer band", () => {
    expect(warmthRules(weather({ feelsLikeMinC: 22, feelsLikeMaxC: 22 })).baseWarmth).toEqual({ min: 1, max: 2 });
    expect(warmthRules(weather({ feelsLikeMinC: 20, feelsLikeMaxC: 20 })).outerwear).toBe("none");
  });
});

describe("isWet", () => {
  it("is true for a high chance of rain or measurable precipitation", () => {
    expect(isWet(weather({ precipProbability: 50 }))).toBe(true);
    expect(isWet(weather({ precipMm: 1.2 }))).toBe(true);
    expect(isWet(weather({ precipProbability: 30, precipMm: 0.2 }))).toBe(false);
  });
});

describe("buildRules", () => {
  it("combines occasion and weather", () => {
    const r = buildRules("office", weather({ precipProbability: 70 }));
    expect(r.targetFormality).toBe(4);
    expect(r.formality).toEqual({ min: 3, max: 5 });
    expect(r.preferWaterproof).toBe(true);
  });
});

describe("widen", () => {
  it("expands and clamps", () => {
    expect(widen({ min: 2, max: 3 })).toEqual({ min: 1, max: 4 });
    expect(widen({ min: 1, max: 5 })).toEqual({ min: 1, max: 5 });
  });
});

describe("outfitProblems", () => {
  it("accepts top + bottom + shoes", () => {
    expect(outfitProblems(["top", "bottom", "shoes"], "optional")).toEqual([]);
  });

  it("accepts a dress with shoes, outerwear and accessories", () => {
    expect(outfitProblems(["dress", "shoes", "outerwear", "accessory", "accessory"], "required")).toEqual([]);
  });

  it("allows two tops for layering but not three", () => {
    expect(outfitProblems(["top", "top", "bottom", "shoes"], "none")).toEqual([]);
    expect(outfitProblems(["top", "top", "top", "bottom", "shoes"], "none")).toContain("at most two tops");
  });

  it("flags missing pieces", () => {
    const problems = outfitProblems(["top"], "required");
    expect(problems).toContain("needs a top and bottom, or a dress");
    expect(problems).toContain("needs exactly one pair of shoes");
    expect(problems).toContain("outerwear is required for this weather");
  });

  it("flags a dress paired with a bottom, and duplicate shoes", () => {
    const problems = outfitProblems(["dress", "bottom", "shoes", "shoes"], "none");
    expect(problems).toContain("a dress shouldn't be paired with a bottom");
    expect(problems).toContain("needs exactly one pair of shoes");
  });
});
