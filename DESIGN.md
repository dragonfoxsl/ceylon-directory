# Design System: Ceylon Directory

> Single source of truth for generating screens in Google Stitch. Paste the
> relevant sections (plus a screen prompt from `docs/design/stitch-prompts.md`)
> into Stitch. Premium boutique-heritage aesthetic, light **and** dark themes.

## 1. Visual Theme & Atmosphere

A calm, curated, boutique-heritage interface for discovering verified Sri Lankan
tourist services. The mood is "Ceylon, curated" — unhurried, premium, and
trustworthy, like the lobby of a restored colonial villa hotel: warm stone walls,
generous daylight, considered objects on display. Photography carries the emotion;
the chrome stays quiet.

- **Density:** Art-gallery airy on public pages (3/10) — wide margins, few elements
  per view. Dashboards and the admin panel step up to balanced-functional (6/10):
  denser tables and status chips, but the same warm palette and restraint.
- **Variance:** Offset-asymmetric (5/10) — split-screen and left-aligned heroes,
  zig-zag feature rows. Confident, never chaotic; this is a marketplace people must
  trust with bookings.
- **Motion:** Fluid spring (5/10) — weighty, restrained transitions and staggered
  reveals. No theatrics.

## 2. Color Palette & Roles

One continuously **warm** palette. Deep green is the brand; terracotta is the lone
accent; temple gold is reserved exclusively for the **Featured** state and premium
markers — treat gold like a status color, never a general button color.

### Light theme
- **Canvas Ivory** (#FAF6EF) — primary page background, warm not white
- **Warm Linen** (#F3ECE0) — alternating section bands, inset panels
- **Pure Surface** (#FFFFFF) — cards and containers
- **Warm Hairline** (#E6DCCB) — 1px borders, structural dividers
- **Kandyan Green** (#1C4A37) — PRIMARY brand: top nav, headings, primary buttons,
  active nav state
- **Deep Forest** (#143A2B) — pressed/hover of primary, footer fill
- **Terracotta Clay** (#BF5A3C) — THE single accent: links, secondary CTAs, active
  filter pills, focus rings, map pins
- **Temple Gold** (#C19A4B) — RESERVED: Featured badge/ribbon, "promoted" markers only
- **Warm Ink** (#241F1A) — primary text (never pure black)
- **Muted Bark** (#6E6456) — secondary text, metadata, eyebrow labels
- **Status — Pending** (#B7791F) · **Approved** (#2F7D5B) · **Rejected** (#9C4A3C)

### Dark theme
- **Char Green** (#14130F) — primary background (warm near-black, never #000000)
- **Raised Surface** (#1E1C17) — cards
- **Elevated Surface** (#26231C) — popovers, modals, sticky bars
- **Warm Hairline Dark** (#39342B) — borders, dividers
- **Jade Green** (#5FA882) — PRIMARY brand on dark (lightened for contrast)
- **Terracotta Glow** (#D98463) — the single accent on dark
- **Temple Gold Bright** (#D9B65E) — RESERVED Featured/premium on dark
- **Parchment** (#F0E9DB) — primary text
- **Muted Sand** (#A79C8A) — secondary text, metadata
- **Status — Pending** (#D8A23B) · **Approved** (#5FA882) · **Rejected** (#CF7A66)

Rules: maximum one accent (terracotta). Gold is semantic, not decorative. No neon,
no purple, no glow. Saturation stays below 80%. Never fluctuate between warm and cool
greys — every neutral here is warm.

## 3. Typography Rules

- **Display & Headings:** `Satoshi` — track-tight, weight-driven hierarchy (700/500).
  Headlines scale with `clamp()`; impact comes from weight and generous space, not
  screaming size.
- **Body & UI:** `Satoshi` (400/500) — relaxed leading, max 65 characters per line,
  secondary text in Muted Bark / Muted Sand.
- **Numeric & Mono:** `Geist Mono` — prices (LKR amounts), dates, listing IDs,
  table figures, dashboard counts. All dashboard/admin numbers are monospace.
- **Eyebrow labels:** uppercase, letter-spaced (0.12em), 12px, Muted Bark — used for
  category/region tags and section kickers.
- **Banned:** `Inter`, system-font stacks for premium contexts, and ALL serif fonts
  (this product is sans-only — no Fraunces/Georgia/anything serif, including dashboards).

## 4. Component Stylings

- **Buttons:** Flat, no outer glow. Primary = Kandyan Green fill, Parchment/Ivory
  label; tactile -1px translate on press. Secondary = terracotta outline/ghost.
  Featured/promote actions may carry a thin temple-gold marker but use green/terracotta
  fills. Max one primary CTA per view.
- **Cards (listing cards):** Pure Surface, generously rounded corners (1.5rem), warm
  hairline border, soft diffused shadow tinted to the warm background (never grey/black).
  Cover photo on top with rounded top corners; uppercase region eyebrow; title in
  Satoshi 500; price in Geist Mono with a quiet "LKR" prefix; gold Featured ribbon in
  the top-right when promoted. Hover: lift 2px + image scale 1.03 with spring easing.
- **Inputs/Forms:** Label above field, helper text optional, error text below in the
  Rejected color. Fields are Pure Surface with warm hairline border; focus ring in
  Terracotta Clay. No floating labels. Generous 1rem gaps.
- **Status chips:** pill, tinted background of the status color at ~12% with the solid
  status color text — Pending / Approved / Rejected. Used in dashboard and admin.
- **Filter pills:** rounded, warm hairline when inactive; Terracotta Clay fill when active.
- **Tables (admin/dashboard):** border-top dividers instead of card-per-row, monospace
  figures, sticky header in Warm Linen / Elevated Surface, row hover tint.
- **Loaders:** skeletal shimmer matching the exact card/table dimensions — never a
  circular spinner.
- **Empty states:** a composed illustration-style block in warm tones with one clear
  action (e.g. "List your first experience") — not a bare "No data" line.
- **Map pins:** teardrop in Terracotta Clay; the selected/active pin enlarges and turns
  Temple Gold; clustered counts in Geist Mono.

## 5. Layout Principles

- CSS Grid first, max-width container ~1320px centered, generous internal padding.
- Heroes are split-screen or left-aligned/asymmetric — never centered.
- Feature rows use 2-column zig-zag or asymmetric grids / horizontal scroll — never the
  generic three-equal-cards row.
- Every element gets its own clean spatial zone — no overlapping text/images.
- Full-height sections use `min-h-[100dvh]`, never `h-screen`.
- Listing grids: 3 columns desktop → 2 tablet → 1 mobile, with comfortable gutters.

## 6. Responsive Rules

- Mobile-first: every multi-column layout collapses to single column below 768px.
- No horizontal scroll on mobile (except intentional carousels).
- Headlines scale with `clamp()`; body text min 1rem; tap targets ≥ 44px.
- Desktop horizontal nav collapses to a clean off-canvas mobile menu.
- Map view on mobile: a list/map toggle (segmented control), not a split screen.
- Inline hero photos stack below the headline on mobile.

## 7. Motion & Interaction

- Spring physics default (stiffness ~100, damping ~20) — no linear easing.
- Staggered cascade reveals for listing grids and table rows (waterfall, ~40ms step).
- Perpetual micro-loops only where they add life: a slow float on the hero photo, a
  gentle shimmer on the Featured ribbon. Restrained.
- Animate `transform`/`opacity` only. Theme switch (light↔dark) crossfades smoothly.

## 8. Theming

- Ship both **light** (default) and **dark** themes from the same tokens above. A
  theme toggle sits in the top nav. Dark uses Char Green canvas with Jade Green brand,
  Terracotta Glow accent, and Temple Gold Bright for Featured.
- The map must theme too: warm muted cartography in light (ivory landmass, soft green
  parks, muted water); deep charcoal-green cartography in dark.

## 9. Anti-Patterns (Banned)

- No emojis anywhere (replace the current 🌴/🌐 placeholders with line icons,
  Lucide-style).
- No `Inter`; no serif fonts of any kind.
- No pure black (#000000); no cool/neutral greys — warm neutrals only.
- No neon, glow, or oversaturated accents; no purple/blue "AI" aesthetic.
- No gradient text on large headers.
- No centered hero; no three-equal-card feature rows.
- No custom mouse cursors; no overlapping elements.
- No generic placeholder names ("John Doe", "Acme"), no fake round numbers (99.99%).
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen").
- No filler UI text ("Scroll to explore", bouncing chevrons).
- No broken Unsplash links — use `picsum.photos` or SVG placeholders for mockups.

## 10. Product Vocabulary (use real domain copy, not lorem)

- Categories: Tours & Guides · Activities & Experiences · Vehicle Rentals · Equipment
  Rentals · Accommodation · Transport & Transfers · Wellness & Spa · Food & Dining.
- Regions: Colombo · Kandy · Galle · Ella · Sigiriya · Arugam Bay · Nuwara Eliya ·
  Mirissa · Anuradhapura · Jaffna · Trincomalee.
- Prices are free text with an `LKR` prefix; there are no transactions on-site.
- Every listing is manually verified by an admin before going public — surface trust
  cues ("Verified listing", a small check mark) but keep them tasteful.
- Listing states: Pending review · Approved (live) · Rejected (with note). Promotion is
  a manual "Featured until [date]" set by an admin after a provider requests it.
