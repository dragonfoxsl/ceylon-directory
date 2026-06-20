# Google Stitch — Screen Prompts (Ceylon Directory)

How to use: in Stitch, set up the project once with the **Design System Preamble**
below (or paste `DESIGN.md`), then generate each screen by pasting the **preamble +
one screen prompt**. Generate the light theme first; then ask Stitch for the dark
variant using the dark tokens. Use `picsum.photos` for placeholder imagery.

---

## Design System Preamble (prepend to every screen prompt)

> Design a screen for **Ceylon Directory**, a premium boutique directory of *verified*
> Sri Lankan tourist services. Aesthetic: calm, curated, boutique-heritage — "Ceylon,
> curated". Warm, airy, trustworthy; photography carries the emotion, chrome stays quiet.
>
> Palette (LIGHT): canvas ivory #FAF6EF, warm linen bands #F3ECE0, white cards, warm
> hairline borders #E6DCCB, **Kandyan green #1C4A37 as the primary brand** (nav,
> headings, primary buttons), **terracotta #BF5A3C as the single accent** (links,
> secondary CTAs, active filters, map pins, focus rings), **temple gold #C19A4B reserved
> only for the Featured/promoted state**, warm-ink text #241F1A, muted bark secondary
> #6E6456. Status: pending #B7791F, approved #2F7D5B, rejected #9C4A3C.
>
> Palette (DARK variant): char-green canvas #14130F, raised cards #1E1C17, hairlines
> #39342B, jade green brand #5FA882, terracotta glow accent #D98463, temple gold bright
> #D9B65E, parchment text #F0E9DB, muted sand #A79C8A.
>
> Type: **Satoshi** for display and body (track-tight, weight-driven hierarchy),
> **Geist Mono** for prices/dates/IDs and all dashboard numbers, uppercase letter-spaced
> eyebrow labels. NO Inter, NO serif, NO emojis (use thin line icons), no pure black, no
> neon/glow, no purple. One accent only. Cards: 1.5rem radius, warm hairline border, soft
> warm-tinted shadow. Buttons flat with a tactile press. Grid layout, max-width ~1320px,
> asymmetric/left-aligned heroes (never centered), no three-equal-card rows, generous
> whitespace. Fully responsive, single-column below 768px, 44px tap targets. Real Sri
> Lankan domain copy (categories/regions below), never lorem or "John Doe", no AI clichés.

---

## PUBLIC

### 1. Home / Landing
> Build the landing page. Split, left-aligned hero (not centered): a large Satoshi
> headline using **inline image typography** — small rounded photos set between the words
> at letter-height as visual punctuation, e.g. "Ceylon, [rounded photo of a tea hill]
> curated." — one short supporting line in muted bark, and a single primary CTA "Explore
> listings" in Kandyan green. To the right, an asymmetric collage of 2–3 tall rounded
> destination photos with a slow float. Below: a prominent search bar ("Search tours,
> stays, experiences…") with a region dropdown. Then a category strip as rounded pill
> tiles with line icons for the 8 categories (Tours & Guides, Activities & Experiences,
> Vehicle Rentals, Equipment Rentals, Accommodation, Transport & Transfers, Wellness &
> Spa, Food & Dining). Then a "Featured this month" row of listing cards (gold Featured
> ribbon top-right, cover photo, uppercase region eyebrow, title, LKR price in Geist
> Mono) as a horizontal scroll — not a 3-equal grid. Then a calm 3-step "How verification
> works" band on warm linen (Submit → We verify → Goes live) with a tasteful "Verified"
> check motif. Top nav: wordmark left, links (Browse, Categories, Map, About), a theme
> toggle, and "List your service" / "Log in" on the right. Footer in deep forest.

### 2. Browse / Listings (with filters)
> Build the browse results page. A slim sticky filter bar under the nav: a search input,
> a Category select, a Region select, and a sort control; active filters render as
> terracotta pills with a clear-all. Page title "Browse listings" with a Geist Mono result
> count. Main area: a responsive listing-card grid (3 cols desktop / 2 tablet / 1 mobile)
> with staggered reveal; Featured cards float to the front with the gold ribbon. Include a
> tasteful empty state ("No listings match these filters yet") with a reset action.
> Provide a secondary control to switch to **Map view** (links to screen 14).

### 3. Category / Region landing
> Build a category (or region) landing page. A compact left-aligned header band on warm
> linen: an uppercase eyebrow ("CATEGORY" / "REGION"), the name in a large Satoshi heading
> (e.g. "Wellness & Spa" or "Ella"), one line of curated description, and a Geist Mono
> count of verified listings. Below, the same responsive listing-card grid with staggered
> reveal. Keep it airy and editorial.

### 4. Listing detail
> Build a listing detail page. Top: an asymmetric gallery — one large rounded cover image
> with 2–3 smaller thumbnails beside it (not a generic carousel), and a gold Featured
> ribbon if promoted. Left/main column: uppercase region + category eyebrow, the listing
> title in a large Satoshi heading, a small "Verified listing" check cue, the full
> description with relaxed leading, and a price block showing "LKR" + amount in Geist Mono.
> Right column: a sticky contact card on Pure Surface with stacked actions — Call, WhatsApp,
> Email, Visit website — each a row with a line icon (no emojis); only show actions that
> exist. Include category and region as terracotta links back to their landing pages, and a
> small static map thumbnail of the region. Keep generous whitespace.

### 5. About / How verification works
> Build the About page. A left-aligned hero with a Satoshi headline about a hand-checked
> directory of Sri Lankan experiences and one supporting paragraph. Then an editorial
> 3-step verification explainer in a 2-column zig-zag (Submit your listing → We manually
> review it → It goes live, with a "Featured" promotion note), each step paired with a
> rounded photo. A short "Who it's for" section (travelers + providers) and a closing CTA
> band on warm linen ("List your service"). Calm, trustworthy, no marketing clichés.

---

## AUTH

### 6. Sign up
> Build a provider sign-up screen. Asymmetric split: left is a Kandyan-green (dark
> char-green in dark theme) panel with the wordmark, a short line on joining as a service
> provider, and one ambient rounded photo; right is the form on canvas ivory — full name,
> email, password (with helper text), a primary "Create account" button in Kandyan green,
> and a "Log in instead" link in terracotta. Labels above inputs, errors below in the
> rejected color, terracotta focus rings. No social-login clutter.

### 7. Log in
> Build the log-in screen mirroring sign-up's asymmetric split. Right-side form: email,
> password, primary "Log in" button, terracotta "Create an account" link. Keep it minimal
> and warm; show an inline error region above the form for failed attempts.

---

## PROVIDER DASHBOARD

### 8. Dashboard — my listings
> Build the provider dashboard. A page header "Your listings" with a primary "New listing"
> button (Kandyan green) on the right and a Geist Mono summary (counts by status). Below, a
> list of the provider's listings as border-top divided rows (not cards): thumbnail, title,
> category·region eyebrow, a status chip (Pending review / Approved / Rejected — tinted
> pill), the LKR price in Geist Mono, and a row of quiet actions (Edit, Promote, View). A
> rejected row shows the admin's note inline in muted text. Include a warm composed empty
> state ("List your first experience"). Denser than public pages but same warm palette.

### 9. New / Edit listing form
> Build the create/edit listing form. A single centered-max-width column, sectioned:
> "Basics" (title, description with character counter, category select, region select),
> "Pricing & contact" (price_info free text with LKR hint, phone, WhatsApp, email,
> website), and "Photos" — a drag-and-drop **image uploader** with a grid of uploaded
> thumbnails, the first marked as Cover, reorder handles, and a remove control; show a
> skeletal placeholder while uploading. Labels above, helper/error text below, terracotta
> focus rings. Sticky footer action bar with a single primary "Save listing" (Kandyan
> green) and a note that editing a live listing sends it back for re-review. No emojis.

### 10. Promote listing
> Build the promotion request page for one listing. Top: a summary card of the listing
> with its cover and title. Then a calm explainer of manual promotion ("Featured until a
> date set by our team after payment"). Show three states clearly: (a) **default** —
> payment instructions panel (bank transfer details + a PayHere placeholder, clearly
> labelled as operator-configurable, amounts in LKR/Geist Mono) and a primary "I've paid —
> request promotion" button; (b) **requested** — a quiet confirmation "Pending admin
> activation" with a temple-gold marker; (c) **already featured** — a gold "Featured until
> [date]" state. Use temple gold only for the featured/promoted cues.

---

## ADMIN

### 11. Admin — pending queue
> Build the admin moderation queue. Header "Pending review" with a Geist Mono count. A
> vertical list of full pending-listing review cards (oldest first): cover thumbnail, title,
> provider name, category·region, description preview, price (LKR/mono), and contact
> details. Each card has a primary "Approve" (approved-green) and a "Reject" action that
> reveals an inline note textarea with a confirm. Dense but readable; warm palette; status
> chips. A composed empty state when the queue is clear ("Nothing waiting — all caught up").

### 12. Admin — manage all listings
> Build the admin manage-all table. A search/filter bar (by status, category, region). A
> data table with border-top dividers and a sticky header: columns Title, Provider, Category,
> Region, Status chip, Featured (a date input to set/clear with a small Set button), Active
> (a toggle), and an Edit link. Numbers/dates in Geist Mono. Row hover tint. Keep it
> functional and calm — this is the densest screen (density ~6) but still on the heritage
> palette, no grey-cool tones.

### 13. Admin — promotions queue
> Build the admin promotions queue. Header "Promotion requests" with a Geist Mono count. A
> list of rows for listings whose promotion was requested: provider, listing title +
> thumbnail, requested date (mono). Each row has an "Activate" control with a date picker
> (sets Featured-until, temple-gold accent) and a quiet "Dismiss" action. Empty state when
> there are no requests. Temple gold appears only on the activate/featured cues.

---

## MAP

### 14. Map browse view
> Build a map-based browse view. Desktop: a split screen — left ~40% is a scrollable column
> of compact listing cards; right ~60% is an interactive map of Sri Lanka with **terracotta
> teardrop pins**; hovering/selecting a card highlights its pin and the **selected pin turns
> temple gold and enlarges**, and clicking a pin opens a small floating preview card. Keep
> the same slim filter bar on top (search, category, region) and a toggle back to grid
> Browse. The map cartography must theme: warm muted (ivory landmass, soft-green parks,
> muted water) in light; deep charcoal-green in dark. Cluster counts in Geist Mono. Mobile:
> replace the split with a segmented "List / Map" toggle — never a split screen on small
> viewports, no horizontal scroll.

---

## Notes for later implementation

- The map view needs `latitude`/`longitude` per listing — not in the current schema
  (location is region/city). Treat the Stitch map as a forward-looking design; adding geo
  columns + a map library (e.g. MapLibre) is a separate future task.
- Replace the existing emoji placeholders (🌴 cover fallback, 🌐 website) with line icons
  when translating these designs to code.
- Keep the build's security/data invariants intact when implementing: public listings show
  only when approved + active; only admins approve/feature; promotion is manual.
