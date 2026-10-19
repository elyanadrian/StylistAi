import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";

import { ItemTagsSchema, OutfitPickSchema } from "@/lib/ai/schemas";

const validTags = {
  is_clothing: true,
  name: "Navy wool overcoat",
  category: "outerwear",
  subcategory: "overcoat",
  colors: ["navy"],
  pattern: "solid",
  formality: 4,
  warmth: 4,
  waterproof: false,
};

describe("ItemTagsSchema", () => {
  it("accepts a valid tag set", () => {
    expect(ItemTagsSchema.parse(validTags)).toEqual(validTags);
  });

  it("rejects out-of-scale formality and unknown vocabulary", () => {
    expect(ItemTagsSchema.safeParse({ ...validTags, formality: 6 }).success).toBe(false);
    expect(ItemTagsSchema.safeParse({ ...validTags, warmth: 2.5 }).success).toBe(false);
    expect(ItemTagsSchema.safeParse({ ...validTags, category: "hat" }).success).toBe(false);
    expect(ItemTagsSchema.safeParse({ ...validTags, colors: ["teal"] }).success).toBe(false);
    expect(ItemTagsSchema.safeParse({ ...validTags, colors: [] }).success).toBe(false);
  });
});

// These check that the SDK helper (which imports zod/v4) accepts our schemas
// and produces a JSON schema the structured-outputs API can take.
describe("betaZodOutputFormat", () => {
  it("builds an object JSON schema for item tags with every field required", () => {
    const format = betaZodOutputFormat(ItemTagsSchema);
    expect(format.type).toBe("json_schema");
    const schema = format.schema as { type: string; required: string[]; additionalProperties: boolean };
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(expect.arrayContaining(Object.keys(validTags)));
  });

  it("parses a model reply and rejects one that breaks the zod constraints", () => {
    const format = betaZodOutputFormat(OutfitPickSchema);
    const reply = { items: [{ ref: "i1", slot: "top" }], explanation: "Works." };
    expect(format.parse(JSON.stringify(reply))).toEqual(reply);
    expect(() => format.parse(JSON.stringify({ items: [{ ref: "i1", slot: "hat" }], explanation: "" }))).toThrow();
  });
});
