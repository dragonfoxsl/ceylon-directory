import { CheckCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminTabs } from "@/components/AdminTabs";
import { approveListing, rejectListing } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  price_info: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  created_at: string;
  categories: { name: string } | null;
  regions: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminPendingPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, status, description, price_info, contact_phone, contact_email, website, created_at, categories(name), regions(name), profiles(full_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin] pending listings query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Moderation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            Pending review
          </h1>
          <p className="num mt-2 text-sm text-muted">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        <AdminTabs active="/admin" />
      </div>

      {listings.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-approved/15 text-approved">
            <CheckCheck className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="text-xl font-semibold text-ink">All clear</h2>
          <p className="text-muted">No listings are awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {listings.map((listing) => {
            async function handleApprove() {
              "use server";
              await approveListing(listing.id);
            }

            async function handleReject(formData: FormData) {
              "use server";
              const note = formData.get("note") as string;
              await rejectListing(listing.id, note);
            }

            return (
              <div key={listing.id} className="card overflow-hidden p-0">
                {/* Card header */}
                <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {listing.title}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {listing.profiles?.full_name && (
                        <span>
                          Provider: <span className="font-medium text-ink">{listing.profiles.full_name}</span>
                        </span>
                      )}
                      {listing.categories?.name && (
                        <span>{listing.categories.name}</span>
                      )}
                      {listing.regions?.name && (
                        <span>{listing.regions.name}</span>
                      )}
                      <span className="num">
                        Submitted{" "}
                        {new Date(listing.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>

                {/* Details */}
                <div className="space-y-3 px-6 py-4">
                  {listing.description && (
                    <div>
                      <p className="eyebrow mb-1.5">Description</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted line-clamp-4">
                        {listing.description}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
                    {listing.price_info && (
                      <span>
                        <span className="text-muted">Price: </span>
                        <span className="num">{listing.price_info}</span>
                      </span>
                    )}
                    {listing.contact_phone && (
                      <span>
                        <span className="text-muted">Phone: </span>
                        <span className="num">{listing.contact_phone}</span>
                      </span>
                    )}
                    {listing.contact_email && (
                      <span>
                        <span className="text-muted">Email: </span>
                        {listing.contact_email}
                      </span>
                    )}
                    {listing.website && (
                      <span>
                        <span className="text-muted">Website: </span>
                        <a
                          href={listing.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {listing.website}
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4 border-t border-hairline bg-linen px-6 py-4 sm:flex-row">
                  {/* Approve */}
                  <form action={handleApprove}>
                    <button type="submit" className="btn btn-primary">
                      Approve
                    </button>
                  </form>

                  {/* Reject */}
                  <form action={handleReject} className="flex flex-1 items-start gap-2">
                    <textarea
                      name="note"
                      rows={1}
                      placeholder="Rejection reason (optional)"
                      className="field flex-1 resize-none"
                    />
                    <button
                      type="submit"
                      className="btn shrink-0 border border-rejected/40 bg-rejected/10 text-rejected hover:bg-rejected/20"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
