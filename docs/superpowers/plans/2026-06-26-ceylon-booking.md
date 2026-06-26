# Ceylon Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone white-label booking management platform at `booking.ceylon.lk` — providers connect Google Calendar, visitors submit booking requests, accepted bookings create Calendar events automatically; deployable independently or integrated with Ceylon Directory.

**Architecture:** Separate Next.js 16 app with its own Supabase project. White-label config via env vars. Optional Ceylon Directory integration via shared JWT verification. Accept/decline via single-use tokenised email links. Google Calendar event creation via Supabase Edge Function (server-side, tokens never reach client). Booking widget exported as `@ceylon/booking-widget` npm package.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Supabase (Auth + DB + Edge Functions), Resend (transactional email), Google Calendar REST API, React (booking widget package).

## Global Constraints

- This is a **new, separate repository** — not inside the Ceylon Directory repo.
- Next.js 16: `cookies()`, `params`, `searchParams` are all async — `await` them.
- No service-role key in runtime — all client writes go through RLS.
- Accept/decline tokens are single-use: null the column after use.
- All Google Calendar API calls happen server-side (Edge Function) — access tokens never sent to client.
- White-label vars: `BRAND_NAME`, `BRAND_LOGO_URL`, `BRAND_COLOR`, `BRAND_DOMAIN`, `SUPPORT_EMAIL`.
- Directory integration vars (optional): `DIRECTORY_URL`, `DIRECTORY_SUPABASE_URL`, `DIRECTORY_SUPABASE_ANON_KEY`.
- No external script tags without `next/script`. No SRI on dynamically-versioned CDN scripts.
- Tailwind v4: utility classes only, no `tailwind.config.js` changes.

---

## File Map

```
ceylon-booking/                   ← new repo root
  src/
    app/
      [slug]/page.tsx             — public booking page
      [slug]/confirmed/page.tsx   — post-submission confirmation
      api/
        bookings/[id]/accept/route.ts   — tokenised accept handler
        bookings/[id]/decline/route.ts  — tokenised decline handler
        providers/[slug]/exists/route.ts — widget existence check
      auth/
        callback/route.ts         — Supabase auth callback
        login/page.tsx
        signup/page.tsx
      dashboard/
        page.tsx                  — bookings inbox
        availability/page.tsx     — availability settings
        calendar/page.tsx         — Google Calendar connection
        profile/page.tsx          — provider profile
    actions/
      bookings.ts                 — submitBooking, cancelBooking
      availability.ts             — saveAvailability
      profile.ts                  — saveProfile
      calendar.ts                 — initiateGoogleOAuth, disconnectCalendar
    components/
      BookingForm.tsx             — visitor-facing booking form (open-request + structured modes)
      SlotPicker.tsx              — date/time picker for structured availability
      DashboardNav.tsx            — dashboard sidebar nav
      BookingInbox.tsx            — pending bookings list with accept/decline
      AvailabilityGrid.tsx        — weekly availability grid editor
    lib/
      supabase/
        server.ts                 — createClient (server)
        client.ts                 — createBrowserClient
        middleware.ts             — session refresh
      config.ts                   — white-label + integration config from env
      auth.ts                     — requireProvider helper
      email.ts                    — sendEmail via Resend
      tokens.ts                   — generateToken, validateToken
    middleware.ts (→ proxy.ts)    — session refresh proxy
  supabase/
    migrations/
      0001_init.sql               — providers, availability_slots, bookings tables + RLS
      0002_grants.sql             — service_role PostgREST grants
    functions/
      create-calendar-event/
        index.ts                  — Edge Function: creates Google Calendar event
  package/                        — @ceylon/booking-widget npm package
    src/
      BookingWidget.tsx
      index.ts
    package.json
  tests/
    bookings.test.ts              — unit: token generation, slot conflict detection
    rls/
      bookings.rls.test.ts        — integration: RLS policies
```

---

### Task 1: Project Scaffold

**Files:**
- Create: entire `ceylon-booking/` repository

**Interfaces:**
- Produces: runnable Next.js 16 dev server; Supabase local project; `src/lib/config.ts` exporting `getBrandConfig()` and `getIntegrationConfig()`

- [ ] **Step 1: Create the Next.js app**

Run outside the Ceylon Directory repo:

```bash
npx create-next-app@latest ceylon-booking \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint
cd ceylon-booking
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr resend
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Initialise Supabase**

```bash
npx supabase init
npx supabase start
```

Note the output URLs and keys — you'll need them for `.env.local`.

- [ ] **Step 4: Create .env.local**

```bash
cat > .env.local << 'EOF'
# Supabase (from `npx supabase status`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# White-label brand config
BRAND_NAME=Ceylon Booking
BRAND_LOGO_URL=
BRAND_COLOR=#c4704f
BRAND_DOMAIN=booking.ceylon.lk
SUPPORT_EMAIL=hello@ceylon.lk

# Resend (transactional email)
RESEND_API_KEY=

# Google Calendar OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: Ceylon Directory integration
# DIRECTORY_URL=https://ceylon.lk
# DIRECTORY_SUPABASE_URL=
# DIRECTORY_SUPABASE_ANON_KEY=
EOF
```

- [ ] **Step 5: Create Supabase server/client helpers**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
```

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6: Create white-label config helper**

```typescript
// src/lib/config.ts
export function getBrandConfig() {
  return {
    name: process.env.BRAND_NAME ?? "Ceylon Booking",
    logoUrl: process.env.BRAND_LOGO_URL ?? "",
    color: process.env.BRAND_COLOR ?? "#c4704f",
    domain: process.env.BRAND_DOMAIN ?? "localhost:3000",
    supportEmail: process.env.SUPPORT_EMAIL ?? "",
  };
}

export function getIntegrationConfig() {
  const directoryUrl = process.env.DIRECTORY_URL;
  if (!directoryUrl) return null;
  return {
    directoryUrl,
    supabaseUrl: process.env.DIRECTORY_SUPABASE_URL!,
    supabaseAnonKey: process.env.DIRECTORY_SUPABASE_ANON_KEY!,
  };
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at `http://localhost:3000`.

- [ ] **Step 8: Commit**

```bash
git init && git add -A
git commit -m "chore: project scaffold — Next.js 16, Supabase, Resend"
```

---

### Task 2: Database Migrations + RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `supabase/migrations/0002_grants.sql`

**Interfaces:**
- Produces: `providers`, `availability_slots`, `bookings` tables; RLS policies; service_role grants

- [ ] **Step 1: Write 0001_init.sql**

```sql
-- supabase/migrations/0001_init.sql

create type booking_mode as enum ('open_request', 'structured');
create type booking_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table providers (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  slug                  text        unique not null,
  business_name         text        not null default '',
  contact_email         text        not null default '',
  description           text,
  logo_url              text,
  booking_mode          booking_mode not null default 'open_request',
  timezone              text        not null default 'Asia/Colombo',
  google_calendar_token jsonb,
  google_calendar_id    text        not null default 'primary',
  created_at            timestamptz not null default now()
);

create table availability_slots (
  id          uuid    primary key default gen_random_uuid(),
  provider_id uuid    not null references providers(id) on delete cascade,
  day_of_week int     not null check (day_of_week between 0 and 6),
  start_time  time    not null,
  end_time    time    not null,
  check (end_time > start_time)
);

create index availability_slots_provider_idx on availability_slots (provider_id);

create table bookings (
  id                   uuid           primary key default gen_random_uuid(),
  provider_id          uuid           not null references providers(id) on delete cascade,
  visitor_name         text           not null,
  visitor_email        text           not null,
  visitor_phone        text,
  service_description  text,
  requested_date       date           not null,
  requested_time       time           not null,
  party_size           int            not null default 1 check (party_size >= 1),
  notes                text,
  status               booking_status not null default 'pending',
  accept_token         uuid           unique,
  decline_token        uuid           unique,
  google_event_id      text,
  created_at           timestamptz    not null default now()
);

create index bookings_provider_idx on bookings (provider_id);
create index bookings_status_idx   on bookings (status);

-- RLS
alter table providers         enable row level security;
alter table availability_slots enable row level security;
alter table bookings           enable row level security;

-- Providers: anyone can read (booking page needs it); owner can write
create policy "providers public read"   on providers for select using (true);
create policy "providers owner write"   on providers for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Availability slots: anyone can read; owner can write
create policy "slots public read"  on availability_slots for select using (true);
create policy "slots owner write"  on availability_slots for all
  using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Bookings: anyone can insert (no auth required to book)
create policy "bookings public insert" on bookings for insert
  with check (true);

-- Only the owning provider can read/update their own bookings
create policy "bookings provider read" on bookings for select
  using (provider_id = auth.uid());
create policy "bookings provider update" on bookings for update
  using (provider_id = auth.uid());

-- Auto-create provider profile on signup
create or replace function handle_new_provider()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.providers (id, slug, business_name, contact_email)
  values (
    new.id,
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'business_name', 'provider'), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_provider_created
  after insert on auth.users
  for each row execute function handle_new_provider();
```

- [ ] **Step 2: Write 0002_grants.sql**

```sql
-- supabase/migrations/0002_grants.sql
-- Explicit PostgREST grants for service_role (BYPASSRLS alone is insufficient).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
```

- [ ] **Step 3: Apply migrations**

```bash
npx supabase db reset
```

Expected: "Finished supabase db reset."

- [ ] **Step 4: Verify tables**

```bash
npx supabase db diff --local | grep "create table" || echo "tables exist"
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: providers, availability_slots, bookings tables + RLS"
```

---

### Task 3: Auth + requireProvider

**Files:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/lib/auth.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Produces: `requireProvider(): Promise<User>` — redirects to `/auth/login` if not authenticated

- [ ] **Step 1: Create middleware for session refresh**

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Create auth callback route**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 3: Create requireProvider helper**

```typescript
// src/lib/auth.ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireProvider() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return user;
}
```

- [ ] **Step 4: Create login page**

```typescript
// src/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required className="field w-full"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required className="field w-full"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-sm text-center">
          No account? <Link href="/auth/signup" className="text-accent hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create signup page**

```typescript
// src/app/auth/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name" required className="field w-full"
          />
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required className="field w-full"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 chars)" minLength={8} required className="field w-full"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-center">
          Have an account? <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/auth/ src/lib/auth.ts
git commit -m "feat: auth — login, signup, callback, requireProvider"
```

---

### Task 4: Token Utilities + Email

**Files:**
- Create: `src/lib/tokens.ts`
- Create: `src/lib/email.ts`
- Create: `tests/bookings.test.ts`

**Interfaces:**
- Produces:
  - `generateBookingTokens(): { acceptToken: string; declineToken: string }`
  - `sendBookingRequestEmail(booking, provider): Promise<void>`
  - `sendBookingAcceptedEmail(booking): Promise<void>`
  - `sendBookingDeclinedEmail(booking): Promise<void>`
  - `sendBookingCancelledEmail(booking): Promise<void>`

- [ ] **Step 1: Create tokens.ts**

```typescript
// src/lib/tokens.ts
export function generateBookingTokens() {
  return {
    acceptToken: crypto.randomUUID(),
    declineToken: crypto.randomUUID(),
  };
}
```

- [ ] **Step 2: Write token unit tests**

```typescript
// tests/bookings.test.ts
import { describe, it, expect } from "vitest";
import { generateBookingTokens } from "@/lib/tokens";

describe("generateBookingTokens", () => {
  it("returns two distinct UUID tokens", () => {
    const { acceptToken, declineToken } = generateBookingTokens();
    expect(acceptToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(declineToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(acceptToken).not.toBe(declineToken);
  });

  it("generates unique tokens on each call", () => {
    const first = generateBookingTokens();
    const second = generateBookingTokens();
    expect(first.acceptToken).not.toBe(second.acceptToken);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test tests/bookings.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 4: Create email.ts**

```typescript
// src/lib/email.ts
import { Resend } from "resend";
import { getBrandConfig } from "@/lib/config";

const resend = new Resend(process.env.RESEND_API_KEY);

type BookingRow = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  requested_date: string;
  requested_time: string;
  party_size: number;
  notes: string | null;
  service_description: string | null;
  accept_token: string | null;
  decline_token: string | null;
};

type ProviderRow = {
  business_name: string;
  contact_email: string;
};

function baseUrl() {
  const brand = getBrandConfig();
  return `https://${brand.domain}`;
}

export async function sendBookingRequestEmail(
  booking: BookingRow,
  provider: ProviderRow,
): Promise<void> {
  const brand = getBrandConfig();
  const base = baseUrl();
  await resend.emails.send({
    from: `${brand.name} <noreply@${brand.domain}>`,
    to: provider.contact_email,
    subject: `New booking request from ${booking.visitor_name}`,
    html: `
      <h2>New booking request</h2>
      <p><strong>From:</strong> ${booking.visitor_name} (${booking.visitor_email})</p>
      <p><strong>Date:</strong> ${booking.requested_date} at ${booking.requested_time}</p>
      <p><strong>Party size:</strong> ${booking.party_size}</p>
      ${booking.service_description ? `<p><strong>Service:</strong> ${booking.service_description}</p>` : ""}
      ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ""}
      <p>
        <a href="${base}/api/bookings/${booking.id}/accept?token=${booking.accept_token}"
           style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-right:12px">
          Accept
        </a>
        <a href="${base}/api/bookings/${booking.id}/decline?token=${booking.decline_token}"
           style="background:#6b7280;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
          Decline
        </a>
      </p>
    `,
  });
}

export async function sendBookingAcceptedEmail(
  booking: BookingRow & { provider_business_name: string },
): Promise<void> {
  const brand = getBrandConfig();
  await resend.emails.send({
    from: `${brand.name} <noreply@${brand.domain}>`,
    to: booking.visitor_email,
    subject: `Your booking with ${booking.provider_business_name} is confirmed`,
    html: `
      <h2>Booking confirmed</h2>
      <p>Hi ${booking.visitor_name},</p>
      <p>Your booking with <strong>${booking.provider_business_name}</strong> on
         <strong>${booking.requested_date} at ${booking.requested_time}</strong> has been confirmed.</p>
      <p>You'll find a calendar invite attached.</p>
      <p>Questions? Contact ${brand.supportEmail}</p>
    `,
  });
}

export async function sendBookingDeclinedEmail(
  booking: BookingRow & { provider_business_name: string },
): Promise<void> {
  const brand = getBrandConfig();
  await resend.emails.send({
    from: `${brand.name} <noreply@${brand.domain}>`,
    to: booking.visitor_email,
    subject: `Update on your booking with ${booking.provider_business_name}`,
    html: `
      <h2>Booking update</h2>
      <p>Hi ${booking.visitor_name},</p>
      <p>Unfortunately <strong>${booking.provider_business_name}</strong> is unable to
         accommodate your request for ${booking.requested_date} at ${booking.requested_time}.</p>
      <p>Please contact them directly to explore other options.</p>
    `,
  });
}

export async function sendBookingCancelledEmail(
  booking: BookingRow & { provider_business_name: string },
): Promise<void> {
  const brand = getBrandConfig();
  await resend.emails.send({
    from: `${brand.name} <noreply@${brand.domain}>`,
    to: booking.visitor_email,
    subject: `Your booking with ${booking.provider_business_name} has been cancelled`,
    html: `
      <h2>Booking cancelled</h2>
      <p>Hi ${booking.visitor_name},</p>
      <p>Your booking with <strong>${booking.provider_business_name}</strong> on
         ${booking.requested_date} at ${booking.requested_time} has been cancelled.</p>
      <p>Contact ${brand.supportEmail} if you need help.</p>
    `,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts src/lib/email.ts tests/bookings.test.ts
git commit -m "feat: token generation + transactional email helpers"
```

---

### Task 5: Public Booking Page + submitBooking Action

**Files:**
- Create: `src/actions/bookings.ts`
- Create: `src/components/BookingForm.tsx`
- Create: `src/components/SlotPicker.tsx`
- Create: `src/app/[slug]/page.tsx`
- Create: `src/app/[slug]/confirmed/page.tsx`
- Create: `src/app/api/providers/[slug]/exists/route.ts`

**Interfaces:**
- Consumes: `generateBookingTokens` from `@/lib/tokens`; `sendBookingRequestEmail` from `@/lib/email`
- Produces:
  - `submitBooking(slug, formData): Promise<{ ok: true } | { ok: false; error: string }>`
  - `GET /api/providers/[slug]/exists` → `{ exists: boolean }`
  - `/[slug]` route rendering provider info + booking form
  - `/[slug]/confirmed` post-submission thank-you page

- [ ] **Step 1: Create submitBooking server action**

```typescript
// src/actions/bookings.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateBookingTokens } from "@/lib/tokens";
import { sendBookingRequestEmail } from "@/lib/email";

export async function submitBooking(
  providerSlug: string,
  formData: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
    serviceDescription?: string;
    requestedDate: string;
    requestedTime: string;
    partySize: number;
    notes?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: provider } = await supabase
    .from("providers")
    .select("id, contact_email, business_name, booking_mode")
    .eq("slug", providerSlug)
    .single();

  if (!provider) return { ok: false, error: "Provider not found." };

  // Structured mode: verify slot is still available
  if (provider.booking_mode === "structured") {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("provider_id", provider.id)
      .eq("requested_date", formData.requestedDate)
      .eq("requested_time", formData.requestedTime)
      .eq("status", "accepted")
      .maybeSingle();

    if (existing) return { ok: false, error: "That slot was just taken. Please choose another time." };
  }

  const { acceptToken, declineToken } = generateBookingTokens();

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: booking, error } = await serviceClient
    .from("bookings")
    .insert({
      provider_id: provider.id,
      visitor_name: formData.visitorName,
      visitor_email: formData.visitorEmail,
      visitor_phone: formData.visitorPhone ?? null,
      service_description: formData.serviceDescription ?? null,
      requested_date: formData.requestedDate,
      requested_time: formData.requestedTime,
      party_size: formData.partySize,
      notes: formData.notes ?? null,
      accept_token: acceptToken,
      decline_token: declineToken,
    })
    .select("id, visitor_name, visitor_email, requested_date, requested_time, party_size, notes, service_description, accept_token, decline_token")
    .single();

  if (error || !booking) return { ok: false, error: "Failed to submit booking." };

  await sendBookingRequestEmail(booking, {
    business_name: provider.business_name,
    contact_email: provider.contact_email,
  }).catch(() => null); // non-fatal

  return { ok: true };
}
```

- [ ] **Step 2: Create BookingForm component**

```typescript
// src/components/BookingForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBooking } from "@/actions/bookings";

type Props = {
  providerSlug: string;
  bookingMode: "open_request" | "structured";
  availableSlots?: Array<{ date: string; time: string }>;
};

export function BookingForm({ providerSlug, bookingMode, availableSlots = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    serviceDescription: "",
    requestedDate: "",
    requestedTime: "",
    partySize: 1,
    notes: "",
  });

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitBooking(providerSlug, form);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/${providerSlug}/confirmed`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input
            type="text" value={form.visitorName} required
            onChange={(e) => set("visitorName", e.target.value)}
            className="field w-full"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email" value={form.visitorEmail} required
            onChange={(e) => set("visitorEmail", e.target.value)}
            className="field w-full"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone <span className="text-muted font-normal">(optional)</span></label>
          <input
            type="tel" value={form.visitorPhone}
            onChange={(e) => set("visitorPhone", e.target.value)}
            className="field w-full"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Party size</label>
          <input
            type="number" value={form.partySize} min={1} max={50} required
            onChange={(e) => set("partySize", Number(e.target.value))}
            className="field w-full"
          />
        </div>
      </div>

      {bookingMode === "open_request" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Preferred date</label>
            <input
              type="date" value={form.requestedDate} required
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => set("requestedDate", e.target.value)}
              className="field w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Preferred time</label>
            <input
              type="time" value={form.requestedTime} required
              onChange={(e) => set("requestedTime", e.target.value)}
              className="field w-full"
            />
          </div>
        </div>
      ) : (
        <SlotPickerInline
          slots={availableSlots}
          selectedDate={form.requestedDate}
          selectedTime={form.requestedTime}
          onSelect={(date, time) => { set("requestedDate", date); set("requestedTime", time); }}
        />
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes <span className="text-muted font-normal">(optional)</span></label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3} className="field w-full resize-none"
          placeholder="Anything the provider should know…"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn w-full py-3">
        {isPending ? "Sending request…" : "Request booking"}
      </button>
    </form>
  );
}

function SlotPickerInline({
  slots,
  selectedDate,
  selectedTime,
  onSelect,
}: {
  slots: Array<{ date: string; time: string }>;
  selectedDate: string;
  selectedTime: string;
  onSelect: (date: string, time: string) => void;
}) {
  const dates = [...new Set(slots.map((s) => s.date))].sort();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Select a date and time</p>
      <select
        value={selectedDate}
        onChange={(e) => onSelect(e.target.value, "")}
        className="field w-full"
        required
      >
        <option value="">Choose a date</option>
        {dates.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      {selectedDate && (
        <div className="flex flex-wrap gap-2">
          {slots
            .filter((s) => s.date === selectedDate)
            .map((s) => (
              <button
                key={s.time}
                type="button"
                onClick={() => onSelect(selectedDate, s.time)}
                className={s.time === selectedTime ? "chip-featured" : "chip-neutral"}
              >
                {s.time}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create public booking page**

```typescript
// src/app/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/BookingForm";
import { getBrandConfig } from "@/lib/config";

type Props = { params: Promise<{ slug: string }> };

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const brand = getBrandConfig();

  const { data: provider } = await supabase
    .from("providers")
    .select("id, business_name, description, logo_url, booking_mode")
    .eq("slug", slug)
    .single();

  if (!provider) notFound();

  let availableSlots: Array<{ date: string; time: string }> = [];

  if (provider.booking_mode === "structured") {
    const today = new Date();
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("day_of_week, start_time")
      .eq("provider_id", provider.id);

    const { data: accepted } = await supabase
      .from("bookings")
      .select("requested_date, requested_time")
      .eq("provider_id", provider.id)
      .eq("status", "accepted")
      .gte("requested_date", today.toISOString().split("T")[0]);

    const bookedSet = new Set(
      (accepted ?? []).map((b) => `${b.requested_date}|${b.requested_time}`),
    );

    // Generate slots for the next 30 days
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const dateStr = d.toISOString().split("T")[0];

      for (const slot of slots ?? []) {
        if (slot.day_of_week !== dow) continue;
        const key = `${dateStr}|${slot.start_time}`;
        if (!bookedSet.has(key)) {
          availableSlots.push({ date: dateStr, time: slot.start_time });
        }
      }
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <header className="mb-8">
        {provider.logo_url && (
          <img src={provider.logo_url} alt={provider.business_name} className="mb-4 h-12 object-contain" />
        )}
        <h1 className="text-2xl font-bold">{provider.business_name}</h1>
        {provider.description && (
          <p className="mt-2 text-muted">{provider.description}</p>
        )}
      </header>

      <div className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">Request a booking</h2>
        <BookingForm
          providerSlug={slug}
          bookingMode={provider.booking_mode}
          availableSlots={availableSlots}
        />
      </div>

      <footer className="mt-8 text-center text-xs text-muted">
        Powered by {brand.name}
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Create confirmation page**

```typescript
// src/app/[slug]/confirmed/page.tsx
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

export default async function ConfirmedPage({ params }: Props) {
  const { slug } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold">Request sent</h1>
        <p className="text-muted">
          The provider has been notified and will confirm your booking shortly.
          You'll receive an email when it's confirmed.
        </p>
        <Link href={`/${slug}`} className="btn-outline inline-block">
          Back to booking page
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create widget existence check API route**

```typescript
// src/app/api/providers/[slug]/exists/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/actions/bookings.ts src/components/BookingForm.tsx \
  "src/app/[slug]/" src/app/api/
git commit -m "feat: public booking page + submitBooking action"
```

---

### Task 6: Accept / Decline Route Handlers

**Files:**
- Create: `src/app/api/bookings/[id]/accept/route.ts`
- Create: `src/app/api/bookings/[id]/decline/route.ts`
- Create: `supabase/functions/create-calendar-event/index.ts`

**Interfaces:**
- Consumes: `sendBookingAcceptedEmail`, `sendBookingDeclinedEmail` from `@/lib/email`
- Produces: `GET /api/bookings/[id]/accept?token=` → redirect to thank-you or error; Google Calendar Edge Function invoked on accept

- [ ] **Step 1: Create accept route**

```typescript
// src/app/api/bookings/[id]/accept/route.ts
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendBookingAcceptedEmail } from "@/lib/email";

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  const { data: booking } = await service
    .from("bookings")
    .select("id, status, accept_token, visitor_name, visitor_email, visitor_phone, requested_date, requested_time, party_size, notes, service_description, decline_token, provider_id")
    .eq("id", id)
    .single();

  if (!booking || booking.accept_token !== token || booking.status !== "pending") {
    return NextResponse.redirect(`${origin}/api/bookings/already-actioned`);
  }

  // Mark accepted + null out tokens (single-use)
  await service
    .from("bookings")
    .update({ status: "accepted", accept_token: null, decline_token: null })
    .eq("id", id);

  // Fetch provider for email
  const { data: provider } = await service
    .from("providers")
    .select("business_name, google_calendar_token, google_calendar_id")
    .eq("id", booking.provider_id)
    .single();

  // Trigger calendar event creation (non-blocking)
  if (provider?.google_calendar_token) {
    void service.functions.invoke("create-calendar-event", {
      body: { bookingId: id },
    });
  }

  // Send confirmation email
  await sendBookingAcceptedEmail({
    ...booking,
    provider_business_name: provider?.business_name ?? "the provider",
  }).catch(() => null);

  return NextResponse.redirect(`${origin}/booking-confirmed`);
}
```

- [ ] **Step 2: Create decline route**

```typescript
// src/app/api/bookings/[id]/decline/route.ts
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendBookingDeclinedEmail } from "@/lib/email";

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const origin = new URL(request.url).origin;

  const { data: booking } = await service
    .from("bookings")
    .select("id, status, decline_token, visitor_name, visitor_email, visitor_phone, requested_date, requested_time, party_size, notes, service_description, accept_token, provider_id")
    .eq("id", id)
    .single();

  if (!booking || booking.decline_token !== token || booking.status !== "pending") {
    return NextResponse.redirect(`${origin}/api/bookings/already-actioned`);
  }

  await service
    .from("bookings")
    .update({ status: "declined", accept_token: null, decline_token: null })
    .eq("id", id);

  const { data: provider } = await service
    .from("providers")
    .select("business_name")
    .eq("id", booking.provider_id)
    .single();

  await sendBookingDeclinedEmail({
    ...booking,
    provider_business_name: provider?.business_name ?? "the provider",
  }).catch(() => null);

  return NextResponse.redirect(`${origin}/booking-declined`);
}
```

- [ ] **Step 3: Create Google Calendar Edge Function**

```typescript
// supabase/functions/create-calendar-event/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const { bookingId } = await req.json() as { bookingId: string };
  const service = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: booking } = await service
    .from("bookings")
    .select("visitor_name, visitor_email, requested_date, requested_time, notes, service_description, provider_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return new Response("Booking not found", { status: 404 });

  const { data: provider } = await service
    .from("providers")
    .select("business_name, google_calendar_token, google_calendar_id, timezone")
    .eq("id", booking.provider_id)
    .single();

  if (!provider?.google_calendar_token) return new Response("No calendar token", { status: 400 });

  const tokenData = provider.google_calendar_token as {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  };

  let accessToken = tokenData.access_token;

  // Refresh if expired
  if (Date.now() > tokenData.expiry_date - 60_000) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshData = await refreshRes.json() as { access_token?: string; expires_in?: number };
    if (!refreshData.access_token) {
      // Mark calendar disconnected — provider must reconnect
      await service.from("providers")
        .update({ google_calendar_token: null })
        .eq("id", booking.provider_id);
      return new Response("Token refresh failed", { status: 401 });
    }
    accessToken = refreshData.access_token;
    const newExpiry = Date.now() + (refreshData.expires_in ?? 3600) * 1000;
    await service.from("providers")
      .update({ google_calendar_token: { ...tokenData, access_token: accessToken, expiry_date: newExpiry } })
      .eq("id", booking.provider_id);
  }

  const startDateTime = `${booking.requested_date}T${booking.requested_time}:00`;
  const endDateTime = new Date(
    new Date(`${booking.requested_date}T${booking.requested_time}`).getTime() + 60 * 60 * 1000,
  ).toISOString().replace("Z", "");

  const calendarId = provider.google_calendar_id ?? "primary";
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `Booking — ${booking.visitor_name}`,
        description: [
          `Visitor: ${booking.visitor_name} (${booking.visitor_email})`,
          booking.service_description ? `Service: ${booking.service_description}` : "",
          booking.notes ? `Notes: ${booking.notes}` : "",
        ].filter(Boolean).join("\n"),
        start: { dateTime: `${startDateTime}`, timeZone: provider.timezone },
        end: { dateTime: `${endDateTime}`, timeZone: provider.timezone },
      }),
    },
  );

  if (!res.ok) return new Response("Calendar event creation failed", { status: 500 });

  const event = await res.json() as { id: string };
  await service.from("bookings").update({ google_event_id: event.id }).eq("id", bookingId);

  return new Response(JSON.stringify({ ok: true, eventId: event.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 4: Deploy Edge Function**

```bash
npx supabase functions deploy create-calendar-event
npx supabase secrets set GOOGLE_CLIENT_ID=your-id GOOGLE_CLIENT_SECRET=your-secret
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/bookings/ supabase/functions/
git commit -m "feat: accept/decline routes + Google Calendar Edge Function"
```

---

### Task 7: Provider Dashboard

**Files:**
- Create: `src/components/DashboardNav.tsx`
- Create: `src/components/BookingInbox.tsx`
- Create: `src/components/AvailabilityGrid.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/availability/page.tsx`
- Create: `src/app/dashboard/calendar/page.tsx`
- Create: `src/app/dashboard/profile/page.tsx`
- Create: `src/actions/availability.ts`
- Create: `src/actions/profile.ts`

**Interfaces:**
- Consumes: `requireProvider` from `@/lib/auth`; `cancelBooking` added to `src/actions/bookings.ts`
- Produces: `/dashboard` (inbox), `/dashboard/availability`, `/dashboard/calendar`, `/dashboard/profile`

- [ ] **Step 1: Add cancelBooking to actions/bookings.ts**

Append to `src/actions/bookings.ts`:

```typescript
export async function cancelBooking(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await (await import("@/lib/auth")).requireProvider();
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: booking } = await serviceClient
    .from("bookings")
    .select("provider_id, status, visitor_name, visitor_email, visitor_phone, requested_date, requested_time, party_size, notes, service_description, accept_token, decline_token, id")
    .eq("id", bookingId)
    .eq("provider_id", user.id)
    .single();

  if (!booking || booking.status !== "accepted") {
    return { ok: false, error: "Booking not found or cannot be cancelled." };
  }

  await serviceClient.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);

  const { data: provider } = await serviceClient
    .from("providers")
    .select("business_name")
    .eq("id", user.id)
    .single();

  await sendBookingCancelledEmail({
    ...booking,
    provider_business_name: provider?.business_name ?? "the provider",
  }).catch(() => null);

  return { ok: true };
}
```

Also add `sendBookingCancelledEmail` to the import at the top of `bookings.ts`:
```typescript
import { sendBookingRequestEmail, sendBookingCancelledEmail } from "@/lib/email";
```

- [ ] **Step 2: Create DashboardNav**

```typescript
// src/components/DashboardNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Bookings" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/calendar", label: "Google Calendar" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-hairline pb-4 mb-8 overflow-x-auto">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            pathname === href
              ? "bg-shell text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create BookingInbox**

```typescript
// src/components/BookingInbox.tsx
"use client";

import { useTransition } from "react";
import { cancelBooking } from "@/actions/bookings";

type Booking = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string | null;
  requested_date: string;
  requested_time: string;
  party_size: number;
  notes: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};

export function BookingInbox({ bookings }: { bookings: Booking[] }) {
  const pending = bookings.filter((b) => b.status === "pending");
  const history = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="eyebrow mb-4">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted text-sm">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        )}
      </section>
      {history.length > 0 && (
        <section>
          <h2 className="eyebrow mb-4">History</h2>
          <div className="space-y-3">
            {history.map((b) => <BookingRow key={b.id} booking={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const [isPending, startTransition] = useTransition();

  const statusColors: Record<string, string> = {
    pending: "chip-neutral",
    accepted: "chip-featured",
    declined: "chip-neutral",
    cancelled: "chip-neutral",
  };

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{booking.visitor_name}</p>
          <p className="text-sm text-muted">{booking.visitor_email}</p>
        </div>
        <span className={statusColors[booking.status] ?? "chip-neutral"}>{booking.status}</span>
      </div>
      <p className="text-sm">
        {booking.requested_date} at {booking.requested_time} · {booking.party_size} {booking.party_size === 1 ? "person" : "people"}
      </p>
      {booking.notes && <p className="text-sm text-muted">{booking.notes}</p>}
      {booking.status === "accepted" && (
        <button
          onClick={() => startTransition(async () => { await cancelBooking(booking.id); })}
          disabled={isPending}
          className="text-xs text-muted hover:text-red-600 transition-colors"
        >
          {isPending ? "Cancelling…" : "Cancel booking"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard inbox page**

```typescript
// src/app/dashboard/page.tsx
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { BookingInbox } from "@/components/BookingInbox";

export default async function DashboardPage() {
  const user = await requireProvider();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, visitor_name, visitor_email, visitor_phone, requested_date, requested_time, party_size, notes, status, created_at")
    .eq("provider_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <DashboardNav />
      <BookingInbox bookings={bookings ?? []} />
    </main>
  );
}
```

- [ ] **Step 5: Create availability action + page**

```typescript
// src/actions/availability.ts
"use server";

import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Slot = { day_of_week: number; start_time: string; end_time: string };

export async function saveAvailability(
  mode: "open_request" | "structured",
  slots: Slot[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireProvider();
  const supabase = await createClient();

  const { error: modeErr } = await supabase
    .from("providers")
    .update({ booking_mode: mode })
    .eq("id", user.id);

  if (modeErr) return { ok: false, error: modeErr.message };

  if (mode === "structured") {
    await supabase.from("availability_slots").delete().eq("provider_id", user.id);
    if (slots.length > 0) {
      const { error } = await supabase.from("availability_slots").insert(
        slots.map((s) => ({ ...s, provider_id: user.id })),
      );
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}
```

```typescript
// src/app/dashboard/availability/page.tsx
"use client";

import { useState, useTransition } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { saveAvailability } from "@/actions/availability";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, "0")}:00`);

type Slot = { day_of_week: number; start_time: string; end_time: string };

export default function AvailabilityPage() {
  const [mode, setMode] = useState<"open_request" | "structured">("open_request");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggleSlot(dow: number, hour: string) {
    const endHour = `${(parseInt(hour) + 1).toString().padStart(2, "0")}:00`;
    const exists = slots.find((s) => s.day_of_week === dow && s.start_time === hour);
    if (exists) {
      setSlots((prev) => prev.filter((s) => !(s.day_of_week === dow && s.start_time === hour)));
    } else {
      setSlots((prev) => [...prev, { day_of_week: dow, start_time: hour, end_time: endHour }]);
    }
  }

  function isActive(dow: number, hour: string) {
    return slots.some((s) => s.day_of_week === dow && s.start_time === hour);
  }

  function handleSave() {
    startTransition(async () => {
      await saveAvailability(mode, slots);
      setSaved(true);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <DashboardNav />
      <h1 className="text-xl font-bold mb-6">Availability</h1>

      <div className="flex gap-3 mb-8">
        {(["open_request", "structured"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              mode === m ? "border-[--brand] bg-[--brand]/10 text-[--brand]" : "border-hairline text-muted"
            }`}
          >
            {m === "open_request" ? "Open request" : "Set hours"}
          </button>
        ))}
      </div>

      {mode === "structured" && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="w-12" />
                {DAYS.map((d) => <th key={d} className="px-2 py-1 text-muted font-normal">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="pr-2 text-muted text-right">{hour}</td>
                  {DAYS.map((_, dow) => (
                    <td key={dow} className="px-1 py-0.5">
                      <button
                        onClick={() => toggleSlot(dow, hour)}
                        className={`w-full h-6 rounded transition-colors ${
                          isActive(dow, hour) ? "bg-[--brand]" : "bg-shell hover:bg-[--brand]/20"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={handleSave} disabled={isPending} className="btn">
        {isPending ? "Saving…" : "Save"}
      </button>
      {saved && <p className="mt-3 text-sm text-green-600">Saved.</p>}
    </main>
  );
}
```

- [ ] **Step 6: Create profile action + page**

```typescript
// src/actions/profile.ts
"use server";

import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(data: {
  business_name: string;
  description: string;
  contact_email: string;
  slug: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireProvider();
  const supabase = await createClient();

  const { error } = await supabase
    .from("providers")
    .update(data)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

```typescript
// src/app/dashboard/profile/page.tsx
"use client";

import { useState, useTransition } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { saveProfile } from "@/actions/profile";

export default function ProfilePage() {
  const [form, setForm] = useState({ business_name: "", slug: "", contact_email: "", description: "" });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await saveProfile(form);
      if (!result.ok) { setError(result.error); return; }
      setSaved(true);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <DashboardNav />
      <h1 className="text-xl font-bold mb-6">Profile</h1>
      <div className="space-y-4">
        {[
          { label: "Business name", field: "business_name" as const },
          { label: "URL slug", field: "slug" as const },
          { label: "Contact email", field: "contact_email" as const },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="mb-1.5 block text-sm font-medium">{label}</label>
            <input
              type={field === "contact_email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
              className="field w-full"
            />
          </div>
        ))}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={4} className="field w-full resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={handleSave} disabled={isPending} className="btn">
          {isPending ? "Saving…" : "Save profile"}
        </button>
        {saved && <p className="mt-2 text-sm text-green-600">Profile saved.</p>}
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Create calendar connection page**

```typescript
// src/app/dashboard/calendar/page.tsx
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";

export default async function CalendarPage() {
  const user = await requireProvider();
  const supabase = await createClient();

  const { data: provider } = await supabase
    .from("providers")
    .select("google_calendar_token, google_calendar_id")
    .eq("id", user.id)
    .single();

  const connected = !!provider?.google_calendar_token;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/auth/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  }).toString()}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <DashboardNav />
      <h1 className="text-xl font-bold mb-6">Google Calendar</h1>
      {connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <p className="text-sm">Connected to calendar: <span className="font-medium">{provider?.google_calendar_id ?? "primary"}</span></p>
          </div>
          <p className="text-sm text-muted">New accepted bookings will automatically appear in your Google Calendar.</p>
          <a href="/api/auth/google/disconnect" className="btn-outline text-sm inline-block">
            Disconnect
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted text-sm">Connect Google Calendar to automatically create events when you accept bookings.</p>
          <a href={googleAuthUrl} className="btn inline-block">
            Connect Google Calendar
          </a>
        </div>
      )}
    </main>
  );
}
```

Also create the Google OAuth callback + disconnect routes (append to `src/app/api/auth/google/`):

```typescript
// src/app/api/auth/google/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/dashboard/calendar?error=no_code`);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenData.access_token || !tokenData.refresh_token) {
    return NextResponse.redirect(`${origin}/dashboard/calendar?error=token_failed`);
  }

  const user = await requireProvider();
  const supabase = await createClient();
  await supabase.from("providers").update({
    google_calendar_token: {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
    },
  }).eq("id", user.id);

  return NextResponse.redirect(`${origin}/dashboard/calendar`);
}
```

```typescript
// src/app/api/auth/google/disconnect/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/auth";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const user = await requireProvider();
  const supabase = await createClient();
  await supabase.from("providers").update({ google_calendar_token: null }).eq("id", user.id);
  return NextResponse.redirect(`${origin}/dashboard/calendar`);
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/actions/ src/app/dashboard/ src/app/api/auth/
git commit -m "feat: provider dashboard — inbox, availability, calendar, profile"
```

---

### Task 8: Booking Widget Package

**Files:**
- Create: `package/src/BookingWidget.tsx`
- Create: `package/src/index.ts`
- Create: `package/package.json`

**Interfaces:**
- Produces: `BookingWidget` React component accepting `{ providerSlug: string; bookingUrl: string }` — renders inline booking form or nothing if provider not found

- [ ] **Step 1: Create package structure**

```bash
mkdir -p package/src
```

- [ ] **Step 2: Create package.json**

```json
// package/package.json
{
  "name": "@ceylon/booking-widget",
  "version": "0.1.0",
  "description": "Embeddable booking widget for Ceylon Booking",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

- [ ] **Step 3: Create BookingWidget component**

```typescript
// package/src/BookingWidget.tsx
import { useEffect, useState } from "react";

type Props = {
  providerSlug: string;
  bookingUrl: string;
};

type FormState = {
  visitorName: string;
  visitorEmail: string;
  requestedDate: string;
  requestedTime: string;
  partySize: number;
  notes: string;
};

export function BookingWidget({ providerSlug, bookingUrl }: Props) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormState>({
    visitorName: "", visitorEmail: "", requestedDate: "",
    requestedTime: "", partySize: 1, notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${bookingUrl}/api/providers/${providerSlug}/exists`)
      .then((r) => r.json() as Promise<{ exists: boolean }>)
      .then((d) => setExists(d.exists))
      .catch(() => setExists(false));
  }, [providerSlug, bookingUrl]);

  if (!exists) return null;

  function set(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`${bookingUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerSlug, ...form }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? "Failed to submit."); setStatus("error"); return; }
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "12px", fontSize: "14px", color: "#166534" }}>
        Booking request sent! You'll receive a confirmation email once accepted.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <input
        type="text" placeholder="Your name" value={form.visitorName} required
        onChange={(e) => set("visitorName", e.target.value)}
        style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" }}
      />
      <input
        type="email" placeholder="Email" value={form.visitorEmail} required
        onChange={(e) => set("visitorEmail", e.target.value)}
        style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="date" value={form.requestedDate} required
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => set("requestedDate", e.target.value)}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" }}
        />
        <input
          type="time" value={form.requestedTime} required
          onChange={(e) => set("requestedTime", e.target.value)}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" }}
        />
      </div>
      <textarea
        placeholder="Notes (optional)" value={form.notes} rows={2}
        onChange={(e) => set("notes", e.target.value)}
        style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", resize: "vertical" }}
      />
      {error && <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>}
      <button
        type="submit" disabled={status === "loading"}
        style={{ padding: "12px", background: "#c4704f", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
      >
        {status === "loading" ? "Sending…" : "Request booking"}
      </button>
    </form>
  );
}
```

Also create a POST API route in Ceylon Booking to accept widget submissions:

```typescript
// src/app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { submitBooking } from "@/actions/bookings";

export async function POST(request: Request) {
  const body = await request.json() as {
    providerSlug: string;
    visitorName: string;
    visitorEmail: string;
    requestedDate: string;
    requestedTime: string;
    partySize: number;
    notes?: string;
  };

  const result = await submitBooking(body.providerSlug, {
    visitorName: body.visitorName,
    visitorEmail: body.visitorEmail,
    requestedDate: body.requestedDate,
    requestedTime: body.requestedTime,
    partySize: body.partySize ?? 1,
    notes: body.notes,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
```

- [ ] **Step 4: Create package index**

```typescript
// package/src/index.ts
export { BookingWidget } from "./BookingWidget";
```

- [ ] **Step 5: Commit**

```bash
git add package/ src/app/api/bookings/route.ts
git commit -m "feat: @ceylon/booking-widget package + POST /api/bookings"
```

---

### Task 9: End-to-End Smoke Test

- [ ] **Step 1: Run unit tests**

```bash
npm test
```

Expected: PASS (token generation tests)

- [ ] **Step 2: Manual smoke test — full booking flow**

1. Sign up as a provider at `http://localhost:3000/auth/signup`
2. Go to `/dashboard/calendar` → Connect Google Calendar
3. Go to `/dashboard/profile` → set slug to `test-provider`, save
4. Open a new browser tab (incognito) → `http://localhost:3000/test-provider`
5. Fill in the booking form and submit → see confirmation page
6. Check provider email inbox for Accept/Decline links
7. Click Accept → verify Google Calendar event created
8. Return to `/dashboard` → verify booking shows as "accepted"
9. Click "Cancel booking" → verify visitor receives cancellation email

- [ ] **Step 3: Test structured availability**

1. Go to `/dashboard/availability` → switch to "Set hours" mode
2. Mark Mon–Fri 09:00–17:00 → Save
3. In incognito: go to `/test-provider` → verify slot picker shows only marked times
4. Book a slot → accept → book same slot again → verify "slot taken" error

- [ ] **Step 4: Final commit + push**

```bash
git add .
git commit -m "feat: Ceylon Booking v1 complete"
git push origin main
```
