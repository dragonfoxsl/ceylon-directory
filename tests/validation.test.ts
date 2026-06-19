import { describe, it, expect } from "vitest";
import { listingSchema } from "@/lib/validation";

const valid = {
  title: "Galle Fort Walking Tour",
  description: "A two hour guided walk around the historic fort.",
  category_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  region_id: "b1ffc299-9c0b-4ef8-bb6d-6bb9bd380a22",
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
  it("rejects bad website url", () => {
    expect(listingSchema.safeParse({ ...valid, website: "not-a-url" }).success).toBe(false);
  });
  it("accepts empty website", () => {
    expect(listingSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
  });
});
