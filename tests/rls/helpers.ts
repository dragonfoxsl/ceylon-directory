import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Local Supabase defaults — override via env if needed
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

// These keys are the well-known defaults for `supabase start`.
// Run `npx supabase status` to confirm or override via env.
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Bypasses RLS — for setup/teardown only. */
export const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Unauthenticated public client. */
export const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

type TestUser = {
  client: SupabaseClient;
  userId: string;
  email: string;
  cleanup: () => Promise<void>;
};

/** Auth admin API headers — must include both Authorization and apikey. */
const adminHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
};

async function adminCreateUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const json = await res.json() as { id?: string; message?: string };
  if (!res.ok || !json.id) {
    throw new Error(`Failed to create test user: ${json.message ?? res.statusText}`);
  }
  return json.id;
}

async function adminDeleteUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
}

/**
 * Creates a confirmed test user and returns a client signed in as that user.
 * Call `cleanup()` in afterEach/afterAll to remove the user.
 */
export async function makeUser(suffix?: string): Promise<TestUser> {
  // Always include a UUID so emails are unique across test runs — auth users
  // survive `supabase db reset` (only the public schema is reset).
  const email = `test-${suffix ?? "u"}-${crypto.randomUUID().slice(0, 8)}@ceylontest.test.local`;
  const password = "TestPassword123!";

  const userId = await adminCreateUser(email, password);

  const { data: session, error: signInError } = await createClient(
    SUPABASE_URL,
    ANON_KEY,
    { auth: { persistSession: false } },
  ).auth.signInWithPassword({ email, password });

  if (signInError || !session.session) {
    await adminDeleteUser(userId);
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    },
  });

  return {
    client,
    userId,
    email,
    cleanup: async () => {
      await adminDeleteUser(userId);
    },
  };
}

/** Promotes a user to admin role via the service client. */
export async function makeAdmin(userId: string): Promise<void> {
  await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
}

/** Returns a seed category id (first one from DB). */
export async function seedCategoryId(): Promise<string> {
  // Use anon client — categories are publicly readable; service_role doesn't
  // have the explicit SELECT grant that PostgREST requires.
  const { data } = await anon
    .from("categories")
    .select("id")
    .limit(1)
    .single();
  if (!data) throw new Error("No categories in seed — run supabase/seed.sql");
  return data.id;
}

/** Returns a seed region id (first one from DB). */
export async function seedRegionId(): Promise<string> {
  const { data } = await anon
    .from("regions")
    .select("id")
    .limit(1)
    .single();
  if (!data) throw new Error("No regions in seed — run supabase/seed.sql");
  return data.id;
}

/** Creates a pending listing owned by the given user via the service client. */
export async function insertListing(
  ownerId: string,
  overrides?: Record<string, unknown>,
): Promise<string> {
  const categoryId = await seedCategoryId();
  const regionId = await seedRegionId();

  const { data, error } = await admin
    .from("listings")
    .insert({
      owner_id: ownerId,
      title: `Test listing ${crypto.randomUUID().slice(0, 8)}`,
      slug: `test-${crypto.randomUUID().slice(0, 8)}`,
      description: "Integration test listing",
      category_id: categoryId,
      region_id: regionId,
      status: "pending",
      is_active: false,
      is_featured: false,
      is_sponsored: false,
      ...overrides,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert test listing: ${error?.message}`);
  }
  return data.id;
}
