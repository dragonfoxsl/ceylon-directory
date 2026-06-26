import { Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/AdminTabs";
import { setSponsored, clearSponsorshipRequest } from "@/actions/moderation";

type Listing = {
  id: string;
  title: string;
  sponsored_requested_at: string;
  is_sponsored: boolean;
  sponsored_until: string | null;
  categories: { name: string } | null;
  regions: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminSponsorshipsPage() {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, sponsored_requested_at, is_sponsored, sponsored_until, categories(name), regions(name), profiles(full_name)",
    )
    .not("sponsored_requested_at", "is", null)
    .order("sponsored_requested_at", { ascending: true });

  if (error) {
    console.error("[admin/sponsorships] query failed:", error);
  }

  const listings = (data ?? []) as unknown as Listing[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Moderation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">
            Sponsorship requests
          </h1>
          <p className="num mt-2 text-sm text-muted">
            {listings.length} pending request{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AdminTabs active="/admin/sponsorships" />
      </div>

      {listings.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-8 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Megaphone className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="text-xl font-semibold text-ink">No pending requests</h2>
          <p className="text-muted">No providers have requested sponsored placement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            async function handleActivate(formData: FormData) {
              "use server";
              const dateVal = formData.get("until") as string | null;
              if (dateVal) {
                await setSponsored(listing.id, `${dateVal}T23:59:59Z`);
              }
            }

            async function handleDismiss() {
              "use server";
              await clearSponsorshipRequest(listing.id);
            }

            const now = new Date();
            const alreadySponsored =
              listing.is_sponsored &&
              listing.sponsored_until &&
              new Date(listing.sponsored_until) > now;

            return (
              <div key={listing.id} className="card overflow-hidden p-0">
                <div className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        {listing.title}
                      </h2>
                      {alreadySponsored && (
                        <span className="chip chip-sponsored">Already sponsored</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {listing.profiles?.full_name && (
                        <span>
                          Provider:{" "}
                          <span className="font-medium text-ink">
                            {listing.profiles.full_name}
                          </span>
                        </span>
                      )}
                      {listing.categories?.name && (
                        <span>{listing.categories.name}</span>
                      )}
                      {listing.regions?.name && (
                        <span>{listing.regions.name}</span>
                      )}
                      <span className="num">
                        Requested{" "}
                        {new Date(listing.sponsored_requested_at).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </span>
                      {listing.sponsored_until && (
                        <span className="num text-brand">
                          Sponsored until{" "}
                          {new Date(listing.sponsored_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-start gap-3 border-t border-hairline bg-linen px-6 py-4 sm:flex-row sm:items-center">
                  {/* Activate with date */}
                  <form action={handleActivate} className="flex items-center gap-2">
                    <label
                      htmlFor={`until-${listing.id}`}
                      className="text-xs font-medium text-muted"
                    >
                      Sponsor until
                    </label>
                    <input
                      id={`until-${listing.id}`}
                      type="date"
                      name="until"
                      required
                      className="field num !px-2 !py-1.5 !text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-deep"
                    >
                      Activate
                    </button>
                  </form>

                  {/* Dismiss without sponsoring */}
                  <form action={handleDismiss}>
                    <button
                      type="submit"
                      className="rounded-lg border border-hairline px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                    >
                      Dismiss
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
