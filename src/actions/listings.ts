"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { listingSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string[]> | null; message?: string };

async function slugExists(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  slug: string,
  ignoreId?: string,
): Promise<boolean> {
  let q = supabase.from("listings").select("id").eq("slug", slug);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.maybeSingle();
  return !!data;
}

function parseFormData(formData: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = typeof value === "string" ? value : "";
  }
  return raw;
}

export async function createListing(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createServerClient();

  const raw = parseFormData(formData);
  const parsed = listingSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    }
    return { ok: false, errors };
  }

  const data = parsed.data;
  const slug = await uniqueSlug(data.title, (s) =>
    slugExists(supabase, s),
  );

  const { data: row, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      title: data.title,
      slug,
      description: data.description,
      category_id: data.category_id,
      region_id: data.region_id,
      price_info: data.price_info || null,
      contact_phone: data.contact_phone || null,
      contact_whatsapp: data.contact_whatsapp || null,
      contact_email: data.contact_email || null,
      website: data.website || null,
      status: "pending",
      is_active: false,
      is_featured: false,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, errors: null, message: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, id: row.id };
}

export async function updateListing(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createServerClient();

  // Ownership check
  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, errors: null, message: "Listing not found." };
  }
  if (existing.owner_id !== user.id) {
    return { ok: false, errors: null, message: "Not authorised." };
  }

  const raw = parseFormData(formData);
  const parsed = listingSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    }
    return { ok: false, errors };
  }

  const data = parsed.data;
  const slug = await uniqueSlug(data.title, (s) =>
    slugExists(supabase, s, id),
  );

  const { error } = await supabase
    .from("listings")
    .update({
      title: data.title,
      slug,
      description: data.description,
      category_id: data.category_id,
      region_id: data.region_id,
      price_info: data.price_info || null,
      contact_phone: data.contact_phone || null,
      contact_whatsapp: data.contact_whatsapp || null,
      contact_email: data.contact_email || null,
      website: data.website || null,
      // Re-review on edit — RLS update policy requires these
      status: "pending",
      is_active: false,
      is_featured: false,
      featured_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, errors: null, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/listing/${slug}`);
  return { ok: true, id };
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createServerClient();

  // Ownership check
  const { data: existing, error: fetchError } = await supabase
    .from("listings")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, errors: null, message: "Listing not found." };
  }
  if (existing.owner_id !== user.id) {
    return { ok: false, errors: null, message: "Not authorised." };
  }

  // Collect storage paths before deleting so we can clean up orphaned objects.
  const { data: imageRows } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", id);

  const { error } = await supabase.from("listings").delete().eq("id", id);

  if (error) {
    return { ok: false, errors: null, message: error.message };
  }

  // Best-effort storage cleanup — if this fails the listing is already gone
  // and the orphaned objects are harmless (public bucket, no PII).
  if (imageRows && imageRows.length > 0) {
    await supabase.storage
      .from("listing-images")
      .remove(imageRows.map((r) => r.storage_path));
  }

  revalidatePath("/dashboard");
  return { ok: true, id };
}
