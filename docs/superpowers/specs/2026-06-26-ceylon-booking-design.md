# Ceylon Booking — Design Spec

_Date: 2026-06-26_

## What it is

A standalone white-label booking management platform for small to medium service
providers. Visitors submit booking requests; providers accept or decline via email;
accepted bookings create Google Calendar events automatically. No payments. No
reviews. Designed to be deployed independently or integrated with Ceylon Directory.

## Users

- **Providers** — small tour operators, activity hosts, guesthouse owners. Manage
  bookings from a desktop or tablet, periodically. Not power users.
- **Visitors** — tourists submitting booking requests, on mobile or desktop. No
  account required to book.
- **Operators** — teams deploying their own white-label instance (e.g. the Ceylon
  Directory team, or a third party running their own booking platform).

---

## Architecture

### Standalone-first

Ceylon Booking is a self-contained Next.js 16 (App Router, TypeScript strict,
Tailwind v4) app with its own Supabase project (auth + database). It has no hard
dependency on Ceylon Directory and can be deployed to any domain.

### White-label via environment config

All brand-specific values are env vars. The codebase ships with Ceylon defaults.
A different operator swaps vars and deploys their own instance — no code changes.

```
BRAND_NAME            # e.g. "Ceylon Booking"
BRAND_LOGO_URL        # absolute URL to logo image
BRAND_COLOR           # primary colour (hex or OKLCH)
BRAND_DOMAIN          # e.g. "booking.ceylon.lk"
SUPPORT_EMAIL         # shown in transactional emails
```

### Ceylon Directory integration (opt-in)

When the following vars are set, the app operates in integrated mode:

```
DIRECTORY_URL                  # e.g. "https://ceylon.lk"
DIRECTORY_SUPABASE_URL         # shared Supabase project URL
DIRECTORY_SUPABASE_ANON_KEY    # shared anon key
```

In integrated mode:
- JWTs from the directory's Supabase auth instance are accepted (verified against
  `DIRECTORY_SUPABASE_URL`). Providers use one login for both products.
- Provider slugs are expected to match directory listing slugs so
  `booking.ceylon.lk/[slug]` aligns with `ceylon.lk/listing/[slug]`.
- The `@ceylon/booking-widget` npm package (see Embedding section) reads
  `NEXT_PUBLIC_BOOKING_URL` to know where to post booking requests.

When these vars are absent, Ceylon Booking runs fully standalone with its own
Supabase auth instance.

---

## Data Model

All tables live in Ceylon Booking's own Supabase project (public schema).

### `providers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | matches `auth.users.id` |
| `slug` | text unique | URL-safe, e.g. `kandy-safari-tours` |
| `business_name` | text | |
| `contact_email` | text | for notifications |
| `description` | text nullable | shown on booking page |
| `logo_url` | text nullable | |
| `booking_mode` | enum `open_request \| structured` | default `open_request` |
| `timezone` | text | IANA tz string, default `Asia/Colombo` |
| `google_calendar_token` | jsonb nullable | encrypted; access + refresh tokens |
| `google_calendar_id` | text nullable | target calendar, default `primary` |
| `created_at` | timestamptz | |

### `availability_slots`

Used only when `booking_mode = 'structured'`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `provider_id` | uuid FK → providers | |
| `day_of_week` | int | 0=Sun … 6=Sat |
| `start_time` | time | |
| `end_time` | time | |

### `bookings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `provider_id` | uuid FK → providers | |
| `visitor_name` | text | |
| `visitor_email` | text | |
| `visitor_phone` | text nullable | |
| `service_description` | text nullable | what the visitor wants |
| `requested_date` | date | |
| `requested_time` | time | |
| `party_size` | int default 1 | |
| `notes` | text nullable | |
| `status` | enum `pending \| accepted \| declined \| cancelled` | default `pending` |
| `accept_token` | uuid unique | tokenised accept link; nulled after use |
| `decline_token` | uuid unique | tokenised decline link; nulled after use |
| `google_event_id` | text nullable | set after calendar event created |
| `created_at` | timestamptz | |

### RLS

- `providers`: readable by anyone (public booking page needs name/description);
  writable by owner only.
- `availability_slots`: readable by anyone; writable by owner only.
- `bookings`: INSERT by anyone (no auth required to book); SELECT/UPDATE by the
  owning provider only. Accept/decline via tokenised links bypass auth entirely
  (checked server-side against `accept_token`/`decline_token`).

---

## Booking Flow

### Open-request mode

1. Visitor lands on `booking.ceylon.lk/[slug]` or the embedded widget.
2. Fills the booking form: name, email, phone (optional), preferred date, preferred
   time, party size, service description (optional), notes (optional).
3. Submission POSTs to a server action. A `bookings` row is created with
   `status=pending`. Unique `accept_token` and `decline_token` UUIDs are generated.
4. Provider receives a notification email with:
   - Booking details
   - "Accept" link → `booking.ceylon.lk/api/bookings/[id]/accept?token=[accept_token]`
   - "Decline" link → `booking.ceylon.lk/api/bookings/[id]/decline?token=[decline_token]`
   - No login required to act on these links.
5. **On accept:** `status` → `accepted`; a Google Calendar event is created via a
   Supabase Edge Function (server-side, token never reaches client); visitor receives
   a confirmation email with event details and a `.ics` attachment.
6. **On decline:** `status` → `declined`; visitor receives a polite decline email.
7. Provider can cancel an accepted booking from their dashboard →
   `status` → `cancelled`; Google Calendar event deleted; visitor notified.

### Structured-availability mode

Identical to the above except:
- The date/time picker on the booking form shows only the provider's configured
  `availability_slots` for the selected date.
- Slots that already have an `accepted` booking are greyed out.
- Fully booked days are skipped in the date picker.

---

## Provider Dashboard (`/dashboard`)

Four sections on a single scrollable page (no nested tabs):

**Bookings inbox** — pending requests listed newest-first, each with inline
Accept/Decline buttons. Accepted and declined bookings collapse into a filterable
history below. Providers can cancel accepted bookings with a confirmation step.

**Availability** — mode toggle (open-request vs. structured). In structured mode: a
weekly grid (Mon–Sun, time blocks) to mark available hours. Timezone selector.

**Google Calendar** — "Connect Google Calendar" button triggers OAuth
(`calendar.events` scope). Shows connected calendar name and status
(connected / token expired / not connected). Disconnect option.

**Profile** — business name, slug, contact email, short description, logo upload,
timezone. Slug changes redirect the old URL to the new one for 30 days.

---

## Provider's Public Booking Page (`/[slug]`)

Accessible to anyone without login. Shows:
- Provider business name and logo
- Short description
- Booking form (open-request or slot picker depending on mode)
- Brand footer (white-label configurable)

---

## Embedding in Ceylon Directory

**Package:** `@ceylon/booking-widget` — a minimal React component exported from the
Ceylon Booking repo and published to npm.

```tsx
<BookingWidget
  providerSlug="kandy-safari-tours"
  bookingUrl={process.env.NEXT_PUBLIC_BOOKING_URL}
/>
```

Behaviour:
- On mount, fetches `${bookingUrl}/api/providers/${providerSlug}/exists`.
- If the provider has no Ceylon Booking account, renders nothing.
- If the provider exists, renders an inline booking form that POSTs to
  `${bookingUrl}/api/bookings`.
- On success, shows a confirmation message inline.

The widget is styled with CSS custom properties so the host app's design tokens
apply. No iframe — renders in the host DOM.

---

## Google Calendar Integration

- Provider connects via Google OAuth from their dashboard.
- Scopes: `https://www.googleapis.com/auth/calendar.events`
- Tokens stored in `providers.google_calendar_token` (jsonb), encrypted at rest
  using Supabase's `pgcrypto` via a server-side wrapper.
- All Calendar API calls happen inside a Supabase Edge Function
  (`supabase/functions/create-calendar-event`). The Edge Function:
  1. Reads and decrypts the provider's token.
  2. Refreshes the access token if expired.
  3. Creates the calendar event.
  4. Updates `bookings.google_event_id`.
- The Edge Function is invoked by the accept route handler, not by the client.

---

## Email Notifications

Transactional emails sent via Resend (configurable via `RESEND_API_KEY`).

| Trigger | Recipient | Content |
|---------|-----------|---------|
| New booking | Provider | Booking details + Accept/Decline links |
| Booking accepted | Visitor | Confirmation + `.ics` attachment |
| Booking declined | Visitor | Polite decline message |
| Booking cancelled | Visitor | Cancellation notice |

Email templates use the white-label brand vars (name, colour, logo).

---

## Error Handling

- **Google token expired:** Edge Function detects expiry, attempts refresh. If
  refresh fails (revoked), booking is accepted but calendar event creation is
  skipped. Provider receives a dashboard alert to reconnect.
- **Calendar API failure:** Booking is still accepted; calendar event creation is
  retried up to 3 times via the Edge Function. If all retries fail, provider is
  notified via email to create the event manually.
- **Duplicate submission:** `accept_token` and `decline_token` are single-use.
  Second click on an accept/decline link returns a graceful "already actioned" page.
- **Slot conflict (structured mode):** Checked server-side at submission time.
  If the slot was taken between page load and submission, the visitor sees an
  inline error and is shown alternative slots.

---

## Testing

- Unit tests: booking form validation, token generation, availability slot conflict
  detection, white-label config resolution.
- Integration tests: RLS policies (visitor can INSERT but not SELECT; provider can
  only see their own bookings), tokenised accept/decline routes.
- Google Calendar: mocked in tests; manual QA in local dev with a test Google
  account.

---

## What's deferred

- Payment integration (Stripe, PayHere)
- SMS notifications
- Recurring/series bookings
- Provider analytics (booking volume, conversion rate)
- Visitor accounts (booking history)
- Multi-staff calendars (multiple team members per provider)
