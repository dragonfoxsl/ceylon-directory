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
