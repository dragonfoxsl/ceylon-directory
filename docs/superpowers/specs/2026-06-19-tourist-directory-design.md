# Sri Lanka Tourist Services Directory — Design

**Date:** 2026-06-19
**Status:** Approved (design phase)

## Overview

A directory website for Sri Lankan tourist services — tour providers, activities,
rental services, and other traveler-facing businesses. Providers register and submit
listings; an admin manually verifies each submission before it becomes publicly
visible. Providers can request paid promotion to feature their listing. Visitor
reviews are explicitly deferred to a later phase.

## Goals (v1 / MVP)

- Visitors can browse and search verified listings by category and region — no login.
- Providers can register, create/edit their own listings, and track approval status.
- Every listing is manually verified by an admin before going live.
- Providers can request paid promotion; admin activates it manually (no payment
  integration in v1).

## Non-Goals (deferred)

- Visitor reviews / ratings (later phase — schema noted, not built).
- Integrated payment / self-checkout for promotion (manual activation only in v1).
- Maps / geolocation (region dropdown only in v1).
- Bookings, availability calendars, transactions.

## Architecture

- **Next.js (App Router)** on Vercel — hosts the public site, provider dashboard, and
  admin panel in a single app.
- **Supabase** — Postgres database, Auth (provider + admin), Storage (listing images),
  and Row-Level Security (RLS) for access control.
- Server Components for public browse pages (fast, SEO-friendly). Server Actions /
  Route Handlers for submissions and admin actions.

**Core invariant:** a listing is publicly visible only when
`status = 'approved'` AND `is_active = true`. Nothing unverified is ever shown.

## Roles

1. **Visitor (anonymous)** — browse/search verified active listings. No account.
2. **Provider (authenticated)** — create/edit *own* listings, request promotion, view
   status (pending / approved / rejected + admin note). Restricted to own rows by RLS.
3. **Admin (authenticated, `role='admin'`)** — review submissions, approve/reject with
   note, toggle Featured-until-[date], edit/unpublish any listing.

## Data Model (Postgres / Supabase)

### `profiles`
One row per auth user (mirrors `auth.users`).
- `id` (uuid, FK auth.users), `full_name`, `phone`,
  `role` (`'provider'` | `'admin'`, default `'provider'`), `created_at`

### `categories`
Fixed top-level set, seeded, admin-managed.
- `id`, `name`, `slug`, `icon`, `sort_order`
- Starter set: Tours & Guides, Activities & Experiences, Vehicle Rentals,
  Equipment Rentals, Accommodation, Transport & Transfers, Wellness & Spa,
  Food & Dining.

### `regions`
Curated Sri Lankan locations, seeded.
- `id`, `name`, `slug`
- e.g. Colombo, Kandy, Galle, Ella, Sigiriya, Arugam Bay, Nuwara Eliya, Mirissa,
  Anuradhapura, Jaffna, Trincomalee.

### `listings`
- `id`, `owner_id` (FK profiles), `category_id`, `region_id`
- `title`, `slug`, `description`, `price_info` (free text),
  `contact_phone`, `contact_whatsapp`, `contact_email`, `website`
- `status` (`'pending'` | `'approved'` | `'rejected'`, default `'pending'`),
  `admin_note`, `is_active` (bool)
- `is_featured` (bool), `featured_until` (timestamptz, nullable)
- `created_at`, `updated_at`

### `listing_images`
- `id`, `listing_id`, `storage_path`, `sort_order`, `is_cover`

### Deferred: `reviews`
Noted in schema comments; not built in v1.

### Data rules
- `price_info` is free text (rates vary; no transactions).
- `featured_until` lets promotion auto-expire via query filter / daily job — no admin
  cleanup needed.
- Editing an approved listing resets `status` to `'pending'` for re-review
  (prevents bait-and-switch).

## Pages & Flows

### Public
- `/` — hero, category grid, featured listings, search bar.
- `/listings` — browse all approved; filter by category + region, keyword search;
  featured pinned to top.
- `/category/[slug]`, `/region/[slug]` — filtered SEO views.
- `/listing/[slug]` — detail: gallery, description, price info, contact buttons
  (call / WhatsApp / email / website), category + region.
- `/about`, `/submit` (CTA to register).

### Provider
- `/signup`, `/login` — Supabase Auth (email/password).
- `/dashboard` — my listings with status badges + admin notes.
- `/dashboard/new`, `/dashboard/[id]/edit` — listing form with image upload.
- `/dashboard/[id]/promote` — request promotion; shows payment instructions
  (bank transfer / PayHere link); admin activates manually.

### Admin
- `/admin` — pending queue, newest first.
- Review screen — view submission, Approve / Reject (with note).
- Manage all listings — search, unpublish, edit, toggle Featured-until-[date].
- Promotion requests — mark paid → set featured.

## Verification Loop

Provider submits → `status='pending'` → admin reviews →
- **Approve:** `status='approved'`, `is_active=true` → goes live.
- **Reject:** `status='rejected'`, `admin_note` shown in provider dashboard.

Edits to an approved listing → back to `pending`.

## Security

- RLS: providers read/write only their own rows; approved + active listings are
  publicly readable; admin role permitted to moderate all rows.
- Admin pages additionally guarded server-side (role check), not RLS alone.

## Promotion (v1 — manual)

- Provider requests promotion → payment instructions shown (bank / PayHere link).
- Provider pays offline.
- Admin verifies payment → sets `is_featured=true`, `featured_until=[date]`.
- Featured listings pinned atop relevant browse views until `featured_until` passes.
