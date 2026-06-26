# Ceylon Directory — Testing & Features Brief

_Date: 2026-06-26_

---

## Visual Audit

A Playwright visual audit was run across 6 routes at both desktop (1280×800) and mobile (390×844) viewports using the Chromium binary at `~/.cache/ms-playwright/`.

### Pages audited

| Page | Desktop | Mobile |
|------|---------|--------|
| `/` (homepage) | ✓ | ✓ |
| `/listings` | ✓ | ✓ |
| `/login` | ✓ | ✓ |
| `/signup` | ✓ | ✓ |
| `/list-your-business` | ✓ | ✓ |
| `/dashboard` (redirect to login) | ✓ | ✓ |

### Findings

**Next.js dev indicator** — A floating "N" badge appears at the bottom-left of every page in development mode. This is the Next.js built-in development indicator, not a UI element. It is invisible in production builds. No action required.

**Auth mobile dead whitespace (fixed)** — `src/app/(auth)/layout.tsx` used `flex items-center` on a full-height container (`min-h-[calc(100dvh-3.75rem)]`). On mobile the left brand panel is hidden (`hidden lg:flex`) but the container keeps full height, so `items-center` pushed the form to vertical center — roughly 35% dead whitespace above it.

Fix applied: `items-start lg:items-center` on the form container, with `py-16` on mobile and `py-12` on desktop (restoring the original desktop padding). The form now sits near the top of the viewport on mobile, which matches how auth forms conventionally behave on small screens.

No other alignment issues were found.

---

## Test Coverage

### Unit tests

**Run:** `npm test`

20 tests across utility and component modules. All passing as of this brief.

Key coverage areas:
- Listing category and region lookup utilities
- Search query sanitisation (strips `"` before PostgREST filter interpolation)
- Form validation helpers
- Date/time formatting utilities

### Integration tests (RLS)

**Run:** `npm run test:integration`

15 tests against a local Supabase instance. All passing.

Key coverage areas:
- Anon read access on `listings`, `regions`, `categories`
- Auth-gated write access (INSERT/UPDATE on `listings`, `listing_images`)
- Admin-only policies (status transitions, featured flag)
- `listing_images` explicit INSERT / UPDATE / DELETE policies (migration 0007)

### What's not covered yet

- End-to-end user flows (signup → submit listing → admin approve)
- Search and filter behaviour on `/listings`
- Visual regression (screenshots are manual, not diffed automatically)
- Booking and planner flows (features not yet built)

---

## Feature Inventory

### Shipped (v2 — main branch)

| Feature | Notes |
|---------|-------|
| Directory listings with search + filter | Region and category filters; PostgREST search with injection fix |
| Listing detail pages | SEO metadata, structured data, image gallery |
| Sponsored / featured tier | `is_featured` flag, promoted card treatment |
| Auth flows | Login, signup, password reset — two-panel layout |
| Provider dashboard | Submit listing, manage images, view status |
| Admin dashboard | Review queue, approve/reject, featured toggle |
| Image uploads | Supabase Storage, RLS-guarded INSERT/UPDATE/DELETE |
| Row-level security | Full RLS across listings, images, profiles |
| Dark mode | System-preference toggle in nav |
| SEO | `generateMetadata`, OG tags, `robots.txt`, `sitemap.xml` |

### Deferred (tracked in HANDOFF.md)

- Email notifications (provider notified on listing approval)
- Listing claim flow (existing businesses not yet in directory)
- Provider analytics (view counts, contact clicks)
- Multi-image reordering (drag-and-drop in dashboard)
- Admin bulk actions

---

## Upcoming Features

### Ceylon AI Travel Planner

Route: `/plan` inside Ceylon Directory.

Visitors fill a 5-field form (duration, starting region, interests, pace, notes). A Claude-powered server action (`claude-sonnet-4-6` with tool use) queries Ceylon Directory listings first, then the web via Tavily, and produces a structured day-by-day itinerary stored in a new `itineraries` table. The output is a shareable page at `/plan/[slug]` with an optional Google Calendar export (client-side OAuth only — no tokens stored).

Full spec: `docs/superpowers/specs/2026-06-26-ceylon-planner-design.md`
Implementation plan: `docs/superpowers/plans/2026-06-26-ceylon-planner.md`

Key env vars needed: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Ceylon Booking

Standalone white-label app (`ceylon-booking/` — new repository).

A lightweight booking platform for small-to-medium Sri Lanka service providers. No payments. Providers connect their Google Calendar; visitors request bookings; providers accept or decline via single-use email links. The platform places a Google Calendar hold when a booking is accepted. Can be deployed independently or embedded into Ceylon Directory as a widget via `@ceylon/booking-widget`.

Full spec: `docs/superpowers/specs/2026-06-26-ceylon-booking-design.md`
Implementation plan: `docs/superpowers/plans/2026-06-26-ceylon-booking.md`

Key integrations: Google Calendar API (via Supabase Edge Function), Resend (email), optional shared JWT auth with Ceylon Directory.

---

## How to Run Tests

```bash
# Unit tests
npm test

# Integration tests (requires local Supabase running)
npx supabase start
npm run test:integration

# Visual audit (manual — requires dev server running)
npm run dev
# Then run the Playwright script at scripts/visual-audit.ts
# Uses Chromium at ~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome
```
