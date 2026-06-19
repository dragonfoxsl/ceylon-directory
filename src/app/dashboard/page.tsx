import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Listings</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Manage your Sri Lanka tourist service listings.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
        >
          <span aria-hidden="true">+</span> Add listing
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50 py-20 px-8 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">🌴</div>
          <h2 className="text-xl font-semibold text-teal-800 mb-2">No listings yet</h2>
          <p className="text-teal-600 max-w-md mx-auto mb-6">
            Add your first tourist service — hotels, tours, transport or experiences — and
            reach thousands of travellers exploring Sri Lanka.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-block rounded-full bg-teal-700 px-8 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
          >
            Add your first listing
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">
                  Category
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                  Region
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="py-3 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 pl-6 pr-3">
                    <div className="font-medium text-gray-900 text-sm">{listing.title}</div>
                    {listing.status === "rejected" && listing.admin_note && (
                      <div className="mt-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700">
                        <span className="font-semibold">Reviewer note: </span>
                        {listing.admin_note}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(listing.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-sm text-gray-600 hidden sm:table-cell">
                    {listing.categories?.name ?? "—"}
                  </td>
                  <td className="py-4 px-3 text-sm text-gray-600 hidden md:table-cell">
                    {listing.regions?.name ?? "—"}
                  </td>
                  <td className="py-4 px-3">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="py-4 pl-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/${listing.id}/edit`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/${listing.id}/promote`}
                        className="text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
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
