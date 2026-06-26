import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Batch-fetch cover image public URLs for a set of listing IDs.
 * Returns a map of listing_id → public URL (only present when a cover exists).
 */
export async function fetchCoverUrls(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("listing_images")
    .select("listing_id, storage_path")
    .in("listing_id", listingIds)
    .eq("is_cover", true);

  if (error) {
    console.error("[covers] batch cover query failed:", error);
    return new Map();
  }

  const result = new Map<string, string>();
  for (const row of data ?? []) {
    if (!row.storage_path) continue;
    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(row.storage_path);
    result.set(row.listing_id, urlData.publicUrl);
  }
  return result;
}
