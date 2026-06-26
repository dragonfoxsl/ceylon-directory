# Product

## Register

product

## Users

Three distinct user types, each with a different relationship to the product:

**Visitors / tourists** — browsing on a phone or laptop, often mid-trip or pre-trip
planning. They want to find a trustworthy, verified service quickly; they are not
comparison-shopping on price. Context: relaxed discovery, not urgent transaction.

**Service providers** — tour operators, guesthouse owners, activity hosts. They manage
listings from a desktop or tablet, periodically: submitting for review, editing
details, uploading photos, requesting featured placement. Not power users; the UI
must be legible without training.

**Admins** — a small internal team moderating submissions and activating promotions.
Dense information, action-oriented, but not a high-velocity ops tool. Occasional
use, high trust required.

## Product Purpose

Ceylon Directory is a curated, manually-verified index of Sri Lankan tourist
services. It is not a booking engine or review platform: no transactions happen
on-site, no ratings, no UGC. The value proposition is curation and trust: every
listing has been reviewed by a human before going public, which distinguishes it
from scraped or self-proclaimed directories.

Success = a visitor finds a real, vetted service and contacts the provider directly.
Success for providers = their listing surfaces to the right audience. Promotion is
manual and rare (admin-activated), preserving the sense that featured placement
means something.

## Brand Personality

Warm, verified, refined.

Voice: knowledgeable and unhurried, like a trusted local contact who knows exactly
where to send you. Not a tourist-brochure voice. Not corporate. Statements are
direct and specific; no copywriting inflation.

Tone: calm confidence. The platform curates; it does not shout. The design earns
trust by being composed, not by covering itself in badges and social proof.

## Anti-references

- **Mass-market OTAs** (Booking.com, TripAdvisor, Airbnb): cluttered, review-count-
  driven, price-comparison aesthetics. No star ratings on every card, no "X people
  viewed this today" urgency, no strikethrough pricing.
- **Generic travel-aggregator chrome**: search bars that dominate the hero, filter
  sidebars packed with checkboxes, listing pages that resemble hotel booking sheets.
- **Colonial-nostalgia kitsch**: overplaying the heritage angle into sepia tones,
  faded-map textures, pith-helmet imagery. The aesthetic is warm and curated, not
  nostalgic pastiche.

## Design Principles

1. **Curation is the product.** Every design decision should reinforce that a human
   reviewed this. Verified badges are tasteful, not plastered everywhere. Listings
   look considered, not scraped.

2. **Photography carries the emotion; the chrome stays quiet.** Provider images are
   the hero. UI chrome recedes: warm neutrals, restrained type, minimal ornamentation.
   Never let UI elements compete with the listing photography.

3. **Trust through composure.** Urgency patterns (countdown timers, view counts,
   "only 2 left") are banned. The interface is calm and deliberate. Users arrive with
   intent; the product respects that.

4. **Real Sri Lanka, not the brochure version.** Copy and design reference actual
   places, services, and culture — not generic tropical-paradise clichés. Category
   labels, region names, and UI copy should read as written by someone who knows
   the country.

5. **Three audiences, one voice.** The public browsing surface, the provider
   dashboard, and the admin panel share the same warm palette and typography. The
   admin panel can be denser but must never feel like a different product.

## Accessibility & Inclusion

Target: WCAG 2.1 AA conformance.

- All interactive elements meet 4.5:1 contrast ratio (text) and 3:1 (UI components).
- Focus indicators are visible and high-contrast (Terracotta Clay ring, not browser
  default).
- Respect `prefers-reduced-motion`: spring animations downgrade to instant or
  simple fade; perpetual micro-loops pause.
- Keyboard navigation covers all interactive flows (browse, auth, dashboard,
  admin moderation).
- All images have meaningful `alt` text. Status chips (Pending / Approved /
  Rejected) are not communicated by colour alone.
