import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/ListingForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createServerClient();

  // Fetch listing — enforce ownership
  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, category_id, region_id, price_info, contact_phone, contact_whatsapp, contact_email, website, owner_id, status",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const [{ data: categories }, { data: regions }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order", { ascending: true }),
    supabase
      .from("regions")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-teal-700 transition-colors">
          My Listings
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs inline-block align-bottom">
          {listing.title}
        </span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        Edit listing
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Update your listing details below.
      </p>

      {/* Re-review notice */}
      <div className="mb-8 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        <span className="font-semibold">Note:</span> Editing sends this listing back for re-review.
        It will be hidden from the public until approved again.
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ListingForm
          listing={listing}
          categories={categories ?? []}
          regions={regions ?? []}
        />
      </div>
    </div>
  );
}
