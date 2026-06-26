"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ModerationResult = { ok: true } | { ok: false; message: string };

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/sponsorships");
  revalidatePath("/listings");
}

export async function approveListing(id: string): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "approved", is_active: true, admin_note: null })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function rejectListing(
  id: string,
  note: string,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "rejected", is_active: false, admin_note: note || null })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function setActive(
  id: string,
  active: boolean,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update({ is_active: active })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function setFeatured(
  id: string,
  until: string | null,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update(
      until !== null
        ? {
            is_featured: true,
            featured_until: until,
            promotion_requested_at: null,
          }
        : {
            is_featured: false,
            featured_until: null,
          },
    )
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function setSponsored(
  id: string,
  until: string | null,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update(
      until !== null
        ? { is_sponsored: true, sponsored_until: until, sponsored_requested_at: null }
        : { is_sponsored: false, sponsored_until: null },
    )
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function clearPromotionRequest(
  id: string,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update({ promotion_requested_at: null })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}

export async function clearSponsorshipRequest(
  id: string,
): Promise<ModerationResult> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("listings")
    .update({ sponsored_requested_at: null })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidateAdminPaths();
  return { ok: true };
}
