import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/ListingForm";

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
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/dashboard" className="transition-colors hover:text-accent">
          My listings
        </Link>
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        <span className="font-medium text-ink">New listing</span>
      </nav>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
        Add a new listing
      </h1>
      <p className="mt-2 text-sm text-muted">
        Fill in the details below. Your listing will be reviewed before it goes live.
      </p>

      {/* Photo note */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-hairline bg-linen px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <span>
          <span className="font-semibold text-ink">Photos: </span>
          Save first, then add photos on the edit screen — image upload needs a
          listing ID.
        </span>
      </div>

      <div className="card mt-8 p-6">
        <ListingForm categories={categories ?? []} regions={regions ?? []} />
      </div>
    </div>
  );
}
