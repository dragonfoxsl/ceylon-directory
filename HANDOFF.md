# Handoff — Ceylon Directory (Sri Lanka Tourist Services Directory)

_Last updated: 2026-06-20_

## What this is

A directory website for Sri Lankan tourist services (tours, activities, rentals,
accommodation, transport, wellness, food). Providers register and submit listings;
an **admin manually verifies** each before it goes public. Providers can request
**manual paid promotion** (admin sets "Featured until [date]"). Visitor reviews
are deferred to a later phase.

- **Spec:** `docs/superpowers/specs/2026-06-19-tourist-directory-design.md`
- **Plan (15 tasks):** `docs/superpowers/plans/2026-06-19-tourist-directory.md`
- **Stack:** Next.js 16 (App Router, TS, Tailwind) + Supabase (Postgres, Auth,
  Storage, RLS). Vitest for unit tests. Deploy target: Vercel + hosted Supabase.
- **Setup & deploy runbook:** `README.md` (the canonical reference now).

## Current state — ✅ v1 complete and merged to `main`

All 15 planned tasks are implemented, reviewed, and merged. The feature branch
`feat/tourist-directory` has been merged into `main` (no-ff merge commit) and deleted.

- **20/20 unit tests pass; `npm run build` compiles clean (15 routes).**
- Built with Subagent-Driven Development: one implementer subagent per task, a
  spec+quality review after each (fixes looped), then a final whole-branch review.
- **Progress ledger (full per-task history):** `.superpowers/sdd/progress.md`
  (git-ignored scratch; per-task briefs/reports/review diffs also in `.superpowers/sdd/`).

| # | Task | State |
|---|------|-------|
| 1 | Scaffold (Next.js+Tailwind+Vitest) | ✅ |
| 2 | DB schema + seed (8 categories, 11 regions) | ✅ |
| 3 | RLS + storage bucket | ✅ (4 security holes fixed + hardened) |
| 4 | Slug helpers (TDD) | ✅ |
| 5 | Featured helpers (TDD) | ✅ |
| 6 | Validation schema (TDD) | ✅ |
| 7 | Supabase clients + auth helpers | ✅ |
| 8 | Layout, nav, home | ✅ |
| 9 | Auth pages (signup/login/callback/signout) | ✅ |
| 10 | Listing actions + form + image uploader | ✅ |
| 11 | Provider dashboard (list/new/edit) | ✅ |
| 12 | Promotion request flow | ✅ |
| 13 | Admin moderation (actions + panel) | ✅ |
| 14 | Public browse + filters + category/region + detail + about | ✅ |
| 15 | Deploy runbook (README) | ✅ code; cloud deploy is operational (below) |

## Remaining work — operational deploy (needs your accounts)

The code is done; what's left requires your own Supabase + Vercel accounts. Full
steps are in `README.md` → "Deploying". In short:

1. Create a hosted Supabase project → `npx supabase link --project-ref <ref>` →
   `npx supabase db push` (applies migrations 0001–0004) → run `supabase/seed.sql`
   once in the SQL editor.
2. Sign up on the deployed site, then promote yourself:
   `update profiles set role='admin' where id='<your-auth-uid>';`
3. In Vercel set env vars `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (NO service-role key — the app never uses one).
4. In Supabase → Auth → URL Configuration, set Site URL to the Vercel domain and add
   `https://<domain>/auth/callback` to Redirect URLs.
5. `npx vercel --prod` (or connect the repo in the dashboard).
6. Smoke test: sign up as provider → submit listing → approve as admin → confirm it's
   public → activate a promotion → confirm Featured badge.

Before going live, fill in the real bank-transfer / PayHere details on the promote
page (`src/app/dashboard/[id]/promote/page.tsx`) — currently marked placeholders.

## Security review outcome (passed, with fixes verified)

Three issues were caught and fixed during the build; all verified:

- **Stored XSS** via a `javascript:` website URL (flagged by the commit security hook)
  — blocked at both the render layer (`listing/[slug]/page.tsx` `safeWebsite` scheme
  check) and the Zod schema (+ test).
- **CRITICAL (final review):** a provider could self-extend a lapsed paid promotion
  with only the anon key — `featured_until` was missing from the owner-update RLS
  privileged-field check. Fixed in migration `0004_promotion_rls_fix.sql`
  (`listing_promotion_request_only` helper requires every owner/privileged column
  unchanged; reset branch requires `featured_until is null`; `updateListing` now sets
  `featured_until: null`). **Empirically verified:** both attack scenarios rejected,
  all legitimate paths (promotion request, content edit, admin) allowed.
- **IMPORTANT (final review):** owner could edit an approved listing without re-review
  — closed by the same migration.

## Key decisions & gotchas (still true on `main`)

- **Core invariant:** a listing is public ONLY when `status='approved' AND is_active=true`.
  Enforced in every public query AND by RLS (`listings public read`).
- **RLS is the sole security boundary — no service-role key in the runtime.** Providers
  can never self-approve/activate/feature/extend-promotion. Owner UPDATE must EITHER
  change only `promotion_requested_at` (promotion request) OR reset
  `status='pending', is_active=false, is_featured=false, featured_until=null` (content
  edit → re-review). Admin acts via session + `is_admin()` (SECURITY DEFINER).
- **Listing INSERT** must set `status='pending', is_active=false, is_featured=false`.
- **Image storage path** must begin with the uploader's `auth.uid()`:
  `${userId}/${listingId}/${uuid}-${file}` — storage RLS requires it. Bucket
  `listing-images` is public-read.
- **Next.js 16:** `cookies()`, route `params`, and `searchParams` are async (`await`
  them). The `middleware` convention is deprecated in favour of `proxy` (warning only;
  rename `src/middleware.ts` → `src/proxy.ts` when Next 17 removes it).
- **Supabase joins** (`select("categories(name)")`) are typed as arrays but return a
  single object at runtime — an `as unknown as` cast is used; access as `.categories?.name`.

## Deferred / accepted for v1 (from final-review triage)

- Partial image-upload failure can orphan storage objects (no cleanup) — worth a
  follow-up.
- No RLS integration-test harness (only pure unit tests for slug/featured/validation);
  the two RLS defects above were exactly the class a harness would catch.
- `listing_images` has no `updated_at`; `categories.sort_order` not unique; `regions`
  has no `sort_order`; `images write` policy uses `FOR ALL`.
- `ListingCard` and listing detail use plain `<img>` not `next/image` (perf).
- `Filters` search fires per-keystroke (could debounce); `useSearchParams` could sit in
  a `<Suspense>` boundary; category/region `generateMetadata` returns a fallback title
  instead of `notFound()` (SEO only).
- `tel:`/`mailto:` hrefs are not sanitized (not a browser XSS vector; admin-gated +
  Zod-validated).
- No rejected-promotion UX state on the promote page; Amount field could label `LKR`.
