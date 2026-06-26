import { describe, it, expect } from "vitest";
import { isLive, isCurrentlyFeatured, sortListings } from "@/lib/featured";

const base = { status: "approved", is_active: true, is_featured: false,
  featured_until: null, is_sponsored: false, sponsored_until: null,
  created_at: "2026-01-01T00:00:00Z" } as const;

describe("isLive", () => {
  it("true when approved + active", () => expect(isLive({ ...base })).toBe(true));
  it("false when pending", () => expect(isLive({ ...base, status: "pending" })).toBe(false));
  it("false when inactive", () => expect(isLive({ ...base, is_active: false })).toBe(false));
});

describe("isCurrentlyFeatured", () => {
  const now = new Date("2026-06-19T00:00:00Z");
  it("true when featured and not expired", () =>
    expect(isCurrentlyFeatured({ ...base, is_featured: true, featured_until: "2026-07-01T00:00:00Z" }, now)).toBe(true));
  it("false when expired", () =>
    expect(isCurrentlyFeatured({ ...base, is_featured: true, featured_until: "2026-06-01T00:00:00Z" }, now)).toBe(false));
  it("false when not featured", () =>
    expect(isCurrentlyFeatured({ ...base }, now)).toBe(false));
});

describe("sortListings", () => {
  it("puts current featured first, then newest", () => {
    const now = new Date("2026-06-19T00:00:00Z");
    const a = { ...base, id: "a", created_at: "2026-02-01T00:00:00Z" };
    const b = { ...base, id: "b", is_featured: true, featured_until: "2026-07-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" };
    const c = { ...base, id: "c", created_at: "2026-03-01T00:00:00Z" };
    expect(sortListings([a, b, c], now).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});
