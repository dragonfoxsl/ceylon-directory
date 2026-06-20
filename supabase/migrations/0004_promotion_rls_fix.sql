-- Fix: block owner self-extending promotion and editing approved listings via RLS
-- Drops the old "listings owner update" policy and listing_privileged_unchanged helper,
-- replaces them with a stricter helper (listing_promotion_request_only) that locks down
-- every user/privileged column except promotion_requested_at and updated_at.

drop policy "listings owner update" on listings;

create function listing_promotion_request_only(
  lid uuid,
  new_owner uuid, new_title text, new_slug text, new_status listing_status,
  new_admin_note text, new_active boolean, new_featured boolean,
  new_featured_until timestamptz, new_category uuid, new_region uuid,
  new_description text, new_price text, new_phone text, new_whatsapp text,
  new_email text, new_website text
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from listings l
    where l.id = lid
      and l.owner_id = new_owner
      and l.title = new_title
      and l.slug = new_slug
      and l.status = new_status
      and l.admin_note is not distinct from new_admin_note
      and l.is_active = new_active
      and l.is_featured = new_featured
      and l.featured_until is not distinct from new_featured_until
      and l.category_id = new_category
      and l.region_id = new_region
      and l.description = new_description
      and l.price_info is not distinct from new_price
      and l.contact_phone is not distinct from new_phone
      and l.contact_whatsapp is not distinct from new_whatsapp
      and l.contact_email is not distinct from new_email
      and l.website is not distinct from new_website
  );
$$;

create policy "listings owner update" on listings for update
  using (owner_id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      owner_id = auth.uid()
      and listing_promotion_request_only(
        id, owner_id, title, slug, status, admin_note, is_active, is_featured,
        featured_until, category_id, region_id, description, price_info,
        contact_phone, contact_whatsapp, contact_email, website)
    )
    or (
      owner_id = auth.uid()
      and status = 'pending' and is_active = false
      and is_featured = false and featured_until is null
    )
  );

drop function listing_privileged_unchanged(uuid, listing_status, boolean, boolean);
