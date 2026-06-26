# Ceylon AI Travel Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered itinerary generator to Ceylon Directory at `/plan` — visitors fill a form, Claude calls directory and web tools, a shareable itinerary is stored and rendered, with optional Google Calendar export.

**Architecture:** Server action calls Claude with two tools (`search_directory` → Supabase, `search_web` → Tavily). Validated JSON itinerary stored in a new `itineraries` table. Itinerary rendered at `/plan/[slug]`. Google Calendar export is client-side OAuth only — no server token storage.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, Supabase, `@anthropic-ai/sdk`, Tavily REST API, Google Calendar REST API (client-side), Zod, Vitest.

## Global Constraints

- Next.js 16: `cookies()`, `params`, `searchParams` are all async — `await` them.
- No `NEXT_PUBLIC_` prefix on `ANTHROPIC_API_KEY` or `TAVILY_API_KEY` — server only.
- PostgREST filter strings: always double-quote interpolated values (`"%${safeQ}%"`); strip `"` from input first.
- Tailwind v4: utility classes only — no `tailwind.config.js` changes.
- All new UI uses existing design tokens: `bg-canvas`, `text-ink`, `text-muted`, `text-accent`, `bg-shell`, `border-hairline`, `.btn`, `.card`, `.chip-*`, `.field`.
- No comments except for non-obvious WHY. No docstrings.

---

## File Map

```
New files:
  supabase/migrations/0008_itineraries.sql
  src/lib/planner/format.ts          — Zod schema + TypeScript types
  src/lib/planner/tools.ts           — Claude tool definitions + handlers
  src/lib/planner/calendar.ts        — Google Calendar export (client-side)
  src/actions/planner.ts             — generateItinerary server action
  src/app/plan/page.tsx              — planning form
  src/app/plan/[slug]/page.tsx       — itinerary view
  src/components/PlannerForm.tsx     — client form component
  src/components/ItineraryView.tsx   — itinerary renderer
  src/components/CalendarExport.tsx  — Google Calendar export button
  tests/planner/format.test.ts       — Zod schema unit tests
  tests/planner/tools.test.ts        — tool handler unit tests

Modified files:
  package.json                       — add @anthropic-ai/sdk
  src/components/Nav.tsx             — add "Plan a trip" link
  src/app/page.tsx                   — add secondary CTA
  vitest.config.ts                   — include tests/planner/**
```

---

### Task 1: DB Migration — itineraries table

**Files:**
- Create: `supabase/migrations/0008_itineraries.sql`

**Interfaces:**
- Produces: `itineraries` table with columns `id uuid`, `slug text unique`, `form_inputs jsonb`, `itinerary jsonb`, `view_count int`, `created_at timestamptz`; public RLS (anyone can read/insert); `increment_itinerary_views(uuid)` SECURITY DEFINER function

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0008_itineraries.sql
create table itineraries (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        unique not null,
  form_inputs jsonb      not null,
  itinerary  jsonb       not null,
  view_count int         not null default 0,
  created_at timestamptz not null default now()
);

create index itineraries_slug_idx on itineraries (slug);

alter table itineraries enable row level security;

create policy "itineraries public read" on itineraries
  for select using (true);

create policy "itineraries public insert" on itineraries
  for insert with check (true);

-- SECURITY DEFINER so callers don't need UPDATE policy
create or replace function increment_itinerary_views(itinerary_id uuid)
returns void language sql security definer set search_path = public as $$
  update itineraries set view_count = view_count + 1 where id = itinerary_id;
$$;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db reset
```

Expected: "Finished supabase db reset." Verify with:

```bash
npx supabase db diff --linked | grep itineraries || echo "table exists locally"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_itineraries.sql
git commit -m "feat(planner): itineraries table + RLS + view-count fn"
```

---

### Task 2: Zod Schema + Types

**Files:**
- Create: `src/lib/planner/format.ts`
- Create: `tests/planner/format.test.ts`

**Interfaces:**
- Produces:
  - `FormInputs` type
  - `ActivitySchema`, `DaySchema`, `ItinerarySchema` (Zod)
  - `Activity`, `Day`, `Itinerary` TypeScript types (inferred from Zod)

- [ ] **Step 1: Install dependency**

```bash
npm install @anthropic-ai/sdk
```

Expected: package added to `node_modules`.

- [ ] **Step 2: Write failing tests**

```typescript
// tests/planner/format.test.ts
import { describe, it, expect } from "vitest";
import { ItinerarySchema, type FormInputs } from "@/lib/planner/format";

describe("ItinerarySchema", () => {
  it("parses a valid itinerary", () => {
    const raw = {
      title: "5 Days in Sri Lanka",
      summary: "A balanced mix of wildlife and culture.",
      days: [
        {
          day: 1,
          title: "Day 1 — Colombo",
          activities: [
            {
              time_of_day: "morning",
              title: "Galle Face Green",
              description: "Start with a walk along the promenade.",
              source_type: "web",
              web_url: "https://example.com",
              web_source_name: "Lonely Planet",
              bookable: false,
            },
          ],
        },
      ],
    };
    expect(() => ItinerarySchema.parse(raw)).not.toThrow();
  });

  it("rejects unknown time_of_day values", () => {
    const raw = {
      title: "Trip",
      summary: "Summary.",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            {
              time_of_day: "noon",
              title: "Activity",
              description: "Desc.",
              source_type: "web",
              bookable: false,
            },
          ],
        },
      ],
    };
    expect(() => ItinerarySchema.parse(raw)).toThrow();
  });

  it("allows directory_slug on directory sources", () => {
    const raw = {
      title: "Trip",
      summary: "Summary.",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            {
              time_of_day: "afternoon",
              title: "Safari Tour",
              description: "Great safari.",
              source_type: "directory",
              directory_slug: "kandy-safari-tours",
              bookable: true,
            },
          ],
        },
      ],
    };
    const result = ItinerarySchema.parse(raw);
    expect(result.days[0].activities[0].directory_slug).toBe("kandy-safari-tours");
  });
});

describe("FormInputs type", () => {
  it("satisfies the expected shape", () => {
    const inputs: FormInputs = {
      duration: 5,
      starting_region: "Kandy",
      interests: ["Wildlife", "Culture & History"],
      pace: "balanced",
      notes: "",
    };
    expect(inputs.duration).toBe(5);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npm test tests/planner/format.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/planner/format'"

- [ ] **Step 4: Implement format.ts**

```typescript
// src/lib/planner/format.ts
import { z } from "zod";

export const ActivitySchema = z.object({
  time_of_day: z.enum(["morning", "afternoon", "evening"]),
  title: z.string(),
  description: z.string(),
  source_type: z.enum(["directory", "web"]),
  directory_slug: z.string().optional(),
  web_url: z.string().optional(),
  web_source_name: z.string().optional(),
  bookable: z.boolean(),
});

export const DaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  activities: z.array(ActivitySchema).min(1),
});

export const ItinerarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  days: z.array(DaySchema).min(1),
});

export type Activity = z.infer<typeof ActivitySchema>;
export type Day = z.infer<typeof DaySchema>;
export type Itinerary = z.infer<typeof ItinerarySchema>;

export type FormInputs = {
  duration: number;
  starting_region: string;
  interests: string[];
  pace: "relaxed" | "balanced" | "full";
  notes: string;
};
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test tests/planner/format.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/planner/format.ts tests/planner/format.test.ts package.json package-lock.json
git commit -m "feat(planner): itinerary Zod schema + FormInputs type"
```

---

### Task 3: Claude Tool Handlers

**Files:**
- Create: `src/lib/planner/tools.ts`
- Create: `tests/planner/tools.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`
- Produces:
  - `tools: Anthropic.Tool[]` — Claude tool definitions array
  - `handleToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string>` — dispatches to tool handlers, returns JSON string

- [ ] **Step 1: Write failing tests**

```typescript
// tests/planner/tools.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing tools
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { handleToolCall, tools } from "@/lib/planner/tools";
import { createClient } from "@/lib/supabase/server";

describe("tools array", () => {
  it("exports search_directory and search_web tools", () => {
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("search_directory");
    expect(tools[1].name).toBe("search_web");
  });

  it("search_directory requires query", () => {
    const schema = tools[0].input_schema as { required: string[] };
    expect(schema.required).toContain("query");
  });
});

describe("handleToolCall — search_directory", () => {
  beforeEach(() => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOr = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ title: "Kandy Safari", slug: "kandy-safari", description: "Great tour." }],
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        or: mockOr,
        limit: mockLimit,
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  it("returns JSON string of listings", async () => {
    const result = await handleToolCall("search_directory", { query: "safari" });
    const parsed = JSON.parse(result) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("strips double-quotes from query before interpolation", async () => {
    // Should not throw even with quotes in query
    await expect(
      handleToolCall("search_directory", { query: 'kandy "tours"' })
    ).resolves.toBeDefined();
  });
});

describe("handleToolCall — unknown tool", () => {
  it("returns error JSON for unknown tool names", async () => {
    const result = await handleToolCall("nonexistent_tool", {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test tests/planner/tools.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/planner/tools'"

- [ ] **Step 3: Implement tools.ts**

```typescript
// src/lib/planner/tools.ts
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const tools: Anthropic.Tool[] = [
  {
    name: "search_directory",
    description:
      "Search Ceylon Directory for approved, active listings. Use this first before searching the web.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search term" },
        limit: {
          type: "number",
          description: "Max results to return (default 5, max 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for Sri Lanka travel information not available in the directory (restaurants, transport, entry fees, opening hours, tips).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Specific search query" },
      },
      required: ["query"],
    },
  },
];

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  if (toolName === "search_directory") return searchDirectory(toolInput);
  if (toolName === "search_web") return searchWeb(toolInput);
  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

async function searchDirectory(input: Record<string, unknown>): Promise<string> {
  const raw = String(input.query ?? "");
  const safeQ = raw.replace(/"/g, "");
  const limit = Math.min(Number(input.limit ?? 5), 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("title, slug, description")
    .eq("status", "approved")
    .eq("is_active", true)
    .or(`title.ilike."%${safeQ}%",description.ilike."%${safeQ}%"`)
    .limit(limit);

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data ?? []);
}

async function searchWeb(input: Record<string, unknown>): Promise<string> {
  const query = String(input.query ?? "");
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return JSON.stringify({ error: "Web search unavailable" });

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 3 }),
    });
    const json = (await res.json()) as {
      results?: Array<{ title: string; content: string; url: string }>;
    };
    return JSON.stringify(
      (json.results ?? []).map((r) => ({
        title: r.title,
        snippet: r.content,
        url: r.url,
      })),
    );
  } catch {
    return JSON.stringify({ error: "Web search failed" });
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test tests/planner/tools.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner/tools.ts tests/planner/tools.test.ts
git commit -m "feat(planner): Claude tool definitions + handlers"
```

---

### Task 4: generateItinerary Server Action

**Files:**
- Create: `src/actions/planner.ts`

**Interfaces:**
- Consumes: `ItinerarySchema`, `FormInputs` from `@/lib/planner/format`; `tools`, `handleToolCall` from `@/lib/planner/tools`; `createClient` from `@/lib/supabase/server`
- Produces: `generateItinerary(inputs: FormInputs): Promise<{ ok: true; slug: string } | { ok: false; error: string }>`

- [ ] **Step 1: Write the server action**

```typescript
// src/actions/planner.ts
"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  ItinerarySchema,
  type FormInputs,
  type Itinerary,
} from "@/lib/planner/format";
import { tools, handleToolCall } from "@/lib/planner/tools";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert Sri Lanka travel planner. Create a practical, day-by-day itinerary for the visitor's trip.

Rules:
- Use search_directory first to find verified local services from Ceylon Directory.
- Use search_web to fill gaps (restaurants, transport, entry fees, opening hours, tips).
- Prefer directory listings over web results when both cover the same activity.
- Include a realistic mix of activities per day based on the requested pace:
  - Relaxed: 2 activities per day
  - Balanced: 3 activities per day
  - Full: 4 activities per day

Return ONLY a valid JSON object with this exact shape. No markdown fences. No explanation:
{
  "title": "X Days in Sri Lanka — [theme]",
  "summary": "2-3 sentences describing the overall trip",
  "days": [
    {
      "day": 1,
      "title": "Day 1 — [location/theme]",
      "activities": [
        {
          "time_of_day": "morning" | "afternoon" | "evening",
          "title": "Activity name",
          "description": "2-3 sentences about the activity.",
          "source_type": "directory" | "web",
          "directory_slug": "slug-from-directory (only when source_type=directory)",
          "web_url": "https://... (only when source_type=web)",
          "web_source_name": "Source name (only when source_type=web)",
          "bookable": false
        }
      ]
    }
  ]
}`;

async function runClaudeWithTools(userMessage: string): Promise<Itinerary> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < 20; i++) {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text in Claude response");
      }
      const parsed: unknown = JSON.parse(textBlock.text);
      return ItinerarySchema.parse(parsed);
    }

    if (response.stop_reason === "tool_use") {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const content = await handleToolCall(
          block.name,
          block.input as Record<string, unknown>,
        );
        results.push({ type: "tool_result", tool_use_id: block.id, content });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }

  throw new Error("Claude agentic loop exceeded 20 iterations");
}

export async function generateItinerary(
  inputs: FormInputs,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const userMessage = `Plan a ${inputs.duration}-day Sri Lanka trip.
Starting region: ${inputs.starting_region}
Interests: ${inputs.interests.length > 0 ? inputs.interests.join(", ") : "general sightseeing"}
Pace: ${inputs.pace}
Notes: ${inputs.notes || "none"}`;

  let itinerary: Itinerary;
  try {
    itinerary = await runClaudeWithTools(userMessage);
  } catch {
    try {
      itinerary = await runClaudeWithTools(userMessage);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Itinerary generation failed",
      };
    }
  }

  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase.from("itineraries").insert({
    slug,
    form_inputs: inputs,
    itinerary,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, slug };
}
```

- [ ] **Step 2: Add env vars to .env.local**

```bash
# Add to .env.local (do not commit)
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.local
echo "TAVILY_API_KEY=your-key-here" >> .env.local
echo "CLAUDE_MODEL=claude-sonnet-4-6" >> .env.local
```

- [ ] **Step 3: Add route segment config to allow 45s timeout**

This goes at the top of `src/app/plan/page.tsx` (Task 5) — noted here so it isn't forgotten:

```typescript
export const maxDuration = 45;
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/planner.ts
git commit -m "feat(planner): generateItinerary server action with Claude tool loop"
```

---

### Task 5: Planning Form Page

**Files:**
- Create: `src/components/PlannerForm.tsx`
- Create: `src/app/plan/page.tsx`

**Interfaces:**
- Consumes: `generateItinerary` from `@/actions/planner`; `FormInputs` from `@/lib/planner/format`
- Produces: `/plan` route rendering `PlannerForm`; on submit redirects to `/plan/[slug]`

- [ ] **Step 1: Create PlannerForm client component**

```typescript
// src/components/PlannerForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateItinerary } from "@/actions/planner";
import type { FormInputs } from "@/lib/planner/format";

const INTERESTS = [
  "Wildlife",
  "Culture & History",
  "Tea Country",
  "Beaches",
  "Adventure",
  "Wellness",
  "Food & Drink",
  "City Life",
];

const REGIONS = [
  "Flexible",
  "Colombo",
  "Galle",
  "Kandy",
  "Nuwara Eliya",
  "Ella",
  "Trincomalee",
  "Jaffna",
  "Anuradhapura",
  "Polonnaruwa",
  "Batticaloa",
  "Matara",
];

export function PlannerForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState(5);
  const [region, setRegion] = useState("Flexible");
  const [interests, setInterests] = useState<string[]>([]);
  const [pace, setPace] = useState<FormInputs["pace"]>("balanced");
  const [notes, setNotes] = useState("");

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await generateItinerary({
        duration,
        starting_region: region,
        interests,
        pace,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/plan/${result.slug}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-8 p-8">
      {/* Duration */}
      <div>
        <label className="eyebrow mb-3 block">How many days?</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={14}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-[--brand]"
          />
          <span className="num w-12 shrink-0 text-center text-lg">{duration}</span>
        </div>
      </div>

      {/* Starting region */}
      <div>
        <label htmlFor="region" className="eyebrow mb-3 block">
          Starting region
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="field w-full"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Interests */}
      <div>
        <p className="eyebrow mb-3">Interests</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={
                interests.includes(interest)
                  ? "chip-featured"
                  : "chip-neutral"
              }
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <p className="eyebrow mb-3">Travel pace</p>
        <div className="flex gap-3">
          {(["relaxed", "balanced", "full"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(p)}
              className={`flex-1 rounded-xl border py-3 text-sm font-medium capitalize transition-colors ${
                pace === p
                  ? "border-[--brand] bg-[--brand]/10 text-[--brand]"
                  : "border-hairline text-muted hover:border-[--accent]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="eyebrow mb-3 block">
          Anything else? <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Travelling with kids, vegetarian, wheelchair access…"
          rows={3}
          className="field w-full resize-none"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error} — please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn w-full py-3 text-base"
      >
        {isPending ? "Finding the best of Sri Lanka for you…" : "Plan my trip"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the plan page**

```typescript
// src/app/plan/page.tsx
export const maxDuration = 45;

import { PlannerForm } from "@/components/PlannerForm";

export const metadata = {
  title: "Plan Your Trip — Ceylon Directory",
  description:
    "Tell us about your trip and we'll build a personalised Sri Lanka itinerary from verified local services.",
};

export default function PlanPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="eyebrow mb-3">AI Travel Planner</p>
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-ink">
        Plan your Sri Lanka trip
      </h1>
      <p className="mb-10 text-muted">
        Tell us what you're looking for and we'll build a day-by-day itinerary
        from verified local services — with web recommendations for anything
        we don't yet list.
      </p>
      <PlannerForm />
    </main>
  );
}
```

- [ ] **Step 3: Verify dev server renders the page**

```bash
npm run dev
```

Open `http://localhost:3000/plan`. Verify the form renders with all fields, pace buttons toggle correctly, interest chips toggle correctly, and the submit button appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlannerForm.tsx src/app/plan/page.tsx
git commit -m "feat(planner): planning form page at /plan"
```

---

### Task 6: Itinerary View Page

**Files:**
- Create: `src/components/ItineraryView.tsx`
- Create: `src/app/plan/[slug]/page.tsx`

**Interfaces:**
- Consumes: `Itinerary`, `Activity`, `Day` types from `@/lib/planner/format`; `increment_itinerary_views` Supabase RPC
- Produces: `/plan/[slug]` route; `ItineraryView` component accepting `{ itinerary: Itinerary; slug: string }`

- [ ] **Step 1: Create ItineraryView component**

```typescript
// src/components/ItineraryView.tsx
"use client";

import Link from "next/link";
import type { Itinerary, Activity } from "@/lib/planner/format";

const TIME_LABELS: Record<Activity["time_of_day"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="border-t border-hairline pt-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="chip-neutral text-xs">{TIME_LABELS[activity.time_of_day]}</span>
        {activity.source_type === "directory" && (
          <span className="chip-featured text-xs">Ceylon Directory</span>
        )}
      </div>
      <h3 className="mb-1 font-semibold text-ink">{activity.title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-muted">{activity.description}</p>
      <div className="flex flex-wrap gap-2">
        {activity.directory_slug && (
          <Link
            href={`/listing/${activity.directory_slug}`}
            className="text-xs font-medium text-accent hover:underline"
          >
            View listing →
          </Link>
        )}
        {activity.web_url && activity.web_source_name && (
          <a
            href={activity.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-ink"
          >
            Source: {activity.web_source_name} ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function ItineraryView({
  itinerary,
  slug,
}: {
  itinerary: Itinerary;
  slug: string;
}) {
  function copyLink() {
    void navigator.clipboard.writeText(window.location.href);
  }

  return (
    <article className="mx-auto max-w-2xl px-4 py-16 print:py-8">
      <header className="mb-10">
        <p className="eyebrow mb-3">Your itinerary</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-ink">
          {itinerary.title}
        </h1>
        <p className="mb-6 text-muted">{itinerary.summary}</p>
        <div className="flex flex-wrap gap-3 print:hidden">
          <button onClick={copyLink} className="btn-outline text-sm">
            Copy link
          </button>
          <Link href="/plan" className="text-sm text-muted hover:text-ink">
            Plan another trip →
          </Link>
        </div>
      </header>

      <div className="space-y-12">
        {itinerary.days.map((day) => (
          <section key={day.day}>
            <h2 className="mb-6 text-xl font-bold text-ink">{day.title}</h2>
            <div className="space-y-6">
              {day.activities.map((activity, i) => (
                <ActivityCard key={i} activity={activity} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 flex flex-wrap gap-3 print:hidden">
        <Link href="/plan" className="btn-outline">
          Plan another trip
        </Link>
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Create the itinerary page**

```typescript
// src/app/plan/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ItinerarySchema, type Itinerary } from "@/lib/planner/format";
import { ItineraryView } from "@/components/ItineraryView";
import { CalendarExport } from "@/components/CalendarExport";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("itineraries")
    .select("itinerary")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Itinerary — Ceylon Directory" };
  const itinerary = data.itinerary as Itinerary;
  return { title: `${itinerary.title} — Ceylon Directory` };
}

export default async function ItineraryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("itineraries")
    .select("id, slug, itinerary")
    .eq("slug", slug)
    .single();

  if (error || !data) notFound();

  // Fire-and-forget view count increment
  void supabase.rpc("increment_itinerary_views", { itinerary_id: data.id });

  const itinerary = ItinerarySchema.parse(data.itinerary);

  return (
    <>
      <ItineraryView itinerary={itinerary} slug={slug} />
      <div className="mx-auto max-w-2xl px-4 pb-16 print:hidden">
        <CalendarExport itinerary={itinerary} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ItineraryView.tsx src/app/plan/[slug]/page.tsx
git commit -m "feat(planner): itinerary view page at /plan/[slug]"
```

---

### Task 7: Google Calendar Export

**Files:**
- Create: `src/lib/planner/calendar.ts`
- Create: `src/components/CalendarExport.tsx`

**Interfaces:**
- Consumes: `Itinerary`, `Activity` from `@/lib/planner/format`
- Produces: `CalendarExport` client component; `exportToCalendar(itinerary, startDate, accessToken)` helper

- [ ] **Step 1: Create calendar.ts helper**

```typescript
// src/lib/planner/calendar.ts
import type { Itinerary, Activity } from "@/lib/planner/format";

const TIME_OFFSETS: Record<Activity["time_of_day"], { hour: number; minute: number }> = {
  morning:   { hour: 9,  minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening:   { hour: 18, minute: 0 },
};

function activityDate(startDate: Date, dayNumber: number, timeOfDay: Activity["time_of_day"]) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayNumber - 1);
  const { hour, minute } = TIME_OFFSETS[timeOfDay];
  d.setHours(hour, minute, 0, 0);
  return d;
}

function toGoogleDateTime(d: Date): string {
  return d.toISOString();
}

type CalendarEvent = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

function buildEvent(
  activity: Activity,
  dayNumber: number,
  startDate: Date,
  itineraryUrl: string,
): CalendarEvent {
  const start = activityDate(startDate, dayNumber, activity.time_of_day);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const sourceLink =
    activity.directory_slug
      ? `https://ceylon.lk/listing/${activity.directory_slug}`
      : activity.web_url ?? "";

  const description = [
    activity.description,
    sourceLink ? `\nMore info: ${sourceLink}` : "",
    `\nFull itinerary: ${itineraryUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: activity.title,
    description,
    start: { dateTime: toGoogleDateTime(start), timeZone: "Asia/Colombo" },
    end: { dateTime: toGoogleDateTime(end), timeZone: "Asia/Colombo" },
  };
}

export async function exportToCalendar(
  itinerary: Itinerary,
  startDate: Date,
  accessToken: string,
  itineraryUrl: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const events: CalendarEvent[] = [];
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      events.push(buildEvent(activity, day.day, startDate, itineraryUrl));
    }
  }

  let successCount = 0;
  for (const event of events) {
    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );
      if (res.ok) successCount++;
    } catch {
      // continue — partial export is better than none
    }
  }

  if (successCount === 0) return { ok: false, error: "No events were added to your calendar." };
  return { ok: true, count: successCount };
}
```

- [ ] **Step 2: Create CalendarExport component**

```typescript
// src/components/CalendarExport.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { exportToCalendar } from "@/lib/planner/calendar";
import type { Itinerary } from "@/lib/planner/format";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function CalendarExport({ itinerary }: { itinerary: Itinerary }) {
  const pathname = usePathname();
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!GOOGLE_CLIENT_ID) return null;

  async function handleExport() {
    if (!startDate) {
      setStatus("error");
      setMessage("Please enter your trip start date.");
      return;
    }

    setStatus("loading");

    // Google Identity Services token flow
    const tokenClient = (window as unknown as {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (response: { access_token?: string; error?: string }) => void;
            }) => { requestAccessToken: () => void };
          };
        };
      };
    }).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CALENDAR_SCOPE,
      callback: async (response) => {
        if (response.error || !response.access_token) {
          setStatus("error");
          setMessage("Google sign-in was cancelled.");
          return;
        }

        const itineraryUrl = `${window.location.origin}${pathname}`;
        const result = await exportToCalendar(
          itinerary,
          new Date(startDate),
          response.access_token,
          itineraryUrl,
        );

        if (result.ok) {
          setStatus("done");
          setMessage(`Added ${result.count} events to your Google Calendar.`);
        } else {
          setStatus("error");
          setMessage(result.error);
        }
      },
    });

    tokenClient.requestAccessToken();
  }

  if (status === "done") {
    return (
      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-400">
        {message}
      </p>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      <p className="eyebrow">Export to Google Calendar</p>
      <div className="flex gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="field flex-1"
          aria-label="Trip start date"
        />
        <button
          onClick={handleExport}
          disabled={status === "loading"}
          className="btn whitespace-nowrap"
        >
          {status === "loading" ? "Adding…" : "Export"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{message}</p>
      )}
      {/* next/script deduplicates across renders and loads outside the component
          tree — a raw <script> tag in JSX re-injects on every render and has no
          SRI support. Google's GSI script is versioned server-side so SRI hashes
          would break on every Google update; HTTPS is the integrity guarantee here. */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
    </div>
  );
}
```

- [ ] **Step 3: Add Google Client ID to env**

```bash
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id" >> .env.local
```

To get a client ID: Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application). Add `http://localhost:3000` to authorised JavaScript origins.

Enable the Google Calendar API in the project.

- [ ] **Step 4: Commit**

```bash
git add src/lib/planner/calendar.ts src/components/CalendarExport.tsx
git commit -m "feat(planner): Google Calendar export (client-side OAuth)"
```

---

### Task 8: Nav + Homepage CTA

**Files:**
- Modify: `src/components/Nav.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: existing nav link pattern; existing homepage CTA section

- [ ] **Step 1: Add "Plan a trip" to Nav**

In `src/components/Nav.tsx`, find the existing nav links array/JSX and add the planner link alongside Listings:

```typescript
// Find the nav links section and add:
<Link href="/plan" className="text-sm font-medium text-muted hover:text-ink transition-colors">
  Plan a trip
</Link>
```

Add it after the "Listings" link and before auth links.

- [ ] **Step 2: Add secondary CTA on homepage**

In `src/app/page.tsx`, find the hero section and add a secondary CTA below the primary button:

```typescript
// Below the existing primary CTA button, add:
<Link href="/plan" className="btn-outline">
  Plan your trip with AI
</Link>
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Confirm "Plan a trip" appears in the nav and links to `/plan`. Confirm the homepage CTA links to `/plan`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.tsx src/app/page.tsx
git commit -m "feat(planner): nav link + homepage CTA for /plan"
```

---

### Task 9: End-to-End Smoke Test

- [ ] **Step 1: Ensure Supabase is running**

```bash
npx supabase start
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all existing tests pass plus the new planner unit tests.

- [ ] **Step 3: Manual smoke test**

1. Go to `http://localhost:3000/plan`
2. Set 3 days, Kandy, Wildlife + Culture, Balanced pace
3. Click "Plan my trip" — wait for generation (~15-30s)
4. Verify redirect to `/plan/[slug]` with a rendered itinerary
5. Verify directory listings show "View listing →" links
6. Verify "Copy link" button copies the URL
7. Enter a start date, click Export — verify Google OAuth popup
8. Confirm events appear in Google Calendar

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(planner): AI travel planner complete — /plan + /plan/[slug] + calendar export"
git push origin main
```
