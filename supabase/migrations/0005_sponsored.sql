-- Add sponsored placement columns
alter table listings
  add column is_sponsored boolean not null default false,
  add column sponsored_until timestamptz,
  add column sponsored_requested_at timestamptz;

-- Index for efficient sponsored-first queries
create index listings_sponsored_idx on listings (is_sponsored, sponsored_until);

-- Prevent providers from setting is_sponsored on new listings
drop policy "listings owner insert" on listings;
create policy "listings owner insert" on listings for insert
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and is_active = false
    and is_featured = false
    and is_sponsored = false
  );

-- Recreate the update policy.
-- The listing_promotion_request_only function (created in 0004) already locks
-- down all content + privilege fields. We add subquery guards for the new
-- sponsored columns so providers cannot change them via the request-only path.
--
-- Valid provider update paths:
--   1. Promotion/sponsorship request: only *_requested_at changes; everything
--      else — including is_sponsored/sponsored_until — must be unchanged.
--   2. Content re-edit: resets status=pending, is_active/featured/sponsored=false.
drop policy "listings owner update" on listings;
create policy "listings owner update" on listings for update
  using (owner_id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      -- Path 1: request only — no privileged or content field may change
      owner_id = auth.uid()
      and listing_promotion_request_only(
        id, owner_id, title, slug, status, admin_note, is_active, is_featured,
        featured_until, category_id, region_id, description, price_info,
        contact_phone, contact_whatsapp, contact_email, website
      )
      and is_sponsored = (select l2.is_sponsored from listings l2 where l2.id = id)
      and sponsored_until is not distinct from (select l2.sponsored_until from listings l2 where l2.id = id)
    )
    or (
      -- Path 2: content edit — sends listing back for re-review
      owner_id = auth.uid()
      and status = 'pending'
      and is_active = false
      and is_featured = false
      and featured_until is null
      and is_sponsored = false
    )
  );
