import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
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
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/dashboard" className="transition-colors hover:text-accent">
          My listings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="inline-block max-w-xs truncate align-bottom font-medium text-ink">
          {listing.title}
        </span>
      </nav>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
        Edit listing
      </h1>
      <p className="mt-2 text-sm text-muted">Update your listing details below.</p>

      {/* Re-review notice */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-hairline bg-linen px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <span>
          <span className="font-semibold text-ink">Note: </span>
          Editing sends this listing back for re-review. It will be hidden from
          the public until approved again.
        </span>
      </div>

      <div className="card mt-8 p-6">
        <ListingForm
          listing={listing}
          categories={categories ?? []}
          regions={regions ?? []}
        />
      </div>
    </div>
  );
}
