# Ceylon AI Travel Planner — Design Spec

_Date: 2026-06-26_

## What it is

A visitor-facing AI itinerary generator inside Ceylon Directory. A visitor fills a
short form describing their trip; a Claude-powered server action produces a
structured day-by-day itinerary drawing first from Ceylon Directory listings, then
from the web for anything the directory doesn't cover. The output is a shareable
page the visitor can export to Google Calendar.

No account required. No chat interface in this phase — single form submission,
single generated result, with the option to regenerate.

---

## Users

**Visitors / tourists** — browsing on mobile or desktop, pre-trip or mid-trip. They
want a concrete, trustworthy plan quickly, not an open-ended conversation.

---

## Architecture

### Location in the codebase

New route inside the existing Ceylon Directory Next.js app:

```
src/app/plan/
  page.tsx          # planning form
  [slug]/page.tsx   # generated itinerary view
src/actions/planner.ts  # server action: calls Claude, stores result
src/lib/planner/
  tools.ts          # Claude tool definitions + handlers
  format.ts         # JSON → UI data shape
  calendar.ts       # Google Calendar export logic
```

New Supabase table: `itineraries` (in the existing Ceylon Directory Supabase project).

### Data flow

```
Visitor fills form
  → Server action (src/actions/planner.ts)
    → Claude API (claude-sonnet-4-6, tool_use)
      → tool: search_directory  →  Supabase query (listings)
      → tool: search_web        →  Tavily API
    ← Structured itinerary JSON
  → Stored in itineraries table
  → Redirect to /plan/[slug]
Visitor views itinerary
  → Optional: Export to Google Calendar (client-side OAuth)
  → Optional: Copy shareable link
```

---

## Planning Form (`/plan`)

Five fields. Only trip duration is required.

| Field | Type | Notes |
|-------|------|-------|
| **Trip duration** | number (1–14 days) | required |
| **Starting region** | select | 11 Ceylon Directory regions + "Flexible" |
| **Interests** | multi-select chips | Wildlife, Culture & History, Tea Country, Beaches, Adventure, Wellness, Food & Drink, City Life |
| **Travel pace** | radio | Relaxed / Balanced / Full |
| **Notes** | textarea | free text ("travelling with kids", "no seafood", "wheelchair access") |

Single "Plan my trip" button. While generating, a loading state shows with a brief
message ("Finding the best of Sri Lanka for you…"). Generation typically takes 10–20
seconds.

If generation fails, the visitor sees an inline error with a "Try again" button.
The form retains its values.

---

## Claude Integration

### Model

`claude-sonnet-4-6` (configurable via `CLAUDE_MODEL` env var).

### System prompt (summary)

You are a Sri Lanka travel expert. Your job is to create a practical, day-by-day
itinerary for a visitor. Use the `search_directory` tool first to find relevant
listings from the Ceylon Directory. Use `search_web` to fill gaps — things the
directory doesn't cover (restaurants, transport, entry fees, opening hours,
practical tips). Always prefer verified directory listings over web results when
both are available. Return a structured JSON itinerary matching the schema provided.

### Tool: `search_directory`

```typescript
{
  name: "search_directory",
  description: "Search Ceylon Directory for approved, active listings",
  input_schema: {
    query: string,       // free-text search
    category?: string,   // one of the 8 listing categories
    region?: string,     // one of the 11 regions
    limit?: number       // default 5, max 10
  }
}
```

Handler queries Supabase using the JS client (parameterized — no raw string
interpolation into filter expressions):
```typescript
supabase.from("listings")
  .select("id, title, slug, description, category_id, region_id")
  .eq("status", "approved").eq("is_active", true)
  .or(`title.ilike."%${safeQuery}%",description.ilike."%${safeQuery}%"`)
  .limit(limit)
// safeQuery = query.replace(/"/g, "") per the listings-page security fix
```

Returns: array of `{ title, slug, description, category, region }`.
The `slug` is used to generate `ceylon.lk/listing/[slug]` links in the itinerary.

### Tool: `search_web`

```typescript
{
  name: "search_web",
  description: "Search the web for travel information not in the directory",
  input_schema: {
    query: string   // specific search query
  }
}
```

Handler calls Tavily API (`TAVILY_API_KEY` env var). Returns top 3 results:
`{ title, snippet, url }`. Source URLs are included in the itinerary for attribution.

### Output schema

Claude is instructed to return a JSON object matching:

```typescript
type Itinerary = {
  title: string            // e.g. "5 Days in Sri Lanka — Wildlife & Tea Country"
  summary: string          // 2–3 sentence overview
  days: Day[]
}

type Day = {
  day: number
  title: string            // e.g. "Day 1 — Arrival in Colombo"
  activities: Activity[]
}

type Activity = {
  time_of_day: "morning" | "afternoon" | "evening"
  title: string
  description: string      // 2–3 sentences
  source_type: "directory" | "web"
  directory_slug?: string  // present when source_type = "directory"
  web_url?: string         // present when source_type = "web"
  web_source_name?: string // e.g. "Lonely Planet"
  bookable: boolean        // true if listing has a Ceylon Booking account
}
```

The server action validates the returned JSON against this schema (Zod). If
validation fails, it retries once. If the second attempt also fails, an error is
returned to the visitor.

---

## Data Model

### `itineraries` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text unique | short random slug for the shareable URL |
| `form_inputs` | jsonb | the visitor's form submission |
| `itinerary` | jsonb | the validated Claude output |
| `view_count` | int default 0 | incremented on each page view |
| `created_at` | timestamptz | |

No `owner_id` — itineraries are anonymous and public in this phase.

### RLS

- Anyone can INSERT (no auth required).
- Anyone can SELECT (itineraries are public).
- No UPDATE or DELETE from the client.

---

## Itinerary View (`/plan/[slug]`)

A clean, scrollable page:

- **Header:** itinerary title + summary, trip duration chip, share button (copies URL)
- **Day sections:** each day has a title, and each activity has a time-of-day label,
  title, description, and source attribution
  - Directory listings link to `ceylon.lk/listing/[slug]`
  - Web sources show the source name and link to the original URL
  - "Book this" chip on bookable listings (links to the Ceylon Booking widget or page)
- **Footer actions:**
  - "Export to Google Calendar" button
  - "Plan another trip" link back to `/plan`
  - "Regenerate" button (re-runs the same form inputs; creates a new itinerary record)

The page is print-friendly (CSS `@media print`).

`view_count` is incremented server-side on each page load (Supabase RPC, no RLS
needed for increment).

---

## Google Calendar Export

Visitor-side only. No server storage of tokens.

1. Visitor clicks "Export to Google Calendar".
2. Google OAuth popup: `calendar.events` scope. Token is held in memory (not
   persisted to localStorage or server).
3. Visitor is prompted to enter their trip start date (a single date picker).
4. Each activity becomes a Google Calendar event:
   - Title: activity title
   - Description: activity description + source link
   - Date: calculated from trip start date + day offset
   - Time: morning = 09:00, afternoon = 13:00, evening = 18:00 (30-min duration)
   - Add a link back to the itinerary page in the event description.
5. On success: "Added to your Google Calendar" confirmation.
6. On failure: inline error, option to retry.

Token is discarded after export (or on page navigation). The app never stores
visitor Google credentials.

---

## Nav Integration

"Plan a trip" added to the main nav (between "Listings" and the auth links).
Also surfaced on the homepage as a secondary CTA below the hero.

---

## Error Handling

- **Claude API timeout (>30s):** Return an error to the visitor with "Try again".
  The form retains its values.
- **Tavily API failure:** Log the error server-side. Claude is instructed to proceed
  with directory results only if web search fails — the itinerary is degraded but
  not blocked.
- **Schema validation failure after 2 attempts:** Return a generic error to the
  visitor. Log the raw Claude output for debugging.
- **Google OAuth declined:** Dismiss silently — export is optional.
- **Google Calendar event creation failure:** Show an inline error per failed event
  with a retry option for that event only.

---

## Performance

- Server action runs with a 45-second timeout (Next.js route segment config).
- Claude calls are streamed server-side but the action waits for the full response
  before storing and redirecting (streaming UI is a future phase).
- `itineraries` table has an index on `slug` for fast lookup.
- `view_count` increment is fire-and-forget (no await in the page render path).

---

## Testing

- Unit: form validation, itinerary JSON schema validation (Zod), calendar event
  date/time calculation.
- Integration: `search_directory` tool handler against local Supabase.
- Claude: mocked in unit/integration tests using fixture responses. Manual QA
  with real API calls in staging.
- Google Calendar: mocked in tests; manual QA with a test Google account.

---

## Environment Variables

| Var | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude API access |
| `CLAUDE_MODEL` | Model ID, default `claude-sonnet-4-6` |
| `TAVILY_API_KEY` | Web search API |
| `NEXT_PUBLIC_BOOKING_URL` | Ceylon Booking instance URL (for "Book this" links) |

---

## What's deferred

- Streaming itinerary generation (progressive rendering as Claude responds)
- Chat-based refinement after initial generation
- "Book this" flow fully wired to Ceylon Booking widget (chip links out for now)
- Saved itineraries for logged-in visitors (dashboard history)
- Visitor rating/feedback on generated itineraries
- Admin view of generated itineraries (popularity, top-linked listings)
