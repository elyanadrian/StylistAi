import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/", "/wardrobe", "/a?b=c", "/outfits/123#top", "/a//b", "/a/\\b"])("accepts %j", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each(["//evil.com", "//evil.com/login", "/\\evil.com", "/\\/evil.com"])(
    "rejects protocol-relative %j",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );

  it.each(["https://evil.com", "http://evil.com/x", "javascript:alert(1)", "wardrobe", ""])(
    "rejects non-path %j",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );

  it.each(["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/wardrobe\x00"])(
    "rejects control characters in %j",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );

  it.each([null, undefined, 42, {}, ["/wardrobe"]])("rejects non-string %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});
