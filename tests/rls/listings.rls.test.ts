/**
 * RLS integration tests for the listings table.
 *
 * Requires local Supabase running: `npx supabase start`
 * Run with: `npm run test:integration`
 *
 * Tests spin up real auth users and exercise the DB through the anon key,
 * exactly as the app does at runtime.
 */

import { describe, it, expect, afterAll } from "vitest";
import {
  admin,
  anon,
  makeUser,
  makeAdmin,
  insertListing,
  seedCategoryId,
  seedRegionId,
} from "./helpers";

// ─── Public read ──────────────────────────────────────────────────────────────

describe("public read", () => {
  afterAll(async () => {
    await admin.from("listings").delete().like("title", "Test listing%");
  });

  it("anon sees approved + active listings", async () => {
    const { userId, cleanup } = await makeUser("pub-read");
    const listingId = await insertListing(userId, {
      status: "approved",
      is_active: true,
    });

    const { data } = await anon
      .from("listings")
      .select("id")
      .eq("id", listingId);

    expect(data).toHaveLength(1);
    await cleanup();
  });

  it("anon cannot see pending listings", async () => {
    const { userId, cleanup } = await makeUser("pub-pending");
    const listingId = await insertListing(userId); // pending by default

    const { data } = await anon
      .from("listings")
      .select("id")
      .eq("id", listingId);

    expect(data).toHaveLength(0);
    await cleanup();
  });

  it("anon cannot see inactive approved listings", async () => {
    const { userId, cleanup } = await makeUser("pub-inactive");
    const listingId = await insertListing(userId, {
      status: "approved",
      is_active: false,
    });

    const { data } = await anon
      .from("listings")
      .select("id")
      .eq("id", listingId);

    expect(data).toHaveLength(0);
    await cleanup();
  });
});

// ─── Provider INSERT ──────────────────────────────────────────────────────────

describe("provider INSERT", () => {
  it("provider can insert a pending listing", async () => {
    const { client, userId, cleanup } = await makeUser("ins-ok");
    const categoryId = await seedCategoryId();
    const regionId = await seedRegionId();

    const { data, error } = await client
      .from("listings")
      .insert({
        owner_id: userId,
        title: "Test listing ins-ok",
        slug: `test-ins-ok-${crypto.randomUUID().slice(0, 6)}`,
        description: "ok",
        category_id: categoryId,
        region_id: regionId,
        status: "pending",
        is_active: false,
        is_featured: false,
        is_sponsored: false,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    await cleanup();
  });

  it("provider cannot insert with status=approved", async () => {
    const { client, userId, cleanup } = await makeUser("ins-approve");
    const categoryId = await seedCategoryId();
    const regionId = await seedRegionId();

    const { error } = await client
      .from("listings")
      .insert({
        owner_id: userId,
        title: "Test listing ins-approve",
        slug: `test-ins-approve-${crypto.randomUUID().slice(0, 6)}`,
        description: "should fail",
        category_id: categoryId,
        region_id: regionId,
        status: "approved",
        is_active: true,
        is_featured: false,
        is_sponsored: false,
      });

    expect(error).not.toBeNull();
    await cleanup();
  });

  it("provider cannot insert with is_sponsored=true", async () => {
    const { client, userId, cleanup } = await makeUser("ins-sponsor");
    const categoryId = await seedCategoryId();
    const regionId = await seedRegionId();

    const { error } = await client
      .from("listings")
      .insert({
        owner_id: userId,
        title: "Test listing ins-sponsor",
        slug: `test-ins-sponsor-${crypto.randomUUID().slice(0, 6)}`,
        description: "should fail",
        category_id: categoryId,
        region_id: regionId,
        status: "pending",
        is_active: false,
        is_featured: false,
        is_sponsored: true,
      });

    expect(error).not.toBeNull();
    await cleanup();
  });
});

// ─── Provider UPDATE ──────────────────────────────────────────────────────────

describe("provider UPDATE", () => {
  it("provider can request promotion (only changes promotion_requested_at)", async () => {
    const { client, userId, cleanup } = await makeUser("upd-promo");
    const listingId = await insertListing(userId);

    const { error } = await client
      .from("listings")
      .update({ promotion_requested_at: new Date().toISOString() })
      .eq("id", listingId);

    expect(error).toBeNull();
    await cleanup();
  });

  it("provider can request sponsorship (only changes sponsored_requested_at)", async () => {
    const { client, userId, cleanup } = await makeUser("upd-sponsor-req");
    const listingId = await insertListing(userId);

    const { error } = await client
      .from("listings")
      .update({ sponsored_requested_at: new Date().toISOString() })
      .eq("id", listingId);

    expect(error).toBeNull();
    await cleanup();
  });

  it("provider cannot self-approve (set status=approved)", async () => {
    const { client, userId, cleanup } = await makeUser("upd-self-approve");
    const listingId = await insertListing(userId);

    const { error } = await client
      .from("listings")
      .update({ status: "approved", is_active: true })
      .eq("id", listingId);

    // Either an error or 0 rows updated — both are correct RLS outcomes
    const { data: row } = await admin
      .from("listings")
      .select("status")
      .eq("id", listingId)
      .single();

    expect(row?.status).toBe("pending");
    void error; // may be null (0 rows) or a 403
    await cleanup();
  });

  it("provider cannot self-feature (set is_featured=true)", async () => {
    const { client, userId, cleanup } = await makeUser("upd-self-feature");
    const listingId = await insertListing(userId);

    await client
      .from("listings")
      .update({ is_featured: true, featured_until: "2099-01-01T00:00:00Z" })
      .eq("id", listingId);

    const { data: row } = await admin
      .from("listings")
      .select("is_featured")
      .eq("id", listingId)
      .single();

    expect(row?.is_featured).toBe(false);
    await cleanup();
  });

  it("provider cannot self-sponsor (set is_sponsored=true)", async () => {
    const { client, userId, cleanup } = await makeUser("upd-self-sponsor");
    const listingId = await insertListing(userId);

    await client
      .from("listings")
      .update({ is_sponsored: true, sponsored_until: "2099-01-01T00:00:00Z" })
      .eq("id", listingId);

    const { data: row } = await admin
      .from("listings")
      .select("is_sponsored")
      .eq("id", listingId)
      .single();

    expect(row?.is_sponsored).toBe(false);
    await cleanup();
  });

  it("provider cannot extend an existing sponsored placement", async () => {
    const { client, userId, cleanup } = await makeUser("upd-extend-sponsor");
    // Admin sets is_sponsored=true with a near-future expiry
    const listingId = await insertListing(userId, {
      is_sponsored: true,
      sponsored_until: new Date(Date.now() + 86_400_000).toISOString(), // +1 day
    });

    // Provider tries to extend it further
    await client
      .from("listings")
      .update({
        sponsored_until: "2099-01-01T00:00:00Z",
        sponsored_requested_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    const { data: row } = await admin
      .from("listings")
      .select("sponsored_until")
      .eq("id", listingId)
      .single();

    // sponsored_until must NOT have changed to 2099
    expect(row?.sponsored_until).not.toMatch(/^2099/);
    await cleanup();
  });

  it("provider cannot update another owner's listing", async () => {
    const owner = await makeUser("upd-other-owner");
    const attacker = await makeUser("upd-other-attacker");
    const listingId = await insertListing(owner.userId);

    await attacker.client
      .from("listings")
      .update({ promotion_requested_at: new Date().toISOString() })
      .eq("id", listingId);

    // promotion_requested_at should still be null
    const { data: row } = await admin
      .from("listings")
      .select("promotion_requested_at")
      .eq("id", listingId)
      .single();

    expect(row?.promotion_requested_at).toBeNull();
    await owner.cleanup();
    await attacker.cleanup();
  });
});

// ─── Admin UPDATE ─────────────────────────────────────────────────────────────

describe("admin UPDATE", () => {
  it("admin can approve a listing", async () => {
    const provider = await makeUser("admin-approve-provider");
    const adminUser = await makeUser("admin-approve-admin");
    await makeAdmin(adminUser.userId);

    const listingId = await insertListing(provider.userId);

    const { error } = await adminUser.client
      .from("listings")
      .update({ status: "approved", is_active: true })
      .eq("id", listingId);

    expect(error).toBeNull();

    const { data: row } = await admin
      .from("listings")
      .select("status, is_active")
      .eq("id", listingId)
      .single();

    expect(row?.status).toBe("approved");
    expect(row?.is_active).toBe(true);

    await provider.cleanup();
    await adminUser.cleanup();
  });

  it("admin can set is_sponsored", async () => {
    const provider = await makeUser("admin-sponsor-provider");
    const adminUser = await makeUser("admin-sponsor-admin");
    await makeAdmin(adminUser.userId);

    const listingId = await insertListing(provider.userId);
    const until = "2099-06-01T23:59:59Z";

    const { error } = await adminUser.client
      .from("listings")
      .update({ is_sponsored: true, sponsored_until: until })
      .eq("id", listingId);

    expect(error).toBeNull();

    const { data: row } = await admin
      .from("listings")
      .select("is_sponsored, sponsored_until")
      .eq("id", listingId)
      .single();

    expect(row?.is_sponsored).toBe(true);
    // Postgres may return +00:00 instead of Z; compare as dates
    expect(new Date(row?.sponsored_until!).getTime()).toBe(new Date(until).getTime());

    await provider.cleanup();
    await adminUser.cleanup();
  });
});
