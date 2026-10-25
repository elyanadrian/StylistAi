import { describe, expect, it } from "vitest";

import { parseItemEditForm } from "@/lib/closet/schemas";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

const valid = {
  name: "Navy chinos",
  category: "bottom",
  subcategory: "chinos",
  colors: ["navy", "beige"],
  pattern: "solid",
  formality: "3",
  warmth: "2",
};

describe("parseItemEditForm", () => {
  it("accepts a full form with multiple colors", () => {
    const result = parseItemEditForm(form({ ...valid, waterproof: "on" }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Navy chinos",
      category: "bottom",
      subcategory: "chinos",
      colors: ["navy", "beige"],
      pattern: "solid",
      formality: 3,
      warmth: 2,
      waterproof: true,
    });
  });

  it("treats a blank subcategory as null and an unchecked box as not waterproof", () => {
    const result = parseItemEditForm(form({ ...valid, subcategory: "  " }));
    expect(result.data?.subcategory).toBeNull();
    expect(result.data?.waterproof).toBe(false);
  });

  it("rejects a missing category", () => {
    const fields: Partial<typeof valid> = { ...valid };
    delete fields.category;
    expect(parseItemEditForm(form(fields as Record<string, string | string[]>)).success).toBe(false);
  });

  it.each(["0", "6", "", "2.5"])("rejects formality %j", (formality) => {
    expect(parseItemEditForm(form({ ...valid, formality })).success).toBe(false);
  });

  it("rejects an unknown color", () => {
    expect(parseItemEditForm(form({ ...valid, colors: ["navy", "teal"] })).success).toBe(false);
  });

  it("rejects zero colors", () => {
    expect(parseItemEditForm(form({ ...valid, colors: [] })).success).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(parseItemEditForm(form({ ...valid, name: "   " })).success).toBe(false);
  });
});
