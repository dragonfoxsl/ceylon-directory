import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";

type Listing = {
  id: string;
  title: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  categories: { name: string } | null;
  regions: { name: string } | null;
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createServerClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, status, admin_note, created_at, categories(name), regions(name)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] listings query failed:", error);
  }

  const rows = (listings ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            My listings
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage your Sri Lanka tourist service listings.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary shrink-0">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add listing
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-brand">
            <LayoutGrid className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-ink">No listings yet</h2>
          <p className="max-w-md text-muted">
            Add your first service — a tour, stay, transfer, or experience — and
            reach travellers planning their Sri Lanka trip.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary mt-2">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add your first listing
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
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
              {rows.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-t border-hairline transition-colors hover:bg-linen/50"
                >
                  <td className="py-4 pl-6 pr-3 align-top">
                    <div className="text-sm font-medium text-ink">
                      {listing.title}
                    </div>
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
                    {listing.categories?.name ?? "—"}
                  </td>
                  <td className="hidden py-4 px-3 align-top text-sm text-muted md:table-cell">
                    {listing.regions?.name ?? "—"}
                  </td>
                  <td className="py-4 px-3 align-top">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="py-4 pl-3 pr-6 text-right align-top">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/dashboard/${listing.id}/edit`}
                        className="text-sm font-medium text-accent transition-colors hover:text-accent-deep"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/${listing.id}/promote`}
                        className="text-sm font-medium text-muted transition-colors hover:text-ink"
                      >
                        Promote
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
