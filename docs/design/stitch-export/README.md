# Stitch Export — Ceylon Directory

Exported from the Google Stitch project **Tourist Directory**
(`projects/9606149901933900861`, design system *Ceylon Boutique Heritage*).
Each screen is saved as a paired `<slug>.html` (Stitch markup) + `<slug>.png`
(rendered screenshot). `screens.json` is a title→screenId index.

These are **design references**, not production code. When implementing in the
Next.js app, follow `../../../DESIGN.md`:

- Swap Stitch's substitute fonts (**Plus Jakarta Sans + JetBrains Mono +
  Material Symbols**) for self-hosted **Satoshi + Geist Mono + Lucide** icons.
- Keep the heritage tokens, terracotta as the single accent, temple gold for
  Featured only, warm neutrals (drop the few Material salmon/cool-grey tints).
- Preserve the security/data invariants (approved+active to be public, admin-only
  moderation, manual promotion). Note: the desktop Listing Detail CTA says
  "Schedule a Tour" — replace with "Visit website"/"Contact" (no transactions).

## Mobile frames (780px) — 22

Public: `home-landing`, `home-landing-dark`, `browse-listings`,
`browse-listings-dark`, `category-region`, `listing-detail`,
`listing-detail-dark`, `about-verification`, `map-browse`, `map-browse-dark`
Auth: `signup`, `login`
Provider: `dashboard`, `dashboard-dark`, `newedit-form`, `newedit-form-dark`,
`promote-listing`, `promote-listing-dark`
Admin: `admin-pending`, `admin-pending-dark`, `admin-manage-all`,
`admin-promotions`

## Desktop frames (2560px) — 16

Public: `home-landing-desktop` (+ `-2`, `-3` alternates; `-3` is the most
complete, with the closing CTA band), `browse-listings-desktop`,
`category-region-desktop`, `listing-detail-desktop`, `about-verification-desktop`,
`map-browse-desktop`
Auth: `signup-desktop`, `login-desktop`
Provider: `dashboard-desktop`, `newedit-form-desktop`, `promote-listing-desktop`
Admin: `admin-pending-desktop`, `admin-manage-all-desktop`,
`admin-promotions-desktop` (generated in the Stitch UI — the MCP DESKTOP
generation kept failing for these three)

## Not yet exported

- No **dark** desktop variants (only light desktop was generated).
