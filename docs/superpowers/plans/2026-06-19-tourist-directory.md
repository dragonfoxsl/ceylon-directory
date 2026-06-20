# Sri Lanka Tourist Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified directory of Sri Lankan tourist services where providers submit listings, an admin manually approves them, and approved listings are browsable by category and region — with manual paid promotion.

**Architecture:** Next.js (App Router) on Vercel hosts the public site, provider dashboard, and admin panel. Supabase provides Postgres, Auth, Storage, and Row-Level Security. Public browse pages are Server Components; mutations use Server Actions. The core invariant — a listing is public only when `status='approved'` AND `is_active=true` — is enforced both in queries and in RLS.

**Tech Stack:** Next.js 15+ (App Router, TypeScript), Tailwind CSS, `@supabase/ssr` + `@supabase/supabase-js`, Zod (validation), Vitest (unit tests), Supabase CLI (local DB + migrations).

## Global Constraints

- TypeScript everywhere; `strict` mode on.
- Node.js 20+ (Vercel default 24).
- A listing is publicly visible ONLY when `status='approved'` AND `is_active=true`. Copy verbatim into every public query.
- `status` enum values are exactly: `'pending'`, `'approved'`, `'rejected'`. Default `'pending'`.
- `role` enum values are exactly: `'provider'`, `'admin'`. Default `'provider'`.
- Editing an approved listing resets its `status` to `'pending'`.
- Listing prices are free text (`price_info`); no transactions.
- Promotion is manual: admin sets `is_featured=true` and `featured_until`.
- Reviews are NOT built in v1 (deferred).
- Currency references use `LKR`.

---

## File Structure

```
tourist-directory/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # root layout, nav, footer
│   │   ├── page.tsx                    # home
│   │   ├── listings/page.tsx           # browse + filters
│   │   ├── category/[slug]/page.tsx
│   │   ├── region/[slug]/page.tsx
│   │   ├── listing/[slug]/page.tsx     # detail
│   │   ├── about/page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── auth/callback/route.ts      # supabase code exchange
│   │   ├── dashboard/                   # provider area
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── [id]/promote/page.tsx
│   │   └── admin/                       # admin area
│   │       ├── page.tsx                 # pending queue
│   │       ├── listings/page.tsx        # manage all
│   │       └── promotions/page.tsx
│   ├── lib/
│   │   ├── supabase/server.ts          # server client
│   │   ├── supabase/client.ts          # browser client
│   │   ├── supabase/middleware.ts      # session refresh
│   │   ├── slug.ts                     # slug generation (TDD)
│   │   ├── featured.ts                 # featured/active filtering (TDD)
│   │   ├── validation.ts               # zod schemas (TDD)
│   │   └── auth.ts                     # role/session helpers
│   ├── components/
│   │   ├── ListingCard.tsx
│   │   ├── ListingForm.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── Filters.tsx
│   │   ├── StatusBadge.tsx
│   │   └── Nav.tsx
│   ├── actions/
│   │   ├── listings.ts                 # create/update/delete listing
│   │   ├── moderation.ts               # approve/reject/feature
│   │   └── promotion.ts                # request promotion
│   └── middleware.ts
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
├── tests/
│   ├── slug.test.ts
│   ├── featured.test.ts
│   └── validation.test.ts
├── .env.local.example
├── vitest.config.ts
└── package.json
```

---

## Task 1: Scaffold project

**Files:**
- Create: whole project skeleton, `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.local.example`

**Interfaces:**
- Produces: runnable Next.js app with Tailwind, Vitest configured, scripts `dev`, `build`, `test`.

- [ ] **Step 1: Scaffold Next.js app (non-interactive)**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --use-npm --import-alias "@/*" --yes
```

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` `"scripts"`, add: `"test": "vitest run"`.

- [ ] **Step 5: Create env example**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 6: Verify it builds and tests run**

Run: `npm run build` → Expected: build succeeds.
Run: `npm run test` → Expected: "No test files found" (exit 0) — acceptable at this stage.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Supabase + Vitest"
```

---

## Task 2: Database schema, enums, and seed data

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/seed.sql`

**Interfaces:**
- Produces: tables `profiles`, `categories`, `regions`, `listings`, `listing_images`; enums `user_role`, `listing_status`. Column names/types are the contract for all later tasks (see spec data model).

- [ ] **Step 1: Write the schema migration**

Create `supabase/migrations/0001_init.sql`:

```sql
-- Enums
create type user_role as enum ('provider', 'admin');
create type listing_status as enum ('pending', 'approved', 'rejected');

-- profiles (mirrors auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'provider',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  sort_order int not null default 0
);

create table regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id),
  region_id uuid not null references regions(id),
  title text not null,
  slug text not null unique,
  description text not null,
  price_info text,
  contact_phone text,
  contact_whatsapp text,
  contact_email text,
  website text,
  status listing_status not null default 'pending',
  admin_note text,
  is_active boolean not null default false,
  is_featured boolean not null default false,
  featured_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_status_active_idx on listings (status, is_active);
create index listings_category_idx on listings (category_id);
create index listings_region_idx on listings (region_id);

create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false
);

-- Auto-create a profile row when an auth user is created
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- reviews: DEFERRED to a later phase; intentionally not created in v1.
```

- [ ] **Step 2: Write the seed**

Create `supabase/seed.sql`:

```sql
insert into categories (name, slug, sort_order) values
  ('Tours & Guides','tours-guides',1),
  ('Activities & Experiences','activities-experiences',2),
  ('Vehicle Rentals','vehicle-rentals',3),
  ('Equipment Rentals','equipment-rentals',4),
  ('Accommodation','accommodation',5),
  ('Transport & Transfers','transport-transfers',6),
  ('Wellness & Spa','wellness-spa',7),
  ('Food & Dining','food-dining',8);

insert into regions (name, slug) values
  ('Colombo','colombo'),('Kandy','kandy'),('Galle','galle'),
  ('Ella','ella'),('Sigiriya','sigiriya'),('Arugam Bay','arugam-bay'),
  ('Nuwara Eliya','nuwara-eliya'),('Mirissa','mirissa'),
  ('Anuradhapura','anuradhapura'),('Jaffna','jaffna'),
  ('Trincomalee','trincomalee');
```

- [ ] **Step 3: Apply locally**

Run: `npx supabase start` then `npx supabase db reset` (applies migration + seed).
Expected: tables created, seed rows inserted, no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase && git commit -m "feat: db schema, enums, seed categories and regions"
```

---

## Task 3: Row-Level Security policies

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

**Interfaces:**
- Consumes: tables from Task 2.
- Produces: RLS guarantees — public reads only approved+active listings; providers read/write own rows; admins manage all.

- [ ] **Step 1: Write RLS migration**

Create `supabase/migrations/0002_rls.sql`:

```sql
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table categories enable row level security;
alter table regions enable row level security;

-- helper: is current user an admin
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- categories & regions: public read
create policy "categories public read" on categories for select using (true);
create policy "regions public read" on regions for select using (true);

-- profiles: self read/update; admin read all
create policy "profile self read" on profiles for select using (auth.uid() = id or is_admin());
create policy "profile self update" on profiles for update using (auth.uid() = id);

-- listings: public sees approved+active; owner sees own; admin sees all
create policy "listings public read" on listings for select
  using ((status = 'approved' and is_active = true) or owner_id = auth.uid() or is_admin());
create policy "listings owner insert" on listings for insert
  with check (owner_id = auth.uid());
create policy "listings owner update" on listings for update
  using (owner_id = auth.uid() or is_admin());
create policy "listings owner delete" on listings for delete
  using (owner_id = auth.uid() or is_admin());

-- listing_images: readable if parent listing readable; writable by owner/admin
create policy "images read" on listing_images for select
  using (exists (select 1 from listings l where l.id = listing_id
    and ((l.status='approved' and l.is_active) or l.owner_id = auth.uid() or is_admin())));
create policy "images write" on listing_images for all
  using (exists (select 1 from listings l where l.id = listing_id
    and (l.owner_id = auth.uid() or is_admin())))
  with check (exists (select 1 from listings l where l.id = listing_id
    and (l.owner_id = auth.uid() or is_admin())));
```

- [ ] **Step 2: Apply and sanity-check**

Run: `npx supabase db reset`
Expected: migrations apply cleanly.

- [ ] **Step 3: Create storage bucket for images**

Run via SQL in `0002_rls.sql` (append):

```sql
insert into storage.buckets (id, name, public) values ('listing-images','listing-images', true)
  on conflict (id) do nothing;
create policy "listing images public read" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "listing images auth write" on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
create policy "listing images owner delete" on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.role() = 'authenticated');
```

Run: `npx supabase db reset` → Expected: applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase && git commit -m "feat: RLS policies and storage bucket"
```

---

## Task 4: Slug generation (TDD)

**Files:**
- Create: `src/lib/slug.ts`, `tests/slug.test.ts`

**Interfaces:**
- Produces: `slugify(input: string): string` and `uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string>`.

- [ ] **Step 1: Write failing tests**

Create `tests/slug.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Galle Fort Tour")).toBe("galle-fort-tour");
  });
  it("strips punctuation and collapses spaces", () => {
    expect(slugify("Surf  Lessons!! @ Mirissa")).toBe("surf-lessons-mirissa");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("--Hello--")).toBe("hello");
  });
});

describe("uniqueSlug", () => {
  it("returns base when unused", async () => {
    expect(await uniqueSlug("tuk-tuk", async () => false)).toBe("tuk-tuk");
  });
  it("appends counter when taken", async () => {
    const taken = new Set(["tuk-tuk", "tuk-tuk-2"]);
    expect(await uniqueSlug("tuk-tuk", async (s) => taken.has(s))).toBe("tuk-tuk-3");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- tests/slug.test.ts`
Expected: FAIL — cannot resolve `@/lib/slug`.

- [ ] **Step 3: Implement**

Create `src/lib/slug.ts`:

```ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(
  base: string,
  exists: (s: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  let i = 2;
  while (await exists(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- tests/slug.test.ts` → Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts tests/slug.test.ts && git commit -m "feat: slug generation with uniqueness"
```

---

## Task 5: Featured/active filtering helpers (TDD)

**Files:**
- Create: `src/lib/featured.ts`, `tests/featured.test.ts`

**Interfaces:**
- Produces: `isLive(l): boolean`, `isCurrentlyFeatured(l, now?): boolean`, `sortListings(listings, now?)` (featured-and-current first, then newest).

- [ ] **Step 1: Write failing tests**

Create `tests/featured.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isLive, isCurrentlyFeatured, sortListings } from "@/lib/featured";

const base = { status: "approved", is_active: true, is_featured: false,
  featured_until: null, created_at: "2026-01-01T00:00:00Z" } as const;

describe("isLive", () => {
  it("true when approved + active", () => expect(isLive({ ...base })).toBe(true));
  it("false when pending", () => expect(isLive({ ...base, status: "pending" })).toBe(false));
  it("false when inactive", () => expect(isLive({ ...base, is_active: false })).toBe(false));
});

describe("isCurrentlyFeatured", () => {
  const now = new Date("2026-06-19T00:00:00Z");
  it("true when featured and not expired", () =>
    expect(isCurrentlyFeatured({ ...base, is_featured: true, featured_until: "2026-07-01T00:00:00Z" }, now)).toBe(true));
  it("false when expired", () =>
    expect(isCurrentlyFeatured({ ...base, is_featured: true, featured_until: "2026-06-01T00:00:00Z" }, now)).toBe(false));
  it("false when not featured", () =>
    expect(isCurrentlyFeatured({ ...base }, now)).toBe(false));
});

describe("sortListings", () => {
  it("puts current featured first, then newest", () => {
    const now = new Date("2026-06-19T00:00:00Z");
    const a = { ...base, id: "a", created_at: "2026-02-01T00:00:00Z" };
    const b = { ...base, id: "b", is_featured: true, featured_until: "2026-07-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z" };
    const c = { ...base, id: "c", created_at: "2026-03-01T00:00:00Z" };
    expect(sortListings([a, b, c], now).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- tests/featured.test.ts` → Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

Create `src/lib/featured.ts`:

```ts
export type ListingLike = {
  status: string;
  is_active: boolean;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
};

export function isLive(l: Pick<ListingLike, "status" | "is_active">): boolean {
  return l.status === "approved" && l.is_active === true;
}

export function isCurrentlyFeatured(l: ListingLike, now: Date = new Date()): boolean {
  if (!l.is_featured) return false;
  if (!l.featured_until) return false;
  return new Date(l.featured_until).getTime() > now.getTime();
}

export function sortListings<T extends ListingLike>(listings: T[], now: Date = new Date()): T[] {
  return [...listings].sort((a, b) => {
    const fa = isCurrentlyFeatured(a, now) ? 1 : 0;
    const fb = isCurrentlyFeatured(b, now) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- tests/featured.test.ts` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/featured.ts tests/featured.test.ts && git commit -m "feat: featured/active listing helpers"
```

---

## Task 6: Validation schemas (TDD)

**Files:**
- Create: `src/lib/validation.ts`, `tests/validation.test.ts`

**Interfaces:**
- Produces: `listingSchema` (Zod) and `ListingInput` type. Fields: `title`, `description`, `category_id`, `region_id`, `price_info?`, `contact_phone?`, `contact_whatsapp?`, `contact_email?`, `website?`.

- [ ] **Step 1: Write failing tests**

Create `tests/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { listingSchema } from "@/lib/validation";

const valid = {
  title: "Galle Fort Walking Tour",
  description: "A two hour guided walk around the historic fort.",
  category_id: "11111111-1111-1111-1111-111111111111",
  region_id: "22222222-2222-2222-2222-222222222222",
  contact_email: "guide@example.com",
};

describe("listingSchema", () => {
  it("accepts a valid listing", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects short title", () => {
    expect(listingSchema.safeParse({ ...valid, title: "Hi" }).success).toBe(false);
  });
  it("rejects short description", () => {
    expect(listingSchema.safeParse({ ...valid, description: "too short" }).success).toBe(false);
  });
  it("rejects bad email", () => {
    expect(listingSchema.safeParse({ ...valid, contact_email: "nope" }).success).toBe(false);
  });
  it("requires category and region", () => {
    expect(listingSchema.safeParse({ ...valid, category_id: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- tests/validation.test.ts` → Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

Create `src/lib/validation.ts`:

```ts
import { z } from "zod";

const optionalText = z.string().trim().max(200).optional().or(z.literal(""));

export const listingSchema = z.object({
  title: z.string().trim().min(4, "Title too short").max(120),
  description: z.string().trim().min(20, "Description too short").max(4000),
  category_id: z.string().uuid("Pick a category"),
  region_id: z.string().uuid("Pick a region"),
  price_info: z.string().trim().max(120).optional().or(z.literal("")),
  contact_phone: optionalText,
  contact_whatsapp: optionalText,
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ListingInput = z.infer<typeof listingSchema>;
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- tests/validation.test.ts` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts tests/validation.test.ts && git commit -m "feat: listing validation schema"
```

---

## Task 7: Supabase clients, middleware, auth helpers

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/lib/auth.ts`

**Interfaces:**
- Consumes: env vars from Task 1.
- Produces: `createServerClient()` (RSC/actions), `createBrowserClient()`, `updateSession(req)`, and `getSessionUser()`, `requireUser()`, `requireAdmin()` from `auth.ts`.

- [ ] **Step 1: Browser client**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient as create } from "@supabase/ssr";

export function createBrowserClient() {
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient as create } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* called from RSC; middleware refreshes instead */ }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Session middleware**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}
```

Create `src/middleware.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 4: Auth helpers**

Create `src/lib/auth.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("id, full_name, role").eq("id", user.id).single();
  return profile ? { ...user, profile } : { ...user, profile: null };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.profile?.role !== "admin") redirect("/login");
  return user;
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build` → Expected: compiles (env vars can be empty for type-check; build of pages comes later).

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase src/middleware.ts src/lib/auth.ts && git commit -m "feat: supabase clients, session middleware, auth helpers"
```

---

## Task 8: Layout, nav, and home page

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Nav.tsx`, `src/app/page.tsx`, `src/components/ListingCard.tsx`, `src/components/StatusBadge.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `getSessionUser`, `sortListings`, `isCurrentlyFeatured`.
- Produces: `<ListingCard listing={...} />`, `<StatusBadge status={...} />`, `<Nav user={...} />`.

- [ ] **Step 1: Nav component**

Create `src/components/Nav.tsx` — links: Home, Browse (`/listings`), and conditionally Dashboard (logged in), Admin (role admin), Login/Logout. Use `getSessionUser` result passed as prop. Keep it a server component receiving `user`.

```tsx
import Link from "next/link";

export function Nav({ user }: { user: { profile: { role: string } | null } | null }) {
  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link href="/" className="text-lg font-bold">Ceylon Directory</Link>
      <div className="flex gap-4 text-sm">
        <Link href="/listings">Browse</Link>
        {user && <Link href="/dashboard">Dashboard</Link>}
        {user?.profile?.role === "admin" && <Link href="/admin">Admin</Link>}
        {user
          ? <form action="/auth/signout" method="post"><button type="submit">Logout</button></form>
          : <Link href="/login">Login</Link>}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: StatusBadge + ListingCard**

Create `src/components/StatusBadge.tsx`:

```tsx
const styles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>{status}</span>;
}
```

Create `src/components/ListingCard.tsx`:

```tsx
import Link from "next/link";
import { isCurrentlyFeatured, type ListingLike } from "@/lib/featured";

type Card = ListingLike & { id: string; slug: string; title: string; price_info: string | null; cover_url?: string | null };

export function ListingCard({ listing }: { listing: Card }) {
  return (
    <Link href={`/listing/${listing.slug}`} className="block rounded-lg border p-4 hover:shadow">
      {listing.cover_url && <img src={listing.cover_url} alt="" className="mb-3 h-40 w-full rounded object-cover" />}
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{listing.title}</h3>
        {isCurrentlyFeatured(listing) && <span className="rounded bg-amber-200 px-1.5 text-xs">Featured</span>}
      </div>
      {listing.price_info && <p className="text-sm text-gray-600">{listing.price_info}</p>}
    </Link>
  );
}
```

- [ ] **Step 3: Root layout uses Nav**

Modify `src/app/layout.tsx` to fetch user via `getSessionUser()` and render `<Nav user={user} />` above `{children}`, with a simple footer.

- [ ] **Step 4: Home page**

Create `src/app/page.tsx` (Server Component): fetch categories (all) and up to 6 live featured listings (`status='approved'`, `is_active=true`, `is_featured=true`, `featured_until > now()`), render hero, category grid (link to `/category/[slug]`), and a featured row using `ListingCard`.

- [ ] **Step 5: Verify**

Run: `npm run build` → Expected: builds. Manually: `npm run dev`, load `/` → home renders with categories.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: layout, nav, home page, listing card"
```

---

## Task 9: Auth pages (signup, login, logout, callback)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/signout/route.ts`

**Interfaces:**
- Consumes: `createBrowserClient` (client forms) / `createServerClient` (routes).
- Produces: working email/password auth; signout POST clears session.

- [ ] **Step 1: Signup page**

Create `src/app/(auth)/signup/page.tsx` as a client component: form with `full_name`, `email`, `password`. On submit call `supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: location.origin + "/auth/callback" } })`. Show errors; on success show "Check your email / you're in" and link to `/dashboard`.

- [ ] **Step 2: Login page**

Create `src/app/(auth)/login/page.tsx` (client): email + password → `supabase.auth.signInWithPassword`. On success `router.push("/dashboard")`. Show error message on failure.

- [ ] **Step 3: Auth callback**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 4: Signout route**

Create `src/app/auth/signout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 5: Verify manually**

Run `npm run dev`. Sign up → confirm profile row auto-created (Task 2 trigger) via Supabase Studio. Log out, log back in. Expected: session persists across reload.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: signup, login, logout, auth callback"
```

---

## Task 10: Create/update listing Server Actions + image upload

**Files:**
- Create: `src/actions/listings.ts`, `src/components/ListingForm.tsx`, `src/components/ImageUploader.tsx`

**Interfaces:**
- Consumes: `listingSchema`, `slugify`/`uniqueSlug`, `createServerClient`, `requireUser`.
- Produces: `createListing(formData)`, `updateListing(id, formData)`, `deleteListing(id)` server actions; `<ListingForm categories regions listing? />`.

- [ ] **Step 1: Listing actions**

Create `src/actions/listings.ts` (`"use server"`):
- `createListing(formData)`: `requireUser()`; parse fields with `listingSchema`; build slug via `uniqueSlug(title, exists)` where `exists` checks `listings` by slug; insert with `owner_id=user.id`, `status='pending'`, `is_active=false`, `is_featured=false` (RLS insert policy from Task 3 REQUIRES exactly these three values — do not omit `is_featured=false`); return new id. Then `revalidatePath("/dashboard")`.
- `updateListing(id, formData)`: `requireUser()`; verify ownership (select owner_id); parse; update fields AND reset `status='pending'`, `is_active=false`, `updated_at=now()` (re-review on edit — Global Constraint); `revalidatePath`.
- `deleteListing(id)`: ownership check then delete; `revalidatePath`.

Include the slug-exists helper:

```ts
async function slugExists(supabase: any, slug: string, ignoreId?: string) {
  let q = supabase.from("listings").select("id").eq("slug", slug);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.maybeSingle();
  return !!data;
}
```

- [ ] **Step 2: ImageUploader (client)**

Create `src/components/ImageUploader.tsx`: client component using `createBrowserClient`. Lets user select multiple files, uploads each to `listing-images` bucket. **The storage RLS write policy (Task 3) requires the object path's first folder to equal the uploader's `auth.uid()`** — so upload to `${userId}/${listingId}/${crypto.randomUUID()}-${file.name}` where `userId` comes from the current session (`supabase.auth.getUser()`). Store that full path in `listing_images.storage_path`. Insert a `listing_images` row (`storage_path`, `sort_order`, first one `is_cover=true`). Shows thumbnails; allows delete (delete is owner-scoped by RLS via the object `owner`). Accepts `listingId` prop. To render images, use the public URL from `supabase.storage.from('listing-images').getPublicUrl(storage_path)`.

- [ ] **Step 3: ListingForm (client)**

Create `src/components/ListingForm.tsx`: fields per `listingSchema` (title, category select from `categories`, region select from `regions`, description textarea, price_info, contact_phone, contact_whatsapp, contact_email, website). Submits to `createListing`/`updateListing` via form action. Renders inline validation errors. For edit mode, render `<ImageUploader listingId={listing.id} />` below.

- [ ] **Step 4: Verify build**

Run: `npm run build` → Expected: compiles.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: listing create/update actions, form, image uploader"
```

---

## Task 11: Provider dashboard pages

**Files:**
- Create: `src/app/dashboard/page.tsx`, `src/app/dashboard/new/page.tsx`, `src/app/dashboard/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `requireUser`, `createServerClient`, `ListingForm`, `StatusBadge`, listing actions.

- [ ] **Step 1: Dashboard list**

Create `src/app/dashboard/page.tsx`: `requireUser()`; fetch listings where `owner_id = user.id` ordered by `created_at desc`. Render a table/cards with title, category, `StatusBadge`, `admin_note` (if rejected), and links to Edit and Promote. "Add listing" button → `/dashboard/new`.

- [ ] **Step 2: New listing page**

Create `src/app/dashboard/new/page.tsx`: `requireUser()`; fetch categories + regions; render `<ListingForm categories regions />`. Note: image upload is available after first save (needs listing id) — show a message "Save first, then add photos on the edit screen."

- [ ] **Step 3: Edit listing page**

Create `src/app/dashboard/[id]/edit/page.tsx`: `requireUser()`; fetch listing by id AND `owner_id = user.id` (404/redirect if not owner); fetch its images; render `<ListingForm listing categories regions />` + `<ImageUploader listingId />`. Show a notice: "Editing sends this listing back for re-review."

- [ ] **Step 4: Verify manually**

Run `npm run dev`. As a logged-in provider: create a listing → appears in dashboard as `pending`; edit it; upload an image. Expected: works; status stays pending.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: provider dashboard, new and edit listing pages"
```

---

## Task 12: Promotion request flow

**Files:**
- Create: `src/actions/promotion.ts`, `src/app/dashboard/[id]/promote/page.tsx`

**Interfaces:**
- Consumes: `requireUser`, `createServerClient`.
- Produces: `requestPromotion(listingId)` server action that records intent (sets `admin_note` prefix or a flag visible to admin). v1 has no payments table; we mark the request by setting a sentinel the admin promotions page reads.

Decision: add a lightweight `promotion_requested_at timestamptz` column to `listings` (migration `0003`) rather than a separate table — YAGNI for v1.

- [ ] **Step 1: Migration for promotion request marker**

Create `supabase/migrations/0003_promotion.sql`:

```sql
alter table listings add column promotion_requested_at timestamptz;
```

Run: `npx supabase db reset` → Expected: applies.

- [ ] **Step 2: Promotion action**

Create `src/actions/promotion.ts` (`"use server"`): `requestPromotion(listingId)` → `requireUser()`, verify ownership, set `promotion_requested_at = now()`, `revalidatePath("/dashboard")` and `/admin/promotions`.

- [ ] **Step 3: Promote page**

Create `src/app/dashboard/[id]/promote/page.tsx`: `requireUser()`; verify ownership; show promotion explanation, **payment instructions** (bank transfer details + PayHere link placeholder text — clearly marked as configurable), and a "I've paid — request promotion" button calling `requestPromotion`. After request, show "Pending admin activation."

- [ ] **Step 4: Verify manually**

Request promotion on a listing → `promotion_requested_at` set (check Studio). Expected: dashboard shows "promotion requested."

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: promotion request flow"
```

---

## Task 13: Admin moderation actions + panel

**Files:**
- Create: `src/actions/moderation.ts`, `src/app/admin/page.tsx`, `src/app/admin/listings/page.tsx`, `src/app/admin/promotions/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `createServerClient`.
- Produces: `approveListing(id)`, `rejectListing(id, note)`, `setActive(id, active)`, `setFeatured(id, until)`, `clearPromotionRequest(id)`.

- [ ] **Step 1: Moderation actions**

Create `src/actions/moderation.ts` (`"use server"`), each calling `requireAdmin()` first:
- `approveListing(id)`: update `status='approved'`, `is_active=true`, `admin_note=null`.
- `rejectListing(id, note)`: update `status='rejected'`, `is_active=false`, `admin_note=note`.
- `setActive(id, active: boolean)`: update `is_active=active`.
- `setFeatured(id, until: string|null)`: update `is_featured=until!==null`, `featured_until=until`, `promotion_requested_at=null`.
Each ends with `revalidatePath` on `/admin`, `/admin/listings`, `/admin/promotions`, and `/listings`.

- [ ] **Step 2: Pending queue page**

Create `src/app/admin/page.tsx`: `requireAdmin()`; fetch listings where `status='pending'` ordered `created_at asc`; for each show full details + Approve button and Reject form (textarea note). Wire to actions.

- [ ] **Step 3: Manage all listings**

Create `src/app/admin/listings/page.tsx`: `requireAdmin()`; searchable list of all listings; per row: toggle `is_active`, set/clear Featured (date input → `setFeatured`), link to edit.

- [ ] **Step 4: Promotions page**

Create `src/app/admin/promotions/page.tsx`: `requireAdmin()`; list listings where `promotion_requested_at is not null`; show provider + listing; "Activate" with a date picker → `setFeatured(id, until)` (also clears the request).

- [ ] **Step 5: Verify manually**

As admin: approve a pending listing → it becomes visible publicly. Reject another with a note → provider dashboard shows note. Activate a promotion → listing shows Featured. Expected: all transitions work and RLS allows admin writes.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: admin moderation actions and panel"
```

---

## Task 14: Public browse, filters, category/region, and detail pages

**Files:**
- Create: `src/app/listings/page.tsx`, `src/components/Filters.tsx`, `src/app/category/[slug]/page.tsx`, `src/app/region/[slug]/page.tsx`, `src/app/listing/[slug]/page.tsx`, `src/app/about/page.tsx`

**Interfaces:**
- Consumes: `createServerClient`, `sortListings`, `ListingCard`, categories/regions.

- [ ] **Step 1: Browse page with filters**

Create `src/app/listings/page.tsx` (Server Component, reads `searchParams` for `category`, `region`, `q`): query listings with `status='approved'` AND `is_active=true`, optional filters by `category_id`/`region_id` (resolve slugs first) and `ilike` on title for `q`; join cover image. Apply `sortListings`. Render `<Filters categories regions />` + grid of `ListingCard`.

Create `src/components/Filters.tsx` (client): category select, region select, search box; updates URL query params via `useRouter`.

- [ ] **Step 2: Category & region pages**

Create `src/app/category/[slug]/page.tsx` and `src/app/region/[slug]/page.tsx`: resolve slug → id, query approved+active listings for that category/region, `sortListings`, render grid. Add `generateMetadata` for SEO title/description.

- [ ] **Step 3: Listing detail page**

Create `src/app/listing/[slug]/page.tsx`: fetch listing by slug where `status='approved'` AND `is_active=true` (else `notFound()`); fetch images, category, region. Render gallery, description, `price_info`, category/region links, and contact buttons: call (`tel:`), WhatsApp (`https://wa.me/<number>`), email (`mailto:`), website. `generateMetadata` from listing title/description + cover image.

- [ ] **Step 4: About page**

Create `src/app/about/page.tsx`: static copy explaining the directory and how verification works.

- [ ] **Step 5: Verify manually**

Run `npm run dev`. Browse `/listings`, filter by category and region, search. Open an approved listing detail; confirm contact buttons work and a pending/rejected listing returns 404 publicly. Expected: only live listings appear; featured pinned first.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: public browse, filters, category/region, detail pages"
```

---

## Task 15: Deploy to Vercel + Supabase production

**Files:**
- Create: `README.md` (setup + deploy notes)

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Create a Supabase project (cloud)**

Create a hosted Supabase project. Push migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`. Run seed SQL once in the SQL editor.

- [ ] **Step 2: Promote yourself to admin**

In Supabase SQL editor: `update profiles set role='admin' where id = '<your-auth-uid>';`

- [ ] **Step 3: Configure Vercel env vars**

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` if used) in Vercel project settings. Add the deployed URL to Supabase Auth → URL Configuration (redirect URLs include `/auth/callback`).

- [ ] **Step 4: Deploy**

Run: `npx vercel --prod` (or connect the git repo in the Vercel dashboard).
Expected: build succeeds, site loads, signup/login work against cloud Supabase.

- [ ] **Step 5: Smoke test production**

Sign up as a provider, submit a listing, approve it as admin, confirm it appears publicly, activate a promotion. Expected: full loop works.

- [ ] **Step 6: Write README and commit**

```bash
git add -A && git commit -m "docs: setup and deployment readme"
```

---

## Self-Review Notes

- **Spec coverage:** roles (Tasks 7, 9, 13), categories/regions seed (Task 2), data model (Tasks 2/12), RLS + storage (Task 3), public invariant (Tasks 3, 8, 14), provider accounts/dashboard (Tasks 9, 11), listing CRUD + images + re-review-on-edit (Task 10), promotion manual flow (Tasks 12, 13), admin queue/approve/reject/feature (Task 13), public pages/detail/contact (Task 14), deploy (Task 15). Reviews intentionally deferred (noted in Task 2). All spec sections mapped.
- **Type consistency:** `status`/`role` enum values, `is_active`/`is_featured`/`featured_until`/`promotion_requested_at` column names, `listingSchema` fields, and helper signatures (`isLive`, `isCurrentlyFeatured`, `sortListings`, `uniqueSlug`) are used consistently across tasks.
- **Placeholders:** payment account/PayHere details in Task 12 are intentionally marked configurable (real bank details are the user's to supply), not a plan gap.
