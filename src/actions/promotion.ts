"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type PromotionResult = { ok: true } | { ok: false; message: string };

export async function requestPromotion(listingId: string): Promise<PromotionResult> {
  const user = await requireUser();
  const supabase = await createServerClient();

  // Verify ownership
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("owner_id")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    return { ok: false, message: "Listing not found." };
  }
  if (listing.owner_id !== user.id) {
    return { ok: false, message: "Not authorised." };
  }

  // Set promotion_requested_at only — do NOT touch status/is_active/is_featured (RLS compliance)
  const { error } = await supabase
    .from("listings")
    .update({ promotion_requested_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("owner_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/promotions");
  return { ok: true };
}
