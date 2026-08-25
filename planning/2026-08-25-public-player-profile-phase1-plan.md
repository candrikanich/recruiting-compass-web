# Public Player Profile — Phase 1 (Public Page Redesign) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing public player profile page to the Figma dark-hero layout and expose data already captured but not shown (performance metrics, team history, awards, values, commitment status), all read-only.

**Architecture:** Extend the `player_profiles` table and the gated public GET endpoint with new fields and a `section_config`-driven visibility/order model. Assemble the public payload through a pure, unit-tested gating helper so PII can never leak. Rebuild `PublicProfileCard.vue` into focused section sub-components ordered by `section_config`. Contact / Express-Interest buttons render but are inert until Phases 3–4.

**Tech Stack:** Nuxt 3 (Vue 3 `<script setup>`, TypeScript strict), Supabase Postgres (service-role read via `createServerSupabaseClient`), Vitest, Playwright, TailwindCSS + design tokens.

**Spec:** `planning/2026-08-25-public-player-profile-spec.md`

## Global Constraints

- TypeScript strict; no `any` outside tests. New enums as `as const`.
- UI: no raw hex / `rgba()` in templates or `<style>` — use brand Tailwind utilities (`bg-brand-slate-900`) or `theme.css` CSS vars. `npm run audit:tokens` must pass.
- Public endpoints must never return player private email/phone. Assemble payload through the gating helper only.
- Migrations live in `supabase/migrations/` named `YYYYMMDDHHMMSS_<name>.sql`. Apply live via Supabase MCP `apply_migration` (local `db push` is broken on this DB — see MEMORY).
- Single Supabase DB serves prod + QA. Additive columns only; no drops.
- Section keys (canonical, used everywhere): `metrics | film | academics | values | team_history | awards`.
- Commitment states: `uncommitted | committed`.
- Gates before "done": `npm run type-check`, `npm run lint`, `npm run test`, `npm run audit:tokens` all pass.

---

### Task 1: Migration — extend `player_profiles` + backfill `section_config`

**Files:**
- Create: `supabase/migrations/20260907000000_public_profile_phase1.sql`

**Interfaces:**
- Produces (DB columns): `player_profiles.banner_url text`, `looking_for text`, `commitment_status text default 'uncommitted'`, `committed_school_id uuid`, `awards jsonb default '[]'`, `values_tags text[] default '{}'`, `section_config jsonb default '[]'`, `show_metrics boolean default false`.

- [ ] **Step 1: Write the migration**

```sql
-- Public Player Profile Phase 1: extend player_profiles for the redesigned
-- public page. Additive only (single DB serves prod + QA).

alter table public.player_profiles
  add column if not exists banner_url        text,
  add column if not exists looking_for       text,
  add column if not exists commitment_status text not null default 'uncommitted'
    check (commitment_status in ('uncommitted','committed')),
  add column if not exists committed_school_id uuid references public.schools(id) on delete set null,
  add column if not exists awards            jsonb  not null default '[]'::jsonb,
  add column if not exists values_tags       text[] not null default '{}',
  add column if not exists section_config    jsonb  not null default '[]'::jsonb,
  add column if not exists show_metrics      boolean not null default false;

-- Backfill section_config from the existing show_* bools so ordering/visibility
-- has a starting point. metrics defaults hidden (new); film/academics/schools
-- inherit their current flag. team_history + awards + values default visible.
update public.player_profiles
set section_config = jsonb_build_array(
  jsonb_build_object('key','metrics',      'visible', coalesce(show_metrics,false)),
  jsonb_build_object('key','film',         'visible', coalesce(show_film,false)),
  jsonb_build_object('key','academics',    'visible', coalesce(show_academics,false)),
  jsonb_build_object('key','values',       'visible', true),
  jsonb_build_object('key','team_history', 'visible', true),
  jsonb_build_object('key','awards',       'visible', true)
)
where section_config = '[]'::jsonb;
```

- [ ] **Step 2: Apply live via Supabase MCP**

Apply with `mcp__claude_ai_Supabase__apply_migration` (name `public_profile_phase1`, project `xpxzhqghxecsjhvklsqg`). Then verify:

```sql
select column_name from information_schema.columns
where table_name='player_profiles'
  and column_name in ('banner_url','looking_for','commitment_status','committed_school_id','awards','values_tags','section_config','show_metrics');
```
Expected: 8 rows. And `select section_config from player_profiles limit 1;` returns a 6-element array.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260907000000_public_profile_phase1.sql
git commit -m "feat(db): extend player_profiles for public profile redesign"
```

---

### Task 2: Types — extend `PlayerProfile`, `PublicProfileData`, add section + awards types

**Files:**
- Modify: `types/models.ts` (`PlayerProfile` ~449, `PublicProfileData`, `PlayerDetails` ~361)

**Interfaces:**
- Produces:
  - `type ProfileSectionKey = "metrics" | "film" | "academics" | "values" | "team_history" | "awards"`
  - `interface ProfileSection { key: ProfileSectionKey; visible: boolean }`
  - `type CommitmentStatus = "uncommitted" | "committed"`
  - `interface ProfileAward { title: string; year: number | null }`
  - `interface PublicMetric { key: string; label: string; value: string; unit: string | null; verified: boolean }`
  - `interface PublicTeamHistoryEntry { name: string; level: string | null; coach: string | null; contact: string | null; years: string | null }`
  - Extend `PublicProfileData` with: `bannerUrl: string | null`, `jerseyNumber: number | null`, `commitmentStatus: CommitmentStatus`, `committedSchoolName: string | null`, `lookingFor: string | null`, `valuesTags: string[]`, `awards: ProfileAward[]`, `metrics: PublicMetric[] | null`, `teamHistory: PublicTeamHistoryEntry[] | null`, `sections: ProfileSection[]`.
  - Extend `PlayerProfile` with `banner_url`, `looking_for`, `commitment_status`, `committed_school_id`, `awards`, `values_tags`, `section_config`, `show_metrics`.
  - Extend `PlayerDetails` with `jersey_number?: number | null`.

- [ ] **Step 1: Add the new types and extend interfaces**

Add near `PlayerProfile`:

```typescript
export type ProfileSectionKey =
  | "metrics"
  | "film"
  | "academics"
  | "values"
  | "team_history"
  | "awards";

export interface ProfileSection {
  key: ProfileSectionKey;
  visible: boolean;
}

export type CommitmentStatus = "uncommitted" | "committed";

export interface ProfileAward {
  title: string;
  year: number | null;
}

export interface PublicMetric {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  verified: boolean;
}

export interface PublicTeamHistoryEntry {
  name: string;
  level: string | null;
  coach: string | null;
  contact: string | null;
  years: string | null;
}
```

Extend `PlayerProfile` with the 8 new snake_case columns (`awards: ProfileAward[]`, `values_tags: string[]`, `section_config: ProfileSection[]`, `commitment_status: CommitmentStatus`, others string/boolean/`string | null`). Extend `PlayerDetails` with `jersey_number?: number | null`. Extend `PublicProfileData` with the camelCase fields listed under Produces.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (new optional/added fields; fix any consumers of `PublicProfileData` that build the object — the endpoint in Task 4 covers the main one; component in Task 6 the other).

- [ ] **Step 3: Commit**

```bash
git add types/models.ts
git commit -m "feat(types): public profile section/awards/metrics types"
```

---

### Task 3: Pure helper — `section_config` defaults, backfill, resolution

**Files:**
- Create: `utils/profile/sectionConfig.ts`
- Test: `utils/profile/sectionConfig.test.ts`

**Interfaces:**
- Consumes: `ProfileSection`, `ProfileSectionKey` from `types/models`.
- Produces:
  - `DEFAULT_SECTION_ORDER: ProfileSectionKey[]`
  - `backfillSectionConfig(flags: { show_metrics?: boolean; show_film?: boolean; show_academics?: boolean }): ProfileSection[]`
  - `normalizeSectionConfig(raw: unknown): ProfileSection[]` — coerces stored jsonb into a valid, complete, de-duped, correctly-ordered list (drops unknown keys, appends missing known keys as `visible:false` in default order).
  - `isSectionVisible(sections: ProfileSection[], key: ProfileSectionKey): boolean`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SECTION_ORDER,
  backfillSectionConfig,
  normalizeSectionConfig,
  isSectionVisible,
} from "./sectionConfig";

describe("sectionConfig", () => {
  it("backfills from show_* flags with metrics hidden by default", () => {
    const s = backfillSectionConfig({ show_film: true, show_academics: false });
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "academics")).toBe(false);
    expect(isSectionVisible(s, "metrics")).toBe(false);
    expect(s.map((x) => x.key)).toEqual(DEFAULT_SECTION_ORDER);
  });

  it("normalizes: drops unknown keys, appends missing as hidden, keeps order", () => {
    const raw = [
      { key: "awards", visible: true },
      { key: "bogus", visible: true },
      { key: "film", visible: true },
    ];
    const s = normalizeSectionConfig(raw);
    expect(s.map((x) => x.key)).toEqual([
      "awards",
      "film",
      "metrics",
      "academics",
      "values",
      "team_history",
    ]);
    expect(isSectionVisible(s, "film")).toBe(true);
    expect(isSectionVisible(s, "metrics")).toBe(false);
  });

  it("normalizes empty/garbage to full default (all hidden except backfill rules)", () => {
    expect(normalizeSectionConfig(null).map((x) => x.key)).toEqual(
      DEFAULT_SECTION_ORDER,
    );
    expect(normalizeSectionConfig("nope").length).toBe(DEFAULT_SECTION_ORDER.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run utils/profile/sectionConfig.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
import type { ProfileSection, ProfileSectionKey } from "~/types/models";

export const DEFAULT_SECTION_ORDER: ProfileSectionKey[] = [
  "metrics",
  "film",
  "academics",
  "values",
  "team_history",
  "awards",
];

const KNOWN = new Set<ProfileSectionKey>(DEFAULT_SECTION_ORDER);

export function backfillSectionConfig(flags: {
  show_metrics?: boolean;
  show_film?: boolean;
  show_academics?: boolean;
}): ProfileSection[] {
  const visibleByKey: Record<ProfileSectionKey, boolean> = {
    metrics: !!flags.show_metrics,
    film: !!flags.show_film,
    academics: !!flags.show_academics,
    values: true,
    team_history: true,
    awards: true,
  };
  return DEFAULT_SECTION_ORDER.map((key) => ({ key, visible: visibleByKey[key] }));
}

export function normalizeSectionConfig(raw: unknown): ProfileSection[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<ProfileSectionKey>();
  const ordered: ProfileSection[] = [];
  for (const item of list) {
    const key = (item as { key?: unknown })?.key;
    if (typeof key !== "string" || !KNOWN.has(key as ProfileSectionKey)) continue;
    const k = key as ProfileSectionKey;
    if (seen.has(k)) continue;
    seen.add(k);
    ordered.push({ key: k, visible: !!(item as { visible?: unknown }).visible });
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) ordered.push({ key, visible: false });
  }
  return ordered;
}

export function isSectionVisible(
  sections: ProfileSection[],
  key: ProfileSectionKey,
): boolean {
  return sections.some((s) => s.key === key && s.visible);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run utils/profile/sectionConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/profile/sectionConfig.ts utils/profile/sectionConfig.test.ts
git commit -m "feat(profile): section_config normalize + backfill helpers"
```

---

### Task 4: Pure helper — public metrics + team-history builders

**Files:**
- Create: `utils/profile/publicProfileBuilders.ts`
- Test: `utils/profile/publicProfileBuilders.test.ts`

**Interfaces:**
- Consumes: `PublicMetric`, `PublicTeamHistoryEntry` from `types/models`; `getMetricDef` from `utils/metrics/canonical`.
- Produces:
  - `buildPublicMetrics(rows: Array<{ metric_type: string; display_value?: string | null; value?: number | null; unit?: string | null; verified?: boolean | null; is_primary?: boolean | null }>): PublicMetric[]` — primary first, then verified, cap 6, label via `getMetricDef`.
  - `buildTeamHistory(details: Record<string, unknown> | null): PublicTeamHistoryEntry[]` — from grade-level team fields + `travel_teams[]`, newest grade first.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildPublicMetrics, buildTeamHistory } from "./publicProfileBuilders";

describe("buildPublicMetrics", () => {
  it("prefers primary then verified, caps at 6, formats value", () => {
    const rows = [
      { metric_type: "sixty_yard_dash", display_value: "6.8", unit: "sec", verified: true, is_primary: true },
      { metric_type: "exit_velocity", value: 91, unit: "mph", verified: true, is_primary: false },
    ];
    const out = buildPublicMetrics(rows);
    expect(out[0].key).toBe("sixty_yard_dash");
    expect(out[0].value).toBe("6.8");
    expect(out[0].verified).toBe(true);
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out[1].label.length).toBeGreaterThan(0);
  });
});

describe("buildTeamHistory", () => {
  it("lists grade teams newest-first and travel teams", () => {
    const details = {
      twelfth_grade_team: "Olmsted Falls Varsity",
      twelfth_grade_coach: "Mike Smith",
      travel_teams: [{ name: "Ohio Warhawks 16U", coach: "Dave Johnson" }],
    };
    const out = buildTeamHistory(details);
    expect(out[0].name).toBe("Olmsted Falls Varsity");
    expect(out.some((e) => e.name === "Ohio Warhawks 16U")).toBe(true);
  });

  it("returns empty array for null details", () => {
    expect(buildTeamHistory(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run utils/profile/publicProfileBuilders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
import type { PublicMetric, PublicTeamHistoryEntry } from "~/types/models";
import { getMetricDef } from "~/utils/metrics/canonical";

export function buildPublicMetrics(
  rows: Array<{
    metric_type: string;
    display_value?: string | null;
    value?: number | null;
    unit?: string | null;
    verified?: boolean | null;
    is_primary?: boolean | null;
  }>,
): PublicMetric[] {
  const rank = (r: (typeof rows)[number]) =>
    (r.is_primary ? 0 : 1) * 10 + (r.verified ? 0 : 1);
  return [...rows]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 6)
    .map((r) => ({
      key: r.metric_type,
      label: getMetricDef(r.metric_type).label,
      value: r.display_value ?? (r.value != null ? String(r.value) : ""),
      unit: r.unit ?? null,
      verified: !!r.verified,
    }));
}

const GRADE_FIELDS: Array<[string, string, string]> = [
  ["twelfth_grade_team", "twelfth_grade_coach", "12th Grade"],
  ["eleventh_grade_team", "eleventh_grade_coach", "11th Grade"],
  ["tenth_grade_team", "tenth_grade_coach", "10th Grade"],
  ["ninth_grade_team", "ninth_grade_coach", "9th Grade"],
];

export function buildTeamHistory(
  details: Record<string, unknown> | null,
): PublicTeamHistoryEntry[] {
  if (!details) return [];
  const out: PublicTeamHistoryEntry[] = [];
  for (const [teamKey, coachKey, level] of GRADE_FIELDS) {
    const name = details[teamKey];
    if (typeof name === "string" && name.trim()) {
      out.push({
        name: name.trim(),
        level,
        coach: (details[coachKey] as string) || null,
        contact: null,
        years: null,
      });
    }
  }
  const travel = details.travel_teams;
  if (Array.isArray(travel)) {
    for (const t of travel) {
      const name = (t as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        out.push({
          name: name.trim(),
          level: "Travel",
          coach: ((t as { coach?: string }).coach) || null,
          contact: null,
          years: ((t as { years?: string }).years) || null,
        });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run utils/profile/publicProfileBuilders.test.ts`
Expected: PASS. (If `getMetricDef` label differs, assert `.length > 0` only — already done.)

- [ ] **Step 5: Commit**

```bash
git add utils/profile/publicProfileBuilders.ts utils/profile/publicProfileBuilders.test.ts
git commit -m "feat(profile): public metrics + team-history builders"
```

---

### Task 5: Extend public GET endpoint — metrics, team history, awards, values, commitment, sections

**Files:**
- Modify: `server/api/public/profile/[slug].get.ts`
- Test: `server/api/public/profile/__tests__/slug.get.test.ts` (create if absent; otherwise co-locate per repo convention)

**Interfaces:**
- Consumes: `normalizeSectionConfig`, `isSectionVisible` (Task 3); `buildPublicMetrics`, `buildTeamHistory` (Task 4).
- Produces: the extended `PublicProfileData` object (Task 2 fields populated), sections gated by `section_config`, `metrics` fetched from `performance_metrics` only when the `metrics` section is visible, no PII.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { assemblePublicProfile } from "../[slug].get";

describe("assemblePublicProfile", () => {
  const base = {
    profile: {
      header_color: "slate", bio: "hi", banner_url: null,
      commitment_status: "committed", looking_for: "D1 Midwest",
      values_tags: ["Academics"], awards: [{ title: "All-Conf", year: 2025 }],
      section_config: [
        { key: "metrics", visible: true },
        { key: "academics", visible: false },
      ],
      show_academics: false, show_athletic: true, show_film: false, show_schools: false,
    },
    user: { full_name: "Owen A", profile_photo_url: null },
    details: { gpa: 3.8, jersey_number: 7, twelfth_grade_team: "Varsity" },
    metricsRows: [{ metric_type: "exit_velocity", value: 91, unit: "mph", verified: true, is_primary: true }],
    videoLinks: null, schools: null, committedSchoolName: "Ohio State",
  };

  it("includes metrics when metrics section visible", () => {
    const r = assemblePublicProfile(base);
    expect(r.metrics?.[0].key).toBe("exit_velocity");
    expect(r.commitmentStatus).toBe("committed");
    expect(r.committedSchoolName).toBe("Ohio State");
    expect(r.jerseyNumber).toBe(7);
  });

  it("omits academics when its section is hidden", () => {
    const r = assemblePublicProfile(base);
    expect(r.academics).toBeNull();
  });

  it("never returns private contact fields", () => {
    const withEmail = { ...base, details: { ...base.details, email: "x@y.com", phone: "555" } };
    const r = assemblePublicProfile(withEmail);
    expect(JSON.stringify(r)).not.toContain("x@y.com");
    expect(JSON.stringify(r)).not.toContain("555");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run server/api/public/profile/__tests__/slug.get.test.ts`
Expected: FAIL — `assemblePublicProfile` not exported.

- [ ] **Step 3: Refactor endpoint to extract `assemblePublicProfile` + wire new data**

Extract a pure exported `assemblePublicProfile(input)` that takes the already-fetched rows and returns `PublicProfileData`, gating via `isSectionVisible(normalizeSectionConfig(profile.section_config), key)`. In the handler: after resolving `profile`, compute `const sections = normalizeSectionConfig(profile.section_config)`; fetch `performance_metrics` (`.select("metric_type, display_value, value, unit, verified, is_primary").eq("user_id", profile.user_id)`) only when `isSectionVisible(sections, "metrics")`; resolve `committedSchoolName` from `schools` when `committed_school_id` set; pass everything to `assemblePublicProfile`. Keep existing academics/athletic/film/schools/social logic but drive their gates off `sections` (map `academics`→academics, `film`→film; keep `show_schools` for schools which has no section key, and `show_athletic` for the athletic block). Populate `bannerUrl`, `jerseyNumber` (from `details.jersey_number`), `lookingFor`, `valuesTags`, `awards`, `teamHistory` (via `buildTeamHistory`, gated on `team_history`), `metrics` (via `buildPublicMetrics`, gated on `metrics`), `sections`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run server/api/public/profile/__tests__/slug.get.test.ts`
Expected: PASS.

- [ ] **Step 5: Live smoke test**

Run: `npm run dev`, then `curl -s localhost:3000/api/public/profile/<a-published-slug> | jq '{metrics,commitmentStatus,sections}'`. Confirm shape; confirm no `email`/`phone` present.

- [ ] **Step 6: Commit**

```bash
git add server/api/public/profile
git commit -m "feat(api): expose metrics/team-history/awards/values on public profile"
```

---

### Task 6: Section sub-components (dark-hero layout)

**Files:**
- Create: `components/profile/public/ProfileHero.vue`, `MetricsGrid.vue`, `HighlightsReel.vue`, `AcademicPanel.vue`, `TargetProgramValues.vue`, `TeamHistoryPanel.vue`, `AwardsHonors.vue`
- Test: `components/profile/public/__tests__/MetricsGrid.test.ts`, `ProfileHero.test.ts`

**Interfaces:**
- Consumes: `PublicProfileData` and its member types (Task 2).
- Produces: presentational components. `ProfileHero` props `{ data: PublicProfileData }` emits `contact`, `interest`. `MetricsGrid` props `{ metrics: PublicMetric[] }`. `AcademicPanel` props `{ academics, ncaaId }`. `TargetProgramValues` props `{ lookingFor, valuesTags }`. `TeamHistoryPanel` props `{ entries }`. `AwardsHonors` props `{ awards }`. `HighlightsReel` props `{ film }`.

- [ ] **Step 1: Write the failing component test (MetricsGrid + ProfileHero)**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MetricsGrid from "../MetricsGrid.vue";
import ProfileHero from "../ProfileHero.vue";

describe("MetricsGrid", () => {
  it("renders a tile per metric with label + value + unit", () => {
    const w = mount(MetricsGrid, {
      props: { metrics: [{ key: "exit_velocity", label: "Exit Velocity", value: "91", unit: "mph", verified: true }] },
    });
    expect(w.text()).toContain("Exit Velocity");
    expect(w.text()).toContain("91");
    expect(w.text()).toContain("mph");
  });
});

describe("ProfileHero", () => {
  it("emits contact and interest on button clicks", async () => {
    const w = mount(ProfileHero, {
      props: { data: { playerName: "Owen A", photoUrl: null, headerColor: "slate", bannerUrl: null, jerseyNumber: 7, commitmentStatus: "uncommitted", committedSchoolName: null, bio: "x", athletic: { primary_sport: "Baseball" } } as never },
    });
    const btns = w.findAll("button");
    await btns[0].trigger("click");
    await btns[1].trigger("click");
    expect(w.emitted().contact).toBeTruthy();
    expect(w.emitted().interest).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/profile/public/__tests__`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement the seven components**

Build each with `<script setup lang="ts">`, `defineProps<{...}>()`, `defineEmits<{ contact: []; interest: [] }>()` for the hero. Use brand tokens only (dark hero: `bg-brand-slate-900 text-white`, metric tiles as `DSCard`, badges as `DSBadge`, buttons as `DSButton`). Match Figma: hero shows avatar, name + sport `DSBadge`, physicals row (`height' weight lbs · pos/#· Class of YYYY · GPA`), bio, Contact Player + Express Interest `DSButton`s, "Verified Coach Access" pill; `MetricsGrid` = responsive grid of verified metric tiles; `HighlightsReel` = video cards; `AcademicPanel` = GPA/SAT/ACT/grad-year/major/NCAA ID; `TargetProgramValues` = `lookingFor` text + `valuesTags` badges; `TeamHistoryPanel` = list rows (name, level, coach, years); `AwardsHonors` = badge pills.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/profile/public/__tests__`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/public
git commit -m "feat(profile): dark-hero public section components"
```

---

### Task 7: Rebuild `PublicProfileCard.vue` to compose sections by `section_config`

**Files:**
- Modify: `components/profile/PublicProfileCard.vue`
- Test: `components/profile/__tests__/PublicProfileCard.test.ts`

**Interfaces:**
- Consumes: `PublicProfileData` (Task 2), the seven sub-components (Task 6), `isSectionVisible`/section order from `data.sections`.
- Produces: the full public page card. Emits `contact` / `interest` (bubbled from hero) — consumed inertly in Phase 1 (buttons render, handlers are no-ops / TODO markers for Phase 3–4).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PublicProfileCard from "../PublicProfileCard.vue";

const data = {
  playerName: "Owen A", photoUrl: null, headerColor: "slate", bannerUrl: null,
  jerseyNumber: 7, commitmentStatus: "uncommitted", committedSchoolName: null,
  bio: "x", lookingFor: "D1", valuesTags: ["Academics"], awards: [],
  academics: null, athletic: { primary_sport: "Baseball" }, film: null, schools: null, social: null,
  metrics: [{ key: "exit_velocity", label: "Exit Velocity", value: "91", unit: "mph", verified: true }],
  teamHistory: [], sections: [{ key: "metrics", visible: true }, { key: "awards", visible: false }],
} as never;

describe("PublicProfileCard", () => {
  it("renders visible sections and hides hidden ones", () => {
    const w = mount(PublicProfileCard, { props: { data } });
    expect(w.text()).toContain("Exit Velocity"); // metrics visible
    expect(w.text()).not.toContain("Awards & Athletic Honors"); // awards hidden
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/profile/__tests__/PublicProfileCard.test.ts`
Expected: FAIL (old card lacks metrics rendering).

- [ ] **Step 3: Rebuild the card**

Render `ProfileHero` always; then iterate `data.sections.filter(s => s.visible)` in order, mapping each key to its sub-component (`metrics`→MetricsGrid, `film`→HighlightsReel, `academics`→AcademicPanel, `values`→TargetProgramValues, `team_history`→TeamHistoryPanel, `awards`→AwardsHonors), passing the matching slice of `data`. Footer "Powered by RecruitingCompass". Bubble hero `@contact`/`@interest` up via `defineEmits`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/profile/__tests__/PublicProfileCard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/PublicProfileCard.vue components/profile/__tests__
git commit -m "feat(profile): compose public card sections by section_config"
```

---

### Task 8: E2E — public page renders redesigned layout unauthenticated

**Files:**
- Create/Modify: `tests/e2e/public-profile.spec.ts`

**Interfaces:**
- Consumes: a published seed profile slug (reuse existing E2E seed; if none has metrics, extend seed with one verified `performance_metrics` row + `section_config` metrics visible).

- [ ] **Step 1: Write the E2E test**

```typescript
import { test, expect } from "@playwright/test";

test("public profile renders redesigned sections unauthenticated", async ({ page }) => {
  await page.goto(`/p/${process.env.E2E_PROFILE_SLUG ?? "owen-andrikanich-2028"}`);
  await expect(page.getByRole("button", { name: /contact player/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /express interest/i })).toBeVisible();
  await expect(page.getByText(/verified athletic metrics/i)).toBeVisible();
  // No PII in the DOM
  await expect(page.locator("body")).not.toContainText("@"); // no raw email leak (adjust if bio contains @)
});
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- public-profile.spec.ts` (Node 22 — `nvm use`).
Expected: PASS against a published seed slug. If slug missing, set `E2E_PROFILE_SLUG` or extend seed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/public-profile.spec.ts
git commit -m "test(e2e): redesigned public profile renders unauthenticated"
```

---

### Task 9: Full gate + phase wrap

- [ ] **Step 1: Run all gates**

```bash
npm run type-check && npm run lint && npm run test && npm run audit:tokens
```
Expected: all PASS. Fix in one batch if not.

- [ ] **Step 2: Manual browser verify**

`npm run dev` → open `/p/<slug>` logged-out → confirm dark-hero layout, metrics grid populates, sections respect visibility, no console errors, no PII in Network payload for the profile GET.

- [ ] **Step 3: Update session notes + commit**

Note Phase 1 done in `CLAUDE.local.md`; buttons inert pending Phase 3/4.

```bash
git add CLAUDE.local.md
git commit -m "docs: public profile phase 1 complete (read-only redesign)"
```

---

## Self-Review

**Spec coverage (Phase 1 slice):** migration + new columns (T1), types (T2), section_config model (T3), metrics/team-history exposure (T4–T5), PII-safe payload (T5 test), dark-hero redesign + section ordering (T6–T7), unauth render + no-PII E2E (T8), gates (T9). Awards/values/commitment/jersey/banner all threaded T2→T5→T6/7. Contact/Interest buttons render inert — deferred to Phase 3/4 per spec. ✓

**Placeholder scan:** no TBD/TODO except the intentional inert-button markers (documented, not a gap). ✓

**Type consistency:** `ProfileSection`/`ProfileSectionKey`/`CommitmentStatus`/`PublicMetric`/`PublicTeamHistoryEntry`/`ProfileAward` defined in T2, consumed with identical names in T3–T7. `assemblePublicProfile` defined + tested in T5, no other caller. `isSectionVisible`/`normalizeSectionConfig`/`buildPublicMetrics`/`buildTeamHistory` names stable across T3–T7. ✓

**Deferred to later phase plans:** Phase 2 (setup page), Phase 3 (contact endpoint + coach match-or-create + Turnstile), Phase 4 (express interest + inbox + analytics). Each gets its own plan when reached.
