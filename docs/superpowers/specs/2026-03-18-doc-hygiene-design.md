# Doc Hygiene System — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** recruiting-compass-web + recruiting-compass-ios

---

## Problem

528 markdown/text files have accumulated across the project — session handoffs, fix plans, investigation notes, completed phase docs, and one-time summaries. These pollute Claude context, make navigation harder, and provide no ongoing value once the work they describe is done.

## Goal

Automatically keep documentation clean by:
1. Deleting pure session debris
2. Compressing completed plans/specs into living domain-history summaries
3. Keeping only actively-referenced or future-looking docs
4. Running weekly with no manual effort

---

## Architecture

```
Weekly Cron (Sunday 9am) — Claude Code scheduler (~/.claude/settings.json)
    ↓
scripts/doc-cleanup/scanner.mjs       ← fast, no AI, buckets every doc
    → writes .doc-cleanup-manifest.json
    ↓
/doc-cleanup skill (Claude)           ← 3-pass autonomous cleanup
    Pass 1: auto-delete debris
    Pass 2: compress completed plans → domain history
    Pass 3: review ambiguous docs → keep | compress | delete
    ↓
COMPLETED_WORK.md                     ← running cleanup log (append, newest last)
docs/history/<domain>.md              ← distilled knowledge per domain (prepend, newest first)
git commit: "chore: doc cleanup run YYYY-MM-DD"
```

> **Note:** These cron entries run locally via Claude Code's scheduler, not on Vercel's infrastructure.

Each repo (web + iOS) runs independently with its own scanner config, manifest, and history files.

---

## Scanner Script (`scripts/doc-cleanup/scanner.mjs`)

### Skip Paths (filtered before any bucket assignment)

The scanner must skip these paths entirely — they are never candidates:

```
docs/history/**
docs/superpowers/specs/**
.claude/**
planning/lessons.md
```

### Scan Targets

**Web repo:**
- `planning/**`
- `docs/**`
- `archived-docs/**`
- Root `*.md` (except protected files — see below)

**iOS repo:**
- `planning/**`
- `docs/**`
- `archived-docs/**` (if exists)
- Root `*.md` (except protected files — see below)

### Bucket Rules

**`autoDelete`** — unambiguous debris, deleted without review:

File name patterns (case-insensitive, matched on basename):
- `HANDOFF*.md`, `*-handoff*.md`, `*_handoff*.md`
- `FIX_PLAN_*.md`
- `*_RECAP_*.md`
- `DIAGNOSTIC_*.md`, `DIAGNOSTIC_REPORT.md`
- `FAILURE_*.md`, `FAILURE_CORRELATION_MAP.md`
- `MOCK_*.md`
- `CONTEXT_READY.md`, `NEXT_SESSION_GUIDE.md`
- `SESSION_COMPLETION_SUMMARY.md`
- `EXECUTION_STATUS_*.md`

Directory rules:
- All files in `archived-docs/` older than 30 days
- All files in `test-results/` (also add to `.gitignore`)

> **Note:** `*_SUMMARY.md` and `*_COMPLETE.md` patterns are intentionally excluded from `autoDelete` — they are too broad and risk deleting living reference docs. These are handled by the `compress` bucket via content signals instead.

**`compress`** — completed plans worth distilling:

Triggered by ALL of the following (age + completion signal required together — age alone is not enough):
- Date-stamped filename (`YYYY-MM-DD-*.md`) older than 6 weeks from scan date **AND** contains a top-level completion marker (see below)
- Located in `planning/IOS_SPEC` (path component match: `file.startsWith('planning/IOS_SPEC')`) — all iOS specs are implemented
- File name matches `PHASE_[0-9]_*.md` (legacy phase trackers in `docs/plans/`)
- Anywhere in `docs/phases/` directory (if it exists)

**Completion markers** must appear in a top-level `## Status:` heading or document front-matter block — not anywhere in the file body. Valid markers: `## Status: Complete`, `## Status: Done`, `## Status: Merged`, `## Status: Implemented`. Inline `✅` in the body does NOT trigger compress.

> **Rationale:** Content signals in the file body (e.g., `✅` checklist items, `COMPLETE` in a section title) are unreliable — security audits, RLS policy docs, and living checklists all contain these markers but are not done.

**`review`** — everything else, Claude makes the call.

### De-duplication of Paired Plan Files

`docs/plans/` contains paired files: `YYYY-MM-DD-<feature>-design.md` + `YYYY-MM-DD-<feature>.md` (or `-plan.md`). When both files match `compress`, they must be compressed together into a single history entry — not two separate entries. The scanner should detect pairs by matching date prefix + feature slug and emit them as a single `compress` item with both paths.

### Manifest Output

```json
{
  "scannedAt": "2026-03-18",
  "repo": "recruiting-compass-web",
  "autoDelete": ["archived-docs/HANDOFF.md"],
  "compress": [
    {
      "paths": ["docs/plans/2026-02-03-test-coverage-75-percent.md"],
      "reason": "date+completion"
    },
    {
      "paths": [
        "docs/plans/2026-02-14-performance-optimization-design.md",
        "docs/plans/2026-02-14-performance-optimization-plan.md"
      ],
      "reason": "paired-date+completion"
    }
  ],
  "review": ["planning/LAUNCH_CHECKLIST.md"]
}
```

Written to `.doc-cleanup-manifest.json` (gitignored).

---

## Claude Skill (`/doc-cleanup`)

### Pass 1 — Auto-Delete

Reads `manifest.autoDelete`. Deletes each file. No content review needed. Logs total count.

### Pass 2 — Compress

For each item in `manifest.compress`:
1. Read the file(s) (both files if paired)
2. Extract: what was the goal, what was decided/built, any key patterns to remember (max 3 sentences total — combine both files if paired)
3. Infer domain from content/path (see domain list below)
4. **Prepend** dated entry to `docs/history/<domain>.md` (newest entries at top)
5. Delete the original file(s)

### Pass 3 — Review

For each file in `manifest.review`:
1. Read the file
2. Classify as:
   - `keep` — still future-looking, actively referenced, or contains living reference info (checklists, security audits, guides, launch plans, RLS policies). When in doubt, keep.
   - `compress` — clearly completed work with a concrete outcome; process same as Pass 2
   - `delete` — stale one-off with no signal worth preserving (old fix plans, one-time investigations with no lasting insight)

**Guidance for ambiguous cases:**
- Undated or old uncompleted checklists (e.g., `LAUNCH_CHECKLIST.md`): classify as `keep` unless the checklist contains no items that could still apply to the current codebase state
- Security/audit docs: always `keep` unless they explicitly state superseded/replaced
- Checklists with all items checked: `compress`

### Domain Inference

Infer from content and path. When multiple domains match, prefer the more specific domain (e.g., `family` over `auth`). Use the file path as a tiebreaker when signals are equal. If no domain matches, use `general`.

| Domain | Trigger signals |
|--------|----------------|
| `auth` | login, signup, session, JWT, Supabase auth |
| `ios` | SwiftUI, Xcode, iOS, iPhone, UIKit |
| `e2e` | Playwright, E2E, end-to-end, test spec |
| `testing` | Vitest, unit test, coverage, mock |
| `ui` | component, design system, form, layout, TailwindCSS |
| `schools` | school, program, university |
| `coaches` | coach, staff, recruiting coordinator |
| `family` | family unit, parent, invite, player, family invite |
| `onboarding` | onboarding, wizard, signup flow |
| `infrastructure` | Vercel, Supabase, deployment, CI/CD, migration |
| `accessibility` | a11y, WCAG, aria, screen reader |
| `performance` | performance, optimization, bundle, speed |
| `marketing` | landing page, copy, email template, press kit |
| `general` | fallback when no other domain matches |

### Final Step — Update `COMPLETED_WORK.md`

**Append** a cleanup run entry (newest entries at bottom):

```markdown
## Doc Cleanup Run — 2026-03-18
- Deleted: 47 files (session debris)
- Compressed: 12 files → domain history
- Kept: 8 files (active/future-looking)

| Doc | Domain | Summary |
|-----|--------|---------|
| 2026-02-03-test-coverage-75-percent.md | testing | Achieved 75% unit test coverage via focused Vitest expansion |
```

Then commit: `chore: doc cleanup run YYYY-MM-DD`

---

## Output Files

### `COMPLETED_WORK.md` — append, newest last

Append a new section per cleanup run. Never rewrite existing entries.

### `docs/history/<domain>.md` — prepend, newest first

Created per domain on first entry. New entries are prepended so recent history is visible without scrolling.

```markdown
# History: Auth

## 2026-02-28 — Family Unit Symmetric Redesign
Redesigned family invite flow to be symmetric: either parent or player can initiate.
Added `family_invitations` table, `useFamilyInvite` composable, and parent onboarding wizard.

## 2026-02-06 — Signup Flow Overhaul
...
```

---

## Cron Configuration

Two jobs in `~/.claude/settings.json` (Claude Code scheduler — not Vercel crons), both run Sunday at 9am:

```json
{
  "schedule": "0 9 * * 0",
  "command": "node /path/to/recruiting-compass-web/scripts/doc-cleanup/scanner.mjs && claude --print '/doc-cleanup'",
  "description": "Weekly doc hygiene — web repo"
},
{
  "schedule": "0 9 * * 0",
  "command": "node /path/to/recruiting-compass-ios/scripts/doc-cleanup/scanner.mjs && claude --print '/doc-cleanup'",
  "description": "Weekly doc hygiene — iOS repo"
}
```

---

## Files Created by This Plan

### Web Repo
- `scripts/doc-cleanup/scanner.mjs` — pre-filter script
- `.doc-cleanup-manifest.json` — add to `.gitignore`
- `.claude/skills/doc-cleanup/SKILL.md` — Claude skill
- `docs/history/` — domain history directory (populated over time)
- Cron entries in `~/.claude/settings.json`

### iOS Repo
- `scripts/doc-cleanup/scanner.mjs` — iOS-specific pre-filter script
- `.doc-cleanup-manifest.json` — add to `.gitignore`
- `.claude/skills/doc-cleanup/SKILL.md` — same skill (copied)
- `docs/history/` — domain history directory

---

## What Gets Protected (Never Touched)

These are filtered before any bucket assignment:

- `CLAUDE.md`, `CLAUDE.local.md`
- `README.md`, `CONTRIBUTING.md`, `SECRETS.md`
- `COMPLETED_WORK.md`
- `docs/history/**`
- `docs/superpowers/specs/**`
- `.claude/**`
- `planning/lessons.md`
- Any file modified in the last 7 days (actively in-use buffer)
- `planning/RLS_POLICIES_*.md`, `planning/SECURITY_AUDIT_*.md` (living security reference docs)
