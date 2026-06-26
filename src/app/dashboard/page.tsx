import Link from "next/link";
import { CheckCircle2, Clock, Eye, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { isCurrentlyFeatured, isCurrentlySponsored } from "@/lib/featured";

type Listing = {
  id: string;
  title: string;
  status: string;
  is_active: boolean;
  admin_note: string | null;
  created_at: string;
  is_featured: boolean;
  featured_until: string | null;
  promotion_requested_at: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  sponsored_requested_at: string | null;
  categories: { name: string } | null;
  regions: { name: string } | null;
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const STEPS = [
  { Icon: Plus, label: "Add your listing", desc: "Fill in your service details, photos, and contact info." },
  { Icon: Clock, label: "We review it", desc: "Our team checks every listing before it goes live — usually within 24 hours." },
  { Icon: Eye, label: "Travellers find you", desc: "Your service appears in search results and on the map." },
  { Icon: Sparkles, label: "Boost with Featured", desc: "Get priority placement at the top of search and the homepage." },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const showWelcome = sp.welcome === "1";

  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, status, is_active, admin_note, created_at, is_featured, featured_until, promotion_requested_at, is_sponsored, sponsored_until, sponsored_requested_at, categories(name), regions(name)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] listings query failed:", error);
  }

  const rows = (listings ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      {/* Welcome banner — shown once after email confirmation */}
      {showWelcome && (
        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-approved/30 bg-approved/8 px-6 py-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-approved" strokeWidth={2} />
          <div>
            <p className="font-semibold text-ink">Your account is confirmed.</p>
            <p className="mt-0.5 text-sm text-muted">
              You&apos;re ready to list your service. Add your first listing below and we&apos;ll review it within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            My listings
          </h1>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add listing
        </Link>
      </div>

      {/* Empty state with step guide */}
      {rows.length === 0 ? (
        <div className="space-y-6">
          <div className="card px-8 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
              <LayoutGrid className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-ink">No listings yet</h2>
            <p className="mt-2 max-w-md mx-auto text-muted">
              Add your first service — a tour, stay, transfer, or experience — and reach travellers planning their Sri Lanka trip.
            </p>
            <Link href="/dashboard/new" className="btn btn-primary mt-6 inline-flex">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add your first listing
            </Link>
          </div>

          {/* How it works */}
          <div className="card p-8">
            <p className="eyebrow mb-6">How it works</p>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ Icon, label, desc }, i) => (
                <li key={label} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
                  </div>
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-linen">
                <th className="eyebrow py-3 pl-6 pr-3 font-medium">Title</th>
                <th className="eyebrow hidden py-3 px-3 font-medium sm:table-cell">
                  Category
                </th>
                <th className="eyebrow hidden py-3 px-3 font-medium md:table-cell">
                  Region
                </th>
                <th className="eyebrow py-3 px-3 font-medium">Status</th>
                <th className="eyebrow py-3 pl-3 pr-6 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((listing) => {
                const sponsored = isCurrentlySponsored(listing);
                const featured = isCurrentlyFeatured(listing);
                const fmtDate = (d: string) =>
                  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                return (
                <tr
                  key={listing.id}
                  className="border-t border-hairline transition-colors hover:bg-linen/50"
                >
                  <td className="py-4 pl-6 pr-3 align-top">
                    <div className="text-sm font-medium text-ink">
                      {listing.title}
                    </div>
                    {/* Placement status chips */}
                    {(sponsored || featured || listing.sponsored_requested_at || listing.promotion_requested_at) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {sponsored && (
                          <span className="chip chip-sponsored">
                            Sponsored · until {fmtDate(listing.sponsored_until!)}
                          </span>
                        )}
                        {!sponsored && listing.sponsored_requested_at && (
                          <span className="chip bg-brand/10 text-brand">Sponsor requested</span>
                        )}
                        {featured && (
                          <span className="chip chip-featured">
                            Featured · until {fmtDate(listing.featured_until!)}
                          </span>
                        )}
                        {!featured && listing.promotion_requested_at && (
                          <span className="chip bg-gold/20 text-gold">Promotion requested</span>
                        )}
                      </div>
                    )}
                    {listing.status === "rejected" && listing.admin_note && (
                      <div className="mt-1.5 rounded-md border border-rejected/30 bg-rejected/10 px-3 py-1.5 text-xs text-rejected">
                        <span className="font-semibold">Reviewer note: </span>
                        {listing.admin_note}
                      </div>
                    )}
                    <div className="num mt-1 text-xs text-muted">
                      {new Date(listing.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="hidden py-4 px-3 align-top text-sm text-muted sm:table-cell">
                    {listing.categories?.name ?? <span aria-hidden="true" className="text-muted/40">·</span>}
                  </td>
                  <td className="hidden py-4 px-3 align-top text-sm text-muted md:table-cell">
                    {listing.regions?.name ?? <span aria-hidden="true" className="text-muted/40">·</span>}
                  </td>
                  <td className="py-4 px-3 align-top">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="py-4 pl-3 pr-6 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/${listing.id}/edit`}
                        className="-mx-2 -my-1.5 inline-block rounded px-2 py-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-deep"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/${listing.id}/promote`}
                        className="-mx-2 -my-1.5 inline-block rounded px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                      >
                        Promote
                      </Link>
                      <Link
                        href={`/dashboard/${listing.id}/sponsor`}
                        className="-mx-2 -my-1.5 inline-block rounded px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                      >
                        Sponsor
                      </Link>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
