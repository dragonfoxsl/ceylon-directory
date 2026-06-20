# Handoff — Ceylon Directory (Sri Lanka Tourist Services Directory)

_Last updated: 2026-06-20_

## What this is

A directory website for Sri Lankan tourist services (tours, activities, rentals,
accommodation, transport, wellness, food). Providers register and submit listings;
an **admin manually verifies** each before it goes public. Providers can request
**manual paid promotion** (admin toggles "Featured until [date]"). Visitor reviews
are deferred to a later phase.

- **Spec:** `docs/superpowers/specs/2026-06-19-tourist-directory-design.md`
- **Plan (15 tasks):** `docs/superpowers/plans/2026-06-19-tourist-directory.md`
- **Stack:** Next.js 16 (App Router, TS, Tailwind) + Supabase (Postgres, Auth,
  Storage, RLS). Vitest for unit tests. Deploy target: Vercel + hosted Supabase.

## How it's being built

Subagent-Driven Development (superpowers skill): one implementer subagent per task,
a spec+quality review after each, fixes looped, then a final whole-branch review.

- **Branch:** `feat/tourist-directory` (do not work on `main`).
- **Progress ledger (source of truth):** `.superpowers/sdd/progress.md`
  (git-ignored scratch; per-task briefs/reports/diffs also live in `.superpowers/sdd/`).
- **Helper scripts:** in the subagent-driven-development skill dir —
  `scripts/task-brief PLAN N`, `scripts/review-package BASE HEAD`.

## Status

| # | Task | State |
|---|------|-------|
| 1 | Scaffold (Next.js+Tailwind+Vitest) | ✅ done, reviewed |
| 2 | DB schema + seed (8 categories, 11 regions) | ✅ done, reviewed |
| 3 | RLS + storage bucket | ✅ done, reviewed (4 security holes fixed + hardened; 10 RLS scenarios pass) |
| 4 | Slug helpers (TDD) | ✅ done, reviewed |
| 5 | Featured helpers (TDD) | ✅ done, reviewed |
| 6 | Validation schema (TDD) | ✅ done, reviewed |
| 7 | Supabase clients + auth helpers | ✅ done, reviewed |
| 8 | Layout, nav, home | ✅ done, reviewed |
| 9 | Auth pages (signup/login/callback/signout) | ✅ done, reviewed |
| 10 | Listing actions + form + image uploader | ✅ done, reviewed |
| 11 | Provider dashboard (list/new/edit) | ✅ done, reviewed |
| 12 | **Promotion flow** | ⏳ **implemented (commit `b139aed`), review PENDING** |
| 13 | Admin moderation (actions + panel) | ⬜ not started |
| 14 | Public browse + detail (filters, category/region, detail, about) | ⬜ not started |
| 15 | Deploy (hosted Supabase + Vercel + README) | ⬜ not started |

**Current HEAD:** `b139aed`. 19/19 unit tests passing. Build clean.

**Live smoke test done (Tasks 7–11):** home/login/signup return 200, `/dashboard`
redirects (307) to `/login`, seeded categories render, session middleware runs. Clean.

## RESUME HERE — exact next step

Task 12 is **implemented but not yet reviewed**. The review package was already
generated at:
`.superpowers/sdd/review-bc3c54f..b139aed.diff`

1. Dispatch the Task 12 task-reviewer (model: sonnet) using
   `.superpowers/sdd/task-12-brief.md`, `.superpowers/sdd/task-12-report.md`, and the
   diff above. Verify: migration column nullable; `requestPromotion` checks ownership
   and does NOT change `status`/`is_active`/`is_featured` (RLS compliance); promote
   page handles the requested/featured/none states; Next 16 async `params` awaited.
2. Loop any Critical/Important fixes; then mark Task 12 complete in the ledger +
   TaskUpdate, and `git log` the head.
3. Continue with Tasks 13 → 14 → 15 the same way (task-brief → implementer →
   review-package → reviewer → fix loop → ledger).
4. After Task 15: dispatch the **final whole-branch review** (most capable model)
   over `git merge-base main HEAD..HEAD`, feeding it the "final-review triage" Minor
   items collected in the ledger. Then use the `finishing-a-development-branch` skill.

## Environment / running locally

- Local Supabase is provisioned via the Supabase CLI (Docker required).
  `npx supabase start` then `npx supabase db reset` applies migrations 0001–0003 + seed.
- **`.env.local`** exists (git-ignored) with local Supabase URL + anon + service-role
  keys. If recreating, get values from `npx supabase status`.
- `npm run dev` (Next 16 Turbopack), `npm run build`, `npm run test` (Vitest).
- To exercise admin features you must promote a user:
  `update profiles set role='admin' where id='<auth-uid>';` (Studio SQL editor).

## Key decisions & gotchas (don't relearn these)

- **Core invariant:** a listing is public ONLY when `status='approved' AND is_active=true`.
  Enforced in both queries and RLS.
- **RLS is the security boundary (no service-role key in the runtime).** Providers can
  never self-approve/activate/feature. Owner UPDATEs must EITHER leave
  status/is_active/is_featured unchanged OR reset all three to pending/false. Admin acts
  via session + `is_admin()` (SECURITY DEFINER). All verified by 10 empirical scenarios.
- **Listing INSERT** must set `status='pending', is_active=false, is_featured=false`
  or RLS rejects it.
- **Image storage path** must begin with the uploader's `auth.uid()`:
  `${userId}/${listingId}/${uuid}-${file}` — storage RLS requires it. Bucket
  `listing-images` is public-read.
- **Server action result shape:** `{ok:true,id} | {ok:false, errors: Record<string,string[]>|null, message?}`
  (`ActionResult` exported from `src/actions/listings.ts`).
- **Next.js 16:** `cookies()` and route `params` are async (`await` them). The
  `middleware` file convention is deprecated in favour of `proxy` (warning only, still
  works — rename `src/middleware.ts` → `src/proxy.ts` when Next 17 removes it).
- **Supabase joins** (`select("categories(name)")`) are typed as arrays by the client
  but return a single object at runtime — an `as unknown as` cast is used in the
  dashboard; access as `.categories?.name`.

## Deferred items to weigh at the final review (from ledger)

- `listing_images` has no `updated_at`; `categories.sort_order` not unique; `regions`
  has no `sort_order`.
- `listing_images` "images write" policy uses `FOR ALL` (could split per-command).
- Confirm `storage.objects.owner` is `uuid` on the production Supabase version.
- `profiles` not readable by `anon` (fine unless public provider profile pages are added).
- `ListingCard` uses plain `<img>` not `next/image` (perf; acceptable at this scale).
- Partial image-upload failure can orphan storage objects (MVP-acceptable).
