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

## Prerequisites

Before running the app, make sure these are installed. Verify each with the
command shown — if it prints a version you're good; if it errors, install it.

| Tool | Check | Install |
|------|-------|---------|
| **Node.js** 20+ | `node -v` | [nodejs.org](https://nodejs.org) or `nvm install --lts` |
| **npm** | `npm -v` | comes with Node.js |
| **Git** | `git --version` | [git-scm.com](https://git-scm.com/downloads) |
| **Docker** | `docker --version` | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Supabase CLI** | `supabase --version` | see below |

**Docker must be running** (not just installed) before `supabase start`. Verify with:

```bash
docker info        # prints details if the daemon is running
```

Start it via Docker Desktop, or on Linux: `sudo systemctl start docker`.

**Supabase CLI** — install whichever way suits your OS:

```bash
# macOS / Linux (Homebrew)
brew install supabase/tap/supabase

# Arch / CachyOS (AUR)
yay -S supabase-bin

# Windows (Scoop)
scoop install supabase
```

> No global install? Prefix the `supabase` commands below with `npx` and they'll
> run via the version pinned in this repo (e.g. `npx supabase start`).

## Getting started

Once the prerequisites above are in place, **one command** sets everything up
(installs deps, starts the local database, loads sample data, writes `.env.local`)
and runs the app:

```bash
make up
```

Then open **http://localhost:3000**.

### Make targets

| Command | What it does |
|---------|--------------|
| `make up` | Full setup **and** start the app (use this first) |
| `make setup` | Setup only (checks, deps, database, `.env.local`) |
| `make dev` | Run the app at http://localhost:3000 |
| `make build` | Production build |
| `make test` | Run unit tests |
| `make stop` | Stop the local Supabase stack |
| `make reset` | Re-apply schema + seed data |
| `make` / `make help` | List all targets |

### Doing it manually

If you'd rather not use `make`:

```bash
npm install                 # 1. install dependencies
npx supabase start          # 2. start the local database (needs Docker)
npx supabase db reset       # 3. load schema + sample data
```

Step 2 prints an **API URL** and an **anon key** — put them in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key printed by `npx supabase start`>
```

```bash
npm run dev                 # 4. run the app → http://localhost:3000
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

**Promote-page payment details (optional, server-only).** The promote page
(`/dashboard/[id]/promote`) reads these to show providers how to pay for featured
placement. Set whichever methods you offer; the page renders only the fully
configured ones and otherwise shows a "we'll be in touch" notice. None are
required to deploy.

| Variable | Notes |
|----------|-------|
| `PROMO_BANK_NAME`, `PROMO_ACCOUNT_NAME`, `PROMO_ACCOUNT_NUMBER` | All three needed for the bank-transfer card to appear |
| `PROMO_PRICE_LKR` | Amount, e.g. `7500` (rendered as `LKR 7,500`) |
| `PROMO_PAYHERE_URL` | `https://…` PayHere payment link |
| `PROMO_CONTACT_EMAIL` | Shown in the fallback when no online method is set |

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
