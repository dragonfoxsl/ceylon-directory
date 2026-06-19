import { describe, it, expect } from "vitest";
import { listingSchema } from "@/lib/validation";

const valid = {
  title: "Galle Fort Walking Tour",
  description: "A two hour guided walk around the historic fort.",
  category_id: "11111111-1111-1111-1111-111111111111",
  region_id: "22222222-2222-2222-2222-222222222222",
  contact_email: "guide@example.com",
};

describe("listingSchema", () => {
  it("accepts a valid listing", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects short title", () => {
    expect(listingSchema.safeParse({ ...valid, title: "Hi" }).success).toBe(false);
  });
  it("rejects short description", () => {
    expect(listingSchema.safeParse({ ...valid, description: "too short" }).success).toBe(false);
  });
  it("rejects bad email", () => {
    expect(listingSchema.safeParse({ ...valid, contact_email: "nope" }).success).toBe(false);
  });
  it("requires category and region", () => {
    expect(listingSchema.safeParse({ ...valid, category_id: "" }).success).toBe(false);
  });
});
