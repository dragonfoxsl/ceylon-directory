# Handoff — Ceylon Directory (Sri Lanka Tourist Services Directory)

_Last updated: 2026-06-26_

## What this is

A directory website for Sri Lankan tourist services (tours, activities, rentals,
accommodation, transport, wellness, food). Providers register and submit listings;
an **admin manually verifies** each before it goes public. Providers can pay for
**Featured** (gold badge, top of results) or **Sponsored** (top of everything,
brand banner) placement — admin activates both after confirming payment.
Visitor reviews are deferred to a later phase.

- **Spec:** `docs/superpowers/specs/2026-06-19-tourist-directory-design.md`
- **Stack:** Next.js 16 (App Router, TS strict, Tailwind v4, Turbopack) + Supabase
  (Postgres, Auth, Storage, RLS). Vitest for unit + integration tests. Deploy target:
  Vercel + hosted Supabase.
- **Setup & deploy runbook:** `README.md`
- **Design system:** `DESIGN.md`

---

## Architecture snapshot

```
src/
  app/
    (auth)/            login, signup, forgot-password, update-password
    admin/             pending review, all listings, promotions, sponsorships
    auth/
      callback/        route handler — exchange code, branch on type=recovery|signup
      confirmed/       onboarding landing page after email confirmation
    category/[slug]/
    dashboard/         provider dashboard (shows placement status chips per listing)
      [id]/edit/
      [id]/promote/    Featured placement request
      [id]/sponsor/    Sponsored placement request
    listing/[slug]/    detail page with JSON-LD + related listings
    listings/          browse with search + pagination
    map/               Leaflet region-cluster map
    region/[slug]/
    not-found.tsx
    error.tsx
    loading.tsx
    robots.ts
    sitemap.ts
  actions/
    listings.ts        createListing, updateListing, deleteListing (+ storage cleanup)
    moderation.ts      approveListing, rejectListing, setActive, setFeatured,
                       setSponsored, clearPromotionRequest, clearSponsorshipRequest
    promotion.ts       requestPromotion, requestSponsorship
  components/
    AdminTabs, ImageUploader, ListingCard, ListingForm, MapBrowse,
    PromoteRequestForm, SponsorRequestForm, StatusBadge, ThemeToggle
  lib/
    auth.ts            requireUser, requireAdmin
    covers.ts          fetchCoverUrls — single .in() batch query
    featured.ts        ListingLike, isCurrentlyFeatured, isCurrentlySponsored,
                       sortListings (sponsored > featured > regular > newest)
    fonts.ts           Satoshi + Geist Mono
    promotion-config.ts env-driven payment details (bank + PayHere)
    regions.ts         11 region centroids for map clustering
    supabase/          server.ts, client.ts
supabase/
  migrations/
    0001_init.sql           listings, categories, regions, profiles, listing_images
    0002_rls.sql            Row Level Security policies + grants
    0003_promotion.sql      promotion_requested_at column
    0004_promotion_rls_fix.sql  closes self-extend + self-approve holes
    0005_sponsored.sql      sponsored columns + index + RLS update
    0006_service_role_grants.sql  PostgREST grants for service_role (admin ops + tests)
    0007_listing_images_updated_at.sql  adds updated_at + trigger; splits FOR ALL → INSERT/UPDATE/DELETE
  seed.sql             8 categories, 11 regions
tests/
  featured.test.ts     unit — isCurrentlyFeatured, isCurrentlySponsored, sortListings
  slug.test.ts         unit — slug generation
  validation.test.ts   unit — Zod listing schema
  rls/
    helpers.ts         test user factory, insertListing, seedCategoryId/RegionId
    listings.rls.test.ts  15 RLS integration tests (requires local Supabase running)
```

---

## Running tests

```bash
npm test                  # unit tests only (no Supabase required)
npm run test:integration  # RLS integration tests (requires: npx supabase start)
```

Integration tests use `vitest.integration.config.ts`. They create and destroy real
auth users on each run. Keys default to the standard local Supabase values
(`supabase status` to confirm). Override via `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` env vars.

**Note:** `supabase db reset` does NOT clear auth users. Test emails include a
short UUID suffix so they are unique across runs.

---

## Current state — all planned work complete

### Design system (v2)

**Ceylon Boutique Heritage** token system (`globals.css`): warm OKLCH neutrals,
`--brand` (terracotta), `--accent` (deep teal), `--gold`, `--shell`, dark theme
via `.dark` class + `ThemeToggle`. Tailwind v4 `@theme inline` maps every token.
Primitives: `.btn`, `.card`, `.chip-*`, `.field`, `.eyebrow`, `.num`, `.reveal`.
Self-hosted **Satoshi** variable woff2 + **Geist Mono**. Lucide icons throughout.

### Sponsorship tier

Full end-to-end sponsored placements feature, layered on top of Featured.

**Sort order:** `sponsored (active) > featured (active) > regular`, then
`created_at DESC` within each tier. Implemented in `sortListings()` with a
weighted score: sponsored=2, featured=1.

**DB** (`0005_sponsored.sql`):
- `listings.is_sponsored boolean NOT NULL DEFAULT false`
- `listings.sponsored_until timestamptz`
- `listings.sponsored_requested_at timestamptz`
- Index on `(is_sponsored, sponsored_until)`
- RLS: providers cannot change `is_sponsored` or `sponsored_until` (subquery guard)

**UI — public:**
- `ListingCard`: brand-coloured "Sponsored" banner strip across the image top
- Listing detail: disclosure bar before cover + `chip-sponsored` badge on image
- All listing grids (home, listings, category, region, map) sort by sponsored fields

**UI — provider:**
- Dashboard table: placement status chips ("Sponsored · until X", "Featured · until X",
  "Sponsor requested", "Promotion requested") shown inline under each listing title
- `/dashboard/[id]/sponsor`: three states — active, pending, not yet requested
- `SponsorRequestForm` with `useActionState`; payment instructions from env-var config

**UI — admin:**
- `/admin/listings`: sponsored date picker + Sponsor/Clear buttons per row
- `/admin/sponsorships`: all `sponsored_requested_at` requests; Activate or Dismiss
- `AdminTabs`: Pending / All listings / Promotions / Sponsorships

### Auth flows

- **Forgot password** (`/forgot-password`): `resetPasswordForEmail` with
  `redirectTo: /auth/update-password`; success state with "Try again"
- **Update password** (`/update-password`): client-side match + min 8 chars;
  `updateUser({ password })`; redirects to `/dashboard` on success
- **Callback** (`/auth/callback/route.ts`): exchanges code, then branches:
  - `type=recovery` → `/update-password`
  - `type=signup` → `/auth/confirmed` (onboarding landing)
  - else → `/dashboard`
- **`/auth/confirmed`**: post-signup onboarding page — 4-step card grid
  (Add listing → Review → Travellers find you → Boost visibility), two CTAs
  (Add first listing / Go to dashboard). This is what the email confirmation link lands on.

### SEO

- `robots.ts`: disallows `/dashboard/`, `/admin/`, `/auth/`
- `sitemap.ts`: parallel queries; static + dynamic (listings 0.8, categories/regions 0.7)
- **JSON-LD** on listing detail: `TouristAttraction` schema, XSS-safe serialisation
- **Twitter/X card** meta: `summary_large_image` on listing detail and root layout

### Public browse

- **Extended search**: pre-queries regions by name; OR-filters title + description + region
- **Pagination**: `PAGE_SIZE = 24`; sort (featured/sponsored) before slice
- **Related listings** on detail: same category, exclude current, limit 3, batch covers
- **Stagger reveal** animations on category + region grids
- **Map empty state**: shown when no approved listings exist

### UX hardening

- **Image upload**: type allowlist + 8 MB limit before upload; always-visible delete on mobile
- **`deleteListing`**: fetches all `listing_images` storage paths, removes from storage
  before deleting the row — prevents orphaned storage objects
- **`listing_images.updated_at`**: added via `0007`; trigger auto-sets it on every UPDATE.
  The old `FOR ALL` write policy was split into explicit `INSERT` / `UPDATE` / `DELETE`
  policies so USING and WITH CHECK apply only where they belong.
- **Touch targets**: nav, dashboard, admin all meet 44px minimum
- **Auth copy**: friendly error mapping for all Supabase auth error codes
- **`not-found.tsx`**, **`error.tsx`**, **`loading.tsx`**: all implemented

### Performance

- `next/image` formats: `["image/avif", "image/webp"]`, `minimumCacheTTL: 86400`
- Satoshi `display: "fallback"` (reduces CLS)
- `fetchCoverUrls`: single `.in()` query for all cards in a grid

---

## Placement tiers

| Tier | Sort rank | Who activates | Duration |
|------|-----------|--------------|----------|
| Sponsored | 1st | Admin only (after payment) | Until `sponsored_until` |
| Featured | 2nd | Admin only (after payment) | Until `featured_until` |
| Regular | 3rd (newest first) | Auto on approval | Permanent |

**Provider flow:**
1. Go to `/dashboard/[id]/sponsor` (or `/promote`)
2. Page shows payment instructions (bank and/or PayHere link from env vars)
3. Pay, then click "Request" → sets `sponsored_requested_at` (or `promotion_requested_at`)
4. Admin sees request on `/admin/sponsorships` (or `/admin/promotions`), sets date, clicks Activate

**Payment env vars** (server-side only — no `NEXT_PUBLIC_` prefix):

| Var | Purpose |
|-----|---------|
| `PROMO_BANK_NAME` | Bank name |
| `PROMO_ACCOUNT_NAME` | Account name |
| `PROMO_ACCOUNT_NUMBER` | Account number |
| `PROMO_PRICE_LKR` | Display price (numeric or free text) |
| `PROMO_PAYHERE_URL` | PayHere link (https only) |
| `PROMO_CONTACT_EMAIL` | Fallback contact when no payment method set |

The same config drives both Featured and Sponsored pages.

---

## RLS security model

No service-role key in the runtime. All writes go through RLS.

- **Public read:** `status='approved' AND is_active=true` only
- **Provider INSERT:** must set `status='pending', is_active=false, is_featured=false, is_sponsored=false`
- **Provider UPDATE — two valid paths only:**
  1. Request only: changes `promotion_requested_at` or `sponsored_requested_at`; all
     privileged fields (`is_active`, `is_featured`, `featured_until`, `is_sponsored`,
     `sponsored_until`) must equal their current DB values
  2. Content edit: resets `status='pending', is_active=false, is_featured=false,
     featured_until=null, is_sponsored=false`
- **Admin writes:** server actions call `requireAdmin()` → checks `profiles.role='admin'`
  via `SECURITY DEFINER` function `is_admin()`
- **`is_sponsored`/`sponsored_until`** protected by subquery in WITH CHECK; providers
  cannot set these via the API even with a crafted request

RLS invariants are verified by the integration tests in `tests/rls/`.

---

## Key gotchas

- **Next.js 16:** `cookies()`, `params`, `searchParams` are all async — `await` them.
  `middleware` → `proxy` rename coming in Next 17 (warning only now).
- **Supabase joins** return a single object at runtime despite TS typing as an array.
  Cast with `as unknown as` and access as `?.name`.
- **In-memory sort:** `sortListings` must run *before* pagination — paginating first
  then sorting breaks the sponsored/featured ordering.
- **Image storage path** must be `${userId}/${listingId}/${uuid}-${filename}` —
  storage RLS enforces the `auth.uid()` prefix.
- **JSON-LD XSS:** serialise with `.replace(/</g, "\\u003c")` etc. before
  `dangerouslySetInnerHTML`.
- **`isCurrentlySponsored` / `isCurrentlyFeatured`** check BOTH the boolean flag AND
  that the `_until` timestamp is in the future. Both checks are required.
- **`service_role` PostgREST grants:** migration `0006` adds explicit table grants so
  the service role can be used for admin operations and integration tests. Without it,
  PostgREST returns 403 even though BYPASSRLS is set.

---

## What's deferred

| Item | Notes |
|------|-------|
| **PayHere webhook** | Payment is manual — provider pays, admin confirms. Auto-activation on payment is a future phase. |
| **Exact map pins** | Map clusters by region centroid. Needs `latitude`/`longitude` on `listings` + map picker in `ListingForm`. |
| **Visitor reviews** | Explicitly deferred. |

---

## Local dev quick start

```bash
make dev                  # starts Supabase + Next.js in one command
npm test                  # unit tests
npm run test:integration  # RLS tests (Supabase must be running)
```

Local admin: `admin@ceylon.test` / `Test1234!` (local only, not prod).

Full setup and prod deploy steps: `README.md`.
