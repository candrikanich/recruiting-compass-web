# Public Player Profile — Phase 2 (Owner Setup Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the owner-facing profile setup/editor (Figma right frame) so an athlete controls their public page: appearance (hero color + banner), content (bio, "what I'm looking for", awards, values), section order + visibility, recruitment status, share tools + QR, and a live mini-preview — and make `section_config` a first-class, owner-editable field (closing the Phase-1 read/write asymmetry).

**Architecture:** Extend the existing `components/profile/ProfileSetup.vue` (already has publish toggle, share/copy, vanity slug, color picker, `show_*` toggles via `usePlayerProfile.updateProfile` → `server/api/player/profile.put.ts`). Split it into focused sub-components as it grows. The section editor writes `section_config` and keeps the legacy `show_*` bools in sync server-side, so both the public page (`resolveSections`) and the owner preview agree. Banner images go to a new Supabase Storage bucket. The live preview reuses `PublicProfileCard.vue` fed by the in-progress draft.

**Tech Stack:** Nuxt 3 (Vue 3 `<script setup>`, TS strict), Supabase (Postgres + Storage), Pinia, `sortablejs` (already a dep) for drag-reorder, `qrcode` (NEW dep) for the QR image, Vitest, TailwindCSS + design tokens.

**Spec:** `planning/2026-08-25-public-player-profile-spec.md` (see the 2026-08-25 Phase 2 design-inputs update).

## Global Constraints

- TypeScript strict; no `any` outside tests. `as const` for enums.
- UI: no raw hex/`rgba()` in templates/`<style>` — brand Tailwind utilities or `theme.css` vars only; `npm run audit:tokens` must pass.
- **Global component tags are `DesignSystem*`** (path-derived), never `DS*` — verify against `.nuxt/components.d.ts`. See `planning/lessons.md`.
- Columns already exist from Phase 1 (`banner_url`, `looking_for`, `commitment_status`, `committed_school_id`, `awards`, `values_tags`, `section_config`, `show_metrics`) — **no new player_profiles migration**. Only a Storage bucket is new.
- Owner writes flow through `usePlayerProfile.updateProfile(updates: Partial<PlayerProfile>)` → Pinia store → `PUT /api/player/profile`. Never mutate Pinia state directly in components.
- Section keys (canonical): `metrics | film | academics | values | team_history | awards` — **all 6 are `SECTION_META` rows** (values keeps its own reorderable/toggleable row per Chris 2026-08-25). The editor is data-driven off `SECTION_META` regardless.
- **Socials + recruiting-services are NOT section keys** — Chris's design (Figma `TSVId5Z9…` node 5-5) renders them as *inline sub-elements*, not reorderable sections: socials = a hero row of `icon + @handle` (X/Instagram/TikTok) under the bio; recruiting-services = a credential row under the metrics header (`NCAA ID` tag + external-link badges e.g. PrepBaseball Report, Perfect Game). Data already flows to the public endpoint (`buildSocial()` + the `athletic` section off `user_preferences.data`); the gap is render-only. No owner editor for these this phase (owner sets handles/service IDs in existing player-details forms). See new Tasks 5A + 5B.
- Commitment states: `uncommitted | committed`.
- Single Supabase DB serves prod + QA; Storage bucket + policies applied live via MCP (controller-run, with Chris's ok).
- Gates before "done": `npm run type-check`, `npm run lint`, `npm run test`, `npm run audit:tokens` all pass.

---

### Task 1: Add `qrcode` dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `qrcode` + `@types/qrcode` available for client import.

- [ ] **Step 1: Install (pinned, lockfile-compatible)**

Run: `npx npm@10.8.2 install qrcode@^1.5.4 && npx npm@10.8.2 install -D @types/qrcode@^1.5.5`
(Use `npm@10.8.2` to match CI — see `planning/lessons.md` npm-ci-version-mismatch.)

- [ ] **Step 2: Verify it imports server-safely (client-only usage)**

QR generation runs client-side only. Confirm `qrcode` isn't pulled into SSR — this app is `ssr: false`, so client import is fine.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add qrcode for profile share QR"
```

---

### Task 2: Storage bucket `profile-banners` + policies

**Files:**
- Create: `supabase/migrations/20260908000000_profile_banners_bucket.sql`

**Interfaces:**
- Produces: public-read Storage bucket `profile-banners`; authenticated owners write under `<user_id>/…`.

- [ ] **Step 1: Write the bucket migration**

```sql
-- Public profile banner images. Public read (banners appear on the public
-- page); authenticated users write only under their own <user_id>/ prefix.
insert into storage.buckets (id, name, public)
values ('profile-banners', 'profile-banners', true)
on conflict (id) do nothing;

create policy "profile-banners public read"
  on storage.objects for select
  using (bucket_id = 'profile-banners');

create policy "profile-banners owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-banners owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-banners owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Controller applies live via MCP**

The controller runs `apply_migration` (name `profile_banners_bucket`) with Chris's ok, then verifies: `select id, public from storage.buckets where id='profile-banners';` returns one public row, and `select count(*) from pg_policies where tablename='objects' and policyname like 'profile-banners%';` returns 4.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260908000000_profile_banners_bucket.sql
git commit -m "feat(db): profile-banners storage bucket + owner-scoped policies"
```

---

### Task 3: Extend `profile.put.ts` — new fields + `section_config`⇄`show_*` sync

**Files:**
- Modify: `server/api/player/profile.put.ts`
- Test: `tests/unit/server/api/player/profile.put.spec.ts` (create; match repo's server-test convention)

**Interfaces:**
- Consumes: `normalizeSectionConfig`, `backfillSectionConfig` from `utils/profile/sectionConfig`; `ProfileSection` type.
- Produces: the PUT accepts `banner_url`, `looking_for`, `commitment_status`, `committed_school_id`, `awards`, `values_tags`, `section_config`, `show_metrics`; and whenever `section_config` is written it derives the legacy `show_*` bools from it (metrics/film/academics), and whenever a legacy `show_*` is written without a `section_config` it patches the stored config's matching key — the two never drift.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { reconcileVisibility } from "~/server/api/player/profile.put";

describe("reconcileVisibility", () => {
  it("when section_config provided, derives show_* from it", () => {
    const out = reconcileVisibility(
      { section_config: [
        { key: "metrics", visible: true },
        { key: "film", visible: false },
        { key: "academics", visible: true },
      ] as never },
      { section_config: [], show_metrics: false, show_film: true, show_academics: false } as never,
    );
    expect(out.show_metrics).toBe(true);
    expect(out.show_film).toBe(false);
    expect(out.show_academics).toBe(true);
    expect(out.section_config).toHaveLength(6);
  });

  it("when only a legacy show_* provided, patches stored section_config's key", () => {
    const out = reconcileVisibility(
      { show_academics: false },
      { section_config: [
        { key: "academics", visible: true }, { key: "metrics", visible: true },
      ], show_academics: true } as never,
    );
    const acad = (out.section_config as { key: string; visible: boolean }[]).find(s => s.key === "academics");
    expect(acad?.visible).toBe(false);
  });

  it("no visibility fields → passes updates through untouched", () => {
    const out = reconcileVisibility({ bio: "hi" } as never, { section_config: [] } as never);
    expect(out).toEqual({ bio: "hi" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/server/api/player/profile.put.spec.ts`
Expected: FAIL — `reconcileVisibility` not exported.

- [ ] **Step 3: Implement**

Extend `UpdateProfileSchema` (Zod) with the new optional fields:

```typescript
banner_url: z.string().url().nullable().optional(),
looking_for: z.string().max(600).nullable().optional(),
commitment_status: z.enum(["uncommitted", "committed"]).optional(),
committed_school_id: z.string().uuid().nullable().optional(),
awards: z.array(z.object({ title: z.string().max(120), year: z.number().int().nullable() })).optional(),
values_tags: z.array(z.string().max(60)).max(12).optional(),
section_config: z.array(z.object({
  key: z.enum(["metrics","film","academics","values","team_history","awards"]),
  visible: z.boolean(),
})).optional(),
show_metrics: z.boolean().optional(),
```

Add and export the pure `reconcileVisibility(updates, current)`:

```typescript
import { normalizeSectionConfig, backfillSectionConfig } from "~/utils/profile/sectionConfig";
import type { ProfileSection } from "~/types/models";

const LEGACY_KEYS = { metrics: "show_metrics", film: "show_film", academics: "show_academics" } as const;

export function reconcileVisibility(
  updates: Record<string, unknown>,
  current: { section_config?: unknown; show_metrics?: boolean; show_film?: boolean; show_academics?: boolean },
): Record<string, unknown> {
  const out = { ...updates };
  if (Array.isArray(updates.section_config)) {
    const sections = normalizeSectionConfig(updates.section_config);
    out.section_config = sections;
    for (const [key, col] of Object.entries(LEGACY_KEYS)) {
      out[col] = sections.some((s) => s.key === (key as ProfileSection["key"]) && s.visible);
    }
    return out;
  }
  const touchedLegacy = Object.entries(LEGACY_KEYS).filter(([, col]) => col in updates);
  if (touchedLegacy.length) {
    const base = Array.isArray(current.section_config) && current.section_config.length
      ? normalizeSectionConfig(current.section_config)
      : backfillSectionConfig(current);
    out.section_config = base.map((s) => {
      const hit = touchedLegacy.find(([key]) => key === s.key);
      return hit ? { ...s, visible: !!updates[hit[1]] } : s;
    });
  }
  return out;
}
```

In the handler, after parsing + the membership check, fetch the current row's `section_config, show_metrics, show_film, show_academics`, run `const merged = reconcileVisibility(updates, current)`, and `.update(merged)`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/server/api/player/profile.put.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/api/player/profile.put.ts tests/unit/server/api/player/profile.put.spec.ts
git commit -m "feat(api): owner profile write accepts new fields + syncs section_config/show_*"
```

---

### Task 4: Banner upload composable

**Files:**
- Create: `composables/useProfileBanner.ts`
- Test: `tests/unit/composables/useProfileBanner.spec.ts`

**Interfaces:**
- Produces: `useProfileBanner()` → `{ uploading: Ref<boolean>, error: Ref<string|null>, uploadBanner(file: File): Promise<string> }`. Validates type (jpeg/png/webp) + size (≤ 4 MB), uploads to `profile-banners/<userId>/banner-<ts>.<ext>`, returns the public URL. Rejects with a user-friendly error otherwise.

- [ ] **Step 1: Write the failing test** (mock the Supabase storage client + user store)

```typescript
import { describe, it, expect, vi } from "vitest";
import { useProfileBanner } from "~/composables/useProfileBanner";

// The test mounts the composable with a mocked supabase client whose
// storage.from().upload resolves ok and getPublicUrl returns a URL.
describe("useProfileBanner", () => {
  it("rejects a >4MB file with a friendly error", async () => {
    const { uploadBanner, error } = useProfileBanner();
    const big = new File([new Uint8Array(4_200_000)], "b.png", { type: "image/png" });
    await expect(uploadBanner(big)).rejects.toThrow(/4\s?MB/i);
    expect(error.value).toMatch(/4\s?MB/i);
  });

  it("rejects a non-image type", async () => {
    const { uploadBanner } = useProfileBanner();
    const bad = new File([new Uint8Array(10)], "b.gif", { type: "image/gif" });
    await expect(uploadBanner(bad)).rejects.toThrow(/jpe?g|png|webp/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/composables/useProfileBanner.spec.ts`
Expected: FAIL — composable not found.

- [ ] **Step 3: Implement** using the established `supabase.storage.from(bucket)` pattern (see `composables/useFileAttachments.ts` for the repo's upload+getPublicUrl idiom). Validate `ACCEPTED = ["image/jpeg","image/png","image/webp"]` and `MAX = 4*1024*1024` before upload; path `${userId}/banner-${Date.now()}.${ext}`; `upsert: true`; return `getPublicUrl(path).data.publicUrl`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/composables/useProfileBanner.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useProfileBanner.ts tests/unit/composables/useProfileBanner.spec.ts
git commit -m "feat(profile): banner upload composable (type/size validation)"
```

---

### Task 5: Section-config editor component (drag-reorder + visibility)

**Files:**
- Create: `components/profile/setup/SectionConfigEditor.vue`
- Create: `utils/profile/sectionMeta.ts` (the data-driven section list)
- Test: `tests/unit/components/profile/SectionConfigEditor.spec.ts`

**Interfaces:**
- Consumes: `ProfileSection`/`ProfileSectionKey`, `normalizeSectionConfig`/`backfillSectionConfig`, `sortablejs`.
- Produces:
  - `utils/profile/sectionMeta.ts`: `SECTION_META: Record<ProfileSectionKey, { label: string; description: string }>` — the single place a new section (e.g. future `social`, `recruiting_services`) is registered.
  - `SectionConfigEditor.vue` props `{ modelValue: ProfileSection[]; showMetrics?: boolean }`, emits `update:modelValue` with the reordered/toggled `ProfileSection[]`. Renders one draggable row per section (label + description + visibility toggle), drag handle wired to `sortablejs`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SectionConfigEditor from "../../../../components/profile/setup/SectionConfigEditor.vue";

const sections = [
  { key: "metrics", visible: true },
  { key: "awards", visible: false },
];

describe("SectionConfigEditor", () => {
  it("renders a row per section with a visibility toggle and emits on toggle", async () => {
    const w = mount(SectionConfigEditor, { props: { modelValue: sections as never } });
    expect(w.text()).toMatch(/metrics/i);
    expect(w.text()).toMatch(/awards/i);
    const toggles = w.findAll("[data-test='section-visibility']");
    await toggles[1].trigger("click"); // flip awards
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as { key: string; visible: boolean }[];
    expect(emitted.find((s) => s.key === "awards")?.visible).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/profile/SectionConfigEditor.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement.** `sectionMeta.ts` maps each known key to label/description. The editor renders `props.modelValue` in order, each row = drag handle + `SECTION_META[key].label`/`.description` + a visibility toggle button (`data-test="section-visibility"`). Toggling emits a new array with that key flipped. Initialize `sortablejs` on the list container in `onMounted`, `onEnd` reorders a copy and emits `update:modelValue`. Guard against sections not in `SECTION_META` (skip unknown). Use brand tokens + `DesignSystem*` primitives.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/components/profile/SectionConfigEditor.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/setup/SectionConfigEditor.vue utils/profile/sectionMeta.ts tests/unit/components/profile/SectionConfigEditor.spec.ts
git commit -m "feat(profile): section-config drag/visibility editor"
```

---

### Task 5A: Public render — hero social links row

**Files:**
- Modify: `components/profile/public/ProfileHero.vue`
- Create: `utils/profile/socialLinks.ts` (pure builder: `social` → `{ platform, handle, url, icon }[]`)
- Test: `tests/unit/utils/profile/socialLinks.spec.ts` + hero render assertion

**Interfaces:**
- Consumes: `PublicProfileData.social` (already returned by `buildSocial()` — `twitter_handle`, `instagram_handle`, `tiktok_handle`, `facebook_url`).
- Produces: `buildSocialLinks(social): SocialLink[]` — one entry per present handle, `url` derived (`https://x.com/<handle>` sans `@`, `https://instagram.com/<handle>`, `https://tiktok.com/@<handle>`), skips empty. Hero renders an inline `icon + @handle` row, `·`-separated, under the bio. Renders nothing when list is empty.

- [ ] **Step 1: Failing test** — `buildSocialLinks` returns only present platforms with correct URLs; empty input → `[]`. Hero shows `@handle` text when social present, none when absent.
- [ ] **Step 2: Verify it fails.**
- [ ] **Step 3: Implement** the pure builder + hero row (brand tokens, `DesignSystem*`; icons via existing icon set — X/Instagram/TikTok). Strip leading `@` for URLs, keep `@` for display.
- [ ] **Step 4: Verify it passes** + `npm run type-check`.
- [ ] **Step 5: Commit** `feat(profile): render hero social links row (X/IG/TikTok)`

---

### Task 5B: Public render — metrics credential badges (NCAA ID + recruiting services)

**Files:**
- Create: `components/profile/public/MetricsCredentials.vue`
- Create: `utils/profile/recruitingCredentials.ts` (pure builder off the `athletic` section + `ALL_SERVICE_DEFS`)
- Modify: `components/profile/public/MetricsGrid.vue` (render `MetricsCredentials` under the section header, above the grid)
- Test: `tests/unit/utils/profile/recruitingCredentials.spec.ts` + component render

**Interfaces:**
- Consumes: `PublicProfileData.athletic` (already exposes `ncaa_id`, `perfect_game_id`, `prep_baseball_id`, `hudl_url`, `ncsa_id`, etc.); `ALL_SERVICE_DEFS` from `utils/services/canonical.ts` (label + URL template per service).
- Produces: `buildRecruitingCredentials(athletic): { ncaaId: string|null; services: { key, label, url }[] }`. Maps each present service field → its `ALL_SERVICE_DEFS` label + resolved external URL; skips services with no value and any without a URL template. `MetricsCredentials.vue` renders the `NCAA ID: <id>` tag (when present) followed by external-link badges (label + external-link icon, `target="_blank" rel="noopener"`). Renders nothing when NCAA ID absent AND no service badges.

- [ ] **Step 1: Failing test** — builder returns NCAA ID + only the services with values and URL templates; component renders one badge per service with an external link, and nothing when the credential set is empty.
- [ ] **Step 2: Verify it fails.**
- [ ] **Step 3: Implement.** Builder pulls from `ALL_SERVICE_DEFS` (single source for label + URL) — do NOT hardcode service labels. Component uses brand tokens + `DesignSystem*`. NCAA ID stays ALSO in `AcademicPanel` (design shows it in both places — do not remove it there).
- [ ] **Step 4: Verify it passes** + `npm run type-check` + `npm run audit:tokens`.
- [ ] **Step 5: Commit** `feat(profile): metrics credential row (NCAA ID + recruiting-service links)`

---

### Task 6: Content editors — looking_for, awards, values_tags

**Files:**
- Create: `components/profile/setup/ProfileContentEditor.vue`
- Test: `tests/unit/components/profile/ProfileContentEditor.spec.ts`

**Interfaces:**
- Consumes: `ProfileAward` type.
- Produces: props `{ bio, lookingFor, awards, valuesTags }`, emits `update:bio`, `update:lookingFor`, `update:awards`, `update:valuesTags`. Bio + looking_for are textareas (char counters: bio ≤300, looking_for ≤600). Awards = add/remove list of `{title, year}`. Values = chip input (add on Enter, remove per chip, ≤12).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileContentEditor from "../../../../components/profile/setup/ProfileContentEditor.vue";

describe("ProfileContentEditor", () => {
  it("adds a value tag on Enter and emits", async () => {
    const w = mount(ProfileContentEditor, {
      props: { bio: "", lookingFor: "", awards: [], valuesTags: [] } as never,
    });
    const input = w.find("[data-test='values-input']");
    await input.setValue("Academics");
    await input.trigger("keydown.enter");
    const emitted = w.emitted("update:valuesTags")?.at(-1)?.[0] as string[];
    expect(emitted).toContain("Academics");
  });

  it("adds an award row and emits", async () => {
    const w = mount(ProfileContentEditor, {
      props: { bio: "", lookingFor: "", awards: [], valuesTags: [] } as never,
    });
    await w.find("[data-test='add-award']").trigger("click");
    const emitted = w.emitted("update:awards")?.at(-1)?.[0] as unknown[];
    expect(emitted.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/profile/ProfileContentEditor.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** with `<script setup>`, `defineProps`/`defineEmits`, char counters, award add/remove, chip input (`data-test` hooks as in the test). Enforce caps (values ≤12, tag ≤60 chars, bio 300, looking_for 600). Brand tokens + `DesignSystem*`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/components/profile/ProfileContentEditor.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/setup/ProfileContentEditor.vue tests/unit/components/profile/ProfileContentEditor.spec.ts
git commit -m "feat(profile): content editor (looking_for, awards, values)"
```

---

### Task 7: Appearance (banner upload UI) + Recruitment Status controls

**Files:**
- Create: `components/profile/setup/ProfileAppearanceEditor.vue` (hero color reuse + banner upload)
- Create: `components/profile/setup/CommitmentStatusControl.vue`
- Test: `tests/unit/components/profile/CommitmentStatusControl.spec.ts`

**Interfaces:**
- Consumes: `useProfileBanner` (Task 4); existing school typeahead (reuse the component used in coaches/schools flows — locate the shared school-select; if none is reusable, a plain `<select>` over the family's `schools` is acceptable).
- Produces:
  - `ProfileAppearanceEditor`: props `{ headerColor, bannerUrl }`, emits `update:headerColor`, `update:bannerUrl` (after upload). File input → `uploadBanner` → emit URL; shows uploading state + error.
  - `CommitmentStatusControl`: props `{ status, committedSchoolId }`, emits `update:status` (`uncommitted|committed`) and `update:committedSchoolId`. School select only shown when `committed`.

- [ ] **Step 1: Write the failing test (CommitmentStatusControl)**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CommitmentStatusControl from "../../../../components/profile/setup/CommitmentStatusControl.vue";

describe("CommitmentStatusControl", () => {
  it("emits status and reveals school select only when committed", async () => {
    const w = mount(CommitmentStatusControl, {
      props: { status: "uncommitted", committedSchoolId: null, schools: [{ id: "s1", name: "Ohio State" }] } as never,
    });
    expect(w.find("[data-test='committed-school']").exists()).toBe(false);
    await w.find("[data-test='status-select']").setValue("committed");
    expect(w.emitted("update:status")?.at(-1)?.[0]).toBe("committed");
    await w.setProps({ status: "committed" } as never);
    expect(w.find("[data-test='committed-school']").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/profile/CommitmentStatusControl.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** both components. Appearance reuses the existing color-swatch markup from `ProfileSetup.vue` (extract it) + adds the banner file input wired to `useProfileBanner`. Commitment control: status `<select>` (`data-test="status-select"`), school select (`data-test="committed-school"`) shown only when `status==='committed'`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/components/profile/CommitmentStatusControl.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/setup/ProfileAppearanceEditor.vue components/profile/setup/CommitmentStatusControl.vue tests/unit/components/profile/CommitmentStatusControl.spec.ts
git commit -m "feat(profile): appearance (banner) + commitment status controls"
```

---

### Task 8: Share tools + QR code

**Files:**
- Create: `components/profile/setup/ShareProfilePanel.vue`
- Test: `tests/unit/components/profile/ShareProfilePanel.spec.ts`

**Interfaces:**
- Consumes: `qrcode` (Task 1); the public URL (`usePlayerProfile.publicUrl`).
- Produces: props `{ url: string }`. Renders copy-link (reuse existing copy behavior), Email / Text / Twitter share buttons (mailto:, sms:, twitter intent — all built from `url`), and a QR image generated client-side from `url` via `QRCode.toDataURL(url)`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ShareProfilePanel from "../../../../components/profile/setup/ShareProfilePanel.vue";

describe("ShareProfilePanel", () => {
  it("builds share links from the url and renders a QR image", async () => {
    const w = mount(ShareProfilePanel, { props: { url: "https://x.test/p/abc" } });
    await flushPromises();
    const mailto = w.find("a[href^='mailto:']");
    const sms = w.find("a[href^='sms:']");
    const tw = w.find("a[href*='twitter.com']");
    expect(mailto.attributes("href")).toContain("x.test%2Fp%2Fabc");
    expect(sms.exists()).toBe(true);
    expect(tw.attributes("href")).toContain("x.test");
    expect(w.find("img[data-test='qr']").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/profile/ShareProfilePanel.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement.** Build `mailto:?subject=…&body=<encoded url>`, `sms:?&body=<encoded url>`, `https://twitter.com/intent/tweet?url=<encoded url>`. On mount, `QRCode.toDataURL(props.url)` → `<img data-test="qr" :src="dataUrl">`. Copy button reuses clipboard behavior. `DesignSystem*` + brand tokens.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/components/profile/ShareProfilePanel.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/setup/ShareProfilePanel.vue tests/unit/components/profile/ShareProfilePanel.spec.ts
git commit -m "feat(profile): share tools + QR code panel"
```

---

### Task 9: Live mini-preview

**Files:**
- Create: `components/profile/setup/ProfileLivePreview.vue`
- Test: `tests/unit/components/profile/ProfileLivePreview.spec.ts`

**Interfaces:**
- Consumes: `PublicProfileCard.vue`, `resolveSections`, `buildPublicMetrics`/`buildTeamHistory` — assembles a `PublicProfileData` from the current draft so the preview matches the live endpoint's gating exactly.
- Produces: props `{ draft: <the setup draft>, details: PlayerDetails }`. Renders `PublicProfileCard` in a scaled/contained frame. Uses `resolveSections(draft)` (NOT raw `normalizeSectionConfig`) so preview == public page.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileLivePreview from "../../../../components/profile/setup/ProfileLivePreview.vue";

describe("ProfileLivePreview", () => {
  it("hides a section in the preview when its config visibility is false", () => {
    const draft = {
      section_config: [{ key: "awards", visible: false }],
      show_academics: false, show_film: false, show_metrics: false,
      awards: [{ title: "All-Conference", year: 2025 }],
      bio: "x", header_color: "slate",
    };
    const w = mount(ProfileLivePreview, { props: { draft, details: {} } as never });
    expect(w.text()).not.toContain("All-Conference");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/components/profile/ProfileLivePreview.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement.** Map the draft to `PublicProfileData` via a small local builder that mirrors `assemblePublicProfile`'s field mapping and calls `resolveSections(draft)`. Render `<PublicProfileCard :data="previewData" />` inside a `max-w` scaled container.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/components/profile/ProfileLivePreview.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/profile/setup/ProfileLivePreview.vue tests/unit/components/profile/ProfileLivePreview.spec.ts
git commit -m "feat(profile): live mini-preview (resolveSections parity)"
```

---

### Task 10: Fix `ProfilePreview.vue` to use `resolveSections`

**Files:**
- Modify: `components/profile/ProfilePreview.vue`
- Test: extend/adjust its existing spec if present.

**Interfaces:**
- Consumes: `resolveSections` (Phase 1).
- Produces: the owner preview derives sections via `resolveSections(settings)` (not raw `normalizeSectionConfig`), matching the public endpoint — closing the Phase-1 deferred divergence.

- [ ] **Step 1:** Replace the `normalizeSectionConfig(props.settings.section_config)` call at `ProfilePreview.vue:~123` with `resolveSections(props.settings)` (pass section_config + show_* fields).
- [ ] **Step 2:** Run its spec + `npm run type-check`. Expected: green.
- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfilePreview.vue
git commit -m "fix(profile): owner preview uses resolveSections (public parity)"
```

---

### Task 11: Assemble the setup page — wire sub-components into `ProfileSetup.vue`

**Files:**
- Modify: `components/profile/ProfileSetup.vue` (compose the Task 5–9 sub-components; keep it under ~300 lines by delegating)
- Modify: `pages/settings/public-profile.vue` (create if the setup isn't already routed there; otherwise wire into the existing settings route that renders `ProfileSetup`)
- Test: `tests/unit/components/profile/ProfileSetup.spec.ts` (extend existing if present)

**Interfaces:**
- Consumes: all Task 5–9 components; `usePlayerProfile.updateProfile`.
- Produces: the full setup page — header (publish toggle + `ShareProfilePanel`), (1) Appearance, (2) Content, (3) Section Configuration, (4) Recruitment Status, right rail `ProfileLivePreview`. Each control persists via `updateProfile({ … })` (debounced where it's a text field). Section editor persists `section_config` (server reconciles `show_*`).

- [ ] **Step 1: Write/extend the failing test** — assert the assembled page renders the four sections + the preview, and that toggling a section calls `updateProfile` with a `section_config` payload (mock `usePlayerProfile`).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** the composition. Keep the existing publish toggle, vanity slug, and color logic; replace the inline `show_*` toggle block with `<SectionConfigEditor>` bound to `draft.section_config`; add the new sections. Persist on change via `updateProfile`.
- [ ] **Step 4: Run to verify it passes** + `npm run type-check`, `npm run audit:tokens`.
- [ ] **Step 5: Commit**

```bash
git add components/profile/ProfileSetup.vue pages/settings/public-profile.vue tests/unit/components/profile/ProfileSetup.spec.ts
git commit -m "feat(profile): assemble owner setup page (appearance/content/sections/status/preview)"
```

---

### Task 12: E2E — owner edits a section, public page reflects it

**Files:**
- Create/Modify: `tests/e2e/profile-setup.spec.ts`

**Interfaces:**
- Consumes: an authenticated demo owner (reuse the demo player account, e.g. `player1@compassdemo.app`) + their public slug.

- [ ] **Step 1: Write the E2E** — log in as the demo owner, open the setup page, toggle a section's visibility off, then visit `/p/<their-slug>` unauthenticated and assert that section is absent; toggle back on and assert present. Follow the repo's Playwright auth/session conventions.
- [ ] **Step 2: Run it** (`nvm use`; note: local dev-server E2E may hit the EMFILE watcher limit — if so, run against the preview/CI as Phase 1 did; the spec still lands and CI runs it).
- [ ] **Step 3: Commit**

```bash
git add tests/e2e/profile-setup.spec.ts
git commit -m "test(e2e): owner section toggle reflects on public page"
```

---

### Task 13: Full gate + phase wrap

- [ ] **Step 1:** `npm run type-check && npm run lint && npm run test && npm run audit:tokens` — all pass (batch-fix if not).
- [ ] **Step 2:** Manual browser verify — `npm run dev`, open the setup page as a demo owner: upload a banner, reorder + toggle sections, set commitment, generate QR, watch the live preview update; then open the public URL and confirm it matches. No console errors.
- [ ] **Step 3:** Update `CLAUDE.local.md`; commit.

---

## Self-Review

**Spec coverage (Phase 2 slice):** banner upload (T2/T4/T7), looking_for/awards/values editors (T6), section-config drag+visibility editor writing `section_config` (T5) with server sync (T3), commitment status (T7), share tools + QR (T1/T8), live mini-preview (T9), setup page assembly + route (T11), owner-preview parity fix (T10), E2E (T12), gates (T13). ✓

**Design reconciliation (2026-08-25):** Chris's Figma (`TSVId5Z9…` node 5-5) received. Socials + recruiting-services are inline sub-elements (hero row / metrics credential row), NOT section keys → built as public-render components in Tasks 5A + 5B off already-exposed data; `SECTION_META` holds the 6 canonical section keys only (values keeps its own row). Awards + Values owner editors ARE built (Task 6, Chris confirmed) despite the mockup's Content card showing only Bio + Looking-For. ✓

**Type consistency:** `reconcileVisibility`, `useProfileBanner`, `SECTION_META`, `SectionConfigEditor`, `resolveSections` referenced with stable names across tasks; `ProfileSection`/`ProfileAward`/`CommitmentStatus` reused from Phase 1 types. ✓

**Dependencies on Phase 1:** all new columns + `resolveSections` land with PR #487. **This plan must not start until #487 is merged to `develop`** (or be explicitly stacked on `feat/public-player-profile`). ✓

**Deferred to later phases:** Phase 3 (Contact Player button/flow) + Phase 4 (Express Interest) — hero buttons render but their handlers/anti-abuse land later. Socials + recruiting-services public rendering is now IN scope (Tasks 5A/5B); no owner editor for them this phase (edited via existing player-details forms).
