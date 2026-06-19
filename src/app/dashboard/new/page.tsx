import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/ListingForm";
import Link from "next/link";

export default async function NewListingPage() {
  await requireUser();
  const supabase = await createServerClient();

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
        <span className="text-gray-900 font-medium">New listing</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
        Add a new listing
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Fill in the details below. Your listing will be reviewed before it goes live.
      </p>

      {/* Photo note */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Photos:</span> Save first, then add photos on the edit screen.
        Image upload requires a listing ID.
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ListingForm categories={categories ?? []} regions={regions ?? []} />
      </div>
    </div>
  );
}
