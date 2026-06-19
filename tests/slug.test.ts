import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Galle Fort Tour")).toBe("galle-fort-tour");
  });
  it("strips punctuation and collapses spaces", () => {
    expect(slugify("Surf  Lessons!! @ Mirissa")).toBe("surf-lessons-mirissa");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("--Hello--")).toBe("hello");
  });
});

describe("uniqueSlug", () => {
  it("returns base when unused", async () => {
    expect(await uniqueSlug("tuk-tuk", async () => false)).toBe("tuk-tuk");
  });
  it("appends counter when taken", async () => {
    const taken = new Set(["tuk-tuk", "tuk-tuk-2"]);
    expect(await uniqueSlug("tuk-tuk", async (s) => taken.has(s))).toBe("tuk-tuk-3");
  });
});
