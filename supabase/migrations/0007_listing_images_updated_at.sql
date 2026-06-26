-- Add updated_at to listing_images and tighten the write policy.
--
-- The original "images write" FOR ALL policy bundles INSERT/UPDATE/DELETE into
-- one rule. Splitting them makes the intent explicit and ensures USING (old-row
-- guard) and WITH CHECK (new-row guard) are applied only where they belong:
--   INSERT  → WITH CHECK only
--   UPDATE  → both USING (must own current row) and WITH CHECK (new row too)
--   DELETE  → USING only

alter table listing_images
  add column updated_at timestamptz not null default now();

-- Back-fill existing rows
update listing_images set updated_at = now();

-- Auto-maintain updated_at on every UPDATE
create or replace function set_listing_image_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listing_images_updated_at
  before update on listing_images
  for each row execute function set_listing_image_updated_at();

-- Drop the catch-all policy and replace with explicit per-operation policies
drop policy "images write" on listing_images;

create policy "images insert" on listing_images for insert
  with check (exists (
    select 1 from listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or is_admin())
  ));

create policy "images update" on listing_images for update
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or is_admin())
  ));

create policy "images delete" on listing_images for delete
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.owner_id = auth.uid() or is_admin())
  ));
