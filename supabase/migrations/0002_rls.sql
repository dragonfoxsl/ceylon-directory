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

-- storage bucket for listing images
insert into storage.buckets (id, name, public) values ('listing-images','listing-images', true)
  on conflict (id) do nothing;
create policy "listing images public read" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "listing images auth write" on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
create policy "listing images owner delete" on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.role() = 'authenticated');
