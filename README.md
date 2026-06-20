# Ceylon Directory

A directory of Sri Lankan tourist services — tours & guides, activities, vehicle &
equipment rentals, accommodation, transport, wellness, and food. Providers register
and submit listings; an **admin manually verifies** each one before it goes public.
Providers can request **manual paid promotion** (an admin marks a listing
"Featured until [date]"). Visitor reviews are deferred to a later phase.

## Stack

- **Next.js 16** (App Router, TypeScript strict, Tailwind CSS v4, Turbopack)
- **Supabase** — Postgres, Auth (email/password via `@supabase/ssr`), Storage
  (public `listing-images` bucket), Row-Level Security
- **Zod** for input validation, **Vitest** for unit tests

### Security model

Row-Level Security is the **sole** security boundary. The app uses **only** the
Supabase anon key at runtime — there is no service-role key in the server. Every
privileged transition is enforced in the database:

- A listing is publicly visible **only** when `status='approved'` AND `is_active=true`.
- Providers can never self-approve, self-activate, or self-feature. An owner update
  either leaves `status`/`is_active`/`is_featured` unchanged or resets all three to
  `pending`/`false`/`false` (editing an approved listing sends it back for re-review).
- Admin writes are authorized by the session + an `is_admin()` `SECURITY DEFINER`
  function, not by a privileged key.

## Local development

Requires Node.js 20+ and Docker (for the local Supabase stack).

```bash
npm install

# Start local Supabase (Postgres, Auth, Storage, Studio) — needs Docker
npx supabase start

# Apply migrations (0001–0003) + seed (8 categories, 11 regions)
npx supabase db reset
```

Create `.env.local` from the values printed by `npx supabase status`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>
```

Then:

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm test        # Vitest unit tests
```

### Becoming an admin locally

Sign up through the app, then in Supabase Studio (SQL editor) run:

```sql
update profiles set role = 'admin' where id = '<your-auth-uid>';
```

Admin tools then appear at `/admin` (pending queue), `/admin/listings` (manage all),
and `/admin/promotions` (activate promotion requests).

## Deploying (hosted Supabase + Vercel)

### 1. Create a hosted Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard) create a project, then
push the schema and seed from this repo:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies migrations 0001–0003
```

Run the contents of `supabase/seed.sql` once in the project's SQL editor (categories
and regions). The `listing-images` storage bucket and its policies are created by
migration `0002_rls.sql`, so no manual bucket setup is needed.

### 2. Promote yourself to admin

In the SQL editor, after signing up on the deployed site:

```sql
update profiles set role = 'admin' where id = '<your-auth-uid>';
```

### 3. Configure Vercel environment variables

In the Vercel project settings → Environment Variables, set (for all environments):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon/public key |

> No service-role key is needed — the app never uses one. Do **not** add it.

### 4. Point Supabase Auth at the deployed URL

In Supabase → Authentication → URL Configuration, set the **Site URL** to your
Vercel domain and add the callback to **Redirect URLs**:

```
https://<your-domain>/auth/callback
```

### 5. Deploy

Connect the Git repo in the Vercel dashboard (recommended), or:

```bash
npx vercel --prod
```

### 6. Smoke test production

Sign up as a provider → submit a listing → approve it as admin → confirm it appears
publicly → activate a promotion and confirm the Featured badge. That exercises the
full verification loop.

## Payment / promotion note

Promotion is a **manual** flow in v1: a provider clicks "request promotion", and an
admin activates it after confirming payment out-of-band. The bank-transfer / PayHere
details on `src/app/dashboard/[id]/promote/page.tsx` are clearly marked placeholders
for the operator to fill in. There is no payment integration.

## Project layout

```
src/
  actions/        server actions (listings, promotion, moderation)
  app/            App Router pages (public, auth, dashboard, admin)
  components/     Nav, ListingCard, ListingForm, ImageUploader, Filters, …
  lib/            supabase clients, auth helpers, slug/featured/validation utils
supabase/
  migrations/     0001 schema · 0002 RLS + storage · 0003 promotion column
  seed.sql        categories + regions
docs/superpowers/ design spec and implementation plan
```
