# Doc Hygiene System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated weekly doc cleanup system for both the web and iOS repos that deletes session debris, compresses completed plans into domain history files, and reviews ambiguous docs — keeping documentation lean and Claude-context-friendly.

**Architecture:** A Node.js scanner (`scanner.mjs`) pre-filters all docs into three buckets (autoDelete / compress / review) and writes a manifest. A Claude Code skill (`/doc-cleanup`) reads the manifest and executes three autonomous passes. A weekly cron in `~/.claude/settings.json` ties it all together for both repos.

**Tech Stack:** Node.js ESM (`node:fs/promises`, `node:path`), Vitest for tests, Claude Code skills, Claude Code cron scheduler

**Spec:** `docs/superpowers/specs/2026-03-18-doc-hygiene-design.md`

---

## File Map

### Web Repo (`recruiting-compass-web`)

| File | Action | Purpose |
|------|--------|---------|
| `scripts/doc-cleanup/scanner.mjs` | Create | Pre-filter script — buckets docs into manifest |
| `tests/unit/scripts/doc-cleanup/scanner.test.mjs` | Create | Vitest tests for scanner logic |
| `.claude/skills/doc-cleanup/SKILL.md` | Create | Claude skill — 3-pass cleanup |
| `.gitignore` | Modify | Add `.doc-cleanup-manifest.json` |

### iOS Repo (`recruiting-compass-ios`)

| File | Action | Purpose |
|------|--------|---------|
| `scripts/doc-cleanup/scanner.mjs` | Create | iOS-adapted pre-filter script |
| `.claude/skills/doc-cleanup/SKILL.md` | Create | Same skill (copied) |
| `.gitignore` | Modify | Add `.doc-cleanup-manifest.json` |

### Global

| File | Action | Purpose |
|------|--------|---------|
| `~/.claude/settings.json` | Modify | Add two weekly cron entries |

---

## Task 1: Update Web .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add manifest to .gitignore**

`test-results/` is already in the web `.gitignore`. Add the manifest:

```
# Doc cleanup
.doc-cleanup-manifest.json
```

Add it after the existing `test-results/` entry.

- [ ] **Step 2: Verify**

```bash
grep "doc-cleanup-manifest" .gitignore
```
Expected: `.doc-cleanup-manifest.json`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore doc cleanup manifest"
```

---

## Task 2: Write Scanner Tests (RED)

**Files:**
- Create: `tests/unit/scripts/doc-cleanup/scanner.test.mjs`

The scanner exports four testable functions: `isSkipped`, `isAutoDelete`, `isCompress`, `detectPairs`. Tests run against these directly — no filesystem mocking needed for the logic functions. For the full `scan()` integration, we use a real temp directory with fixture files.

- [ ] **Step 1: Add .test.mjs to vitest include patterns**

Open `vitest.config.ts` and update the `include` array:

```typescript
include: [
  "tests/unit/**/*.spec.ts",
  "tests/integration/**/*.spec.ts",
  "tests/unit/**/*.test.mjs",  // ← add this
],
```

- [ ] **Step 2: Create the test file**

```javascript
// tests/unit/scripts/doc-cleanup/scanner.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Import the functions we'll test
// (scanner.mjs doesn't exist yet — these imports will fail, confirming RED)
import {
  isSkipped,
  isAutoDelete,
  isCompress,
  detectPairs,
  scan,
} from '../../../../scripts/doc-cleanup/scanner.mjs'

const NOW = Date.now()
const RECENT = NOW - 1 * 24 * 60 * 60 * 1000      // 1 day ago (within 7-day buffer)
const OLD = NOW - 60 * 24 * 60 * 60 * 1000         // 60 days ago (old enough)
const MEDIUM = NOW - 30 * 24 * 60 * 60 * 1000      // 30 days ago

describe('isSkipped', () => {
  it('skips docs/history/ files', () => {
    expect(isSkipped('docs/history/auth.md', 'auth.md', OLD)).toBe(true)
  })

  it('skips docs/superpowers/specs/ files', () => {
    expect(isSkipped('docs/superpowers/specs/2026-03-18-design.md', '2026-03-18-design.md', OLD)).toBe(true)
  })

  it('skips .claude/ files', () => {
    expect(isSkipped('.claude/skills/foo/SKILL.md', 'SKILL.md', OLD)).toBe(true)
  })

  it('skips CLAUDE.md at root', () => {
    expect(isSkipped('CLAUDE.md', 'CLAUDE.md', OLD)).toBe(true)
  })

  it('skips COMPLETED_WORK.md at root', () => {
    expect(isSkipped('COMPLETED_WORK.md', 'COMPLETED_WORK.md', OLD)).toBe(true)
  })

  it('skips planning/lessons.md', () => {
    expect(isSkipped('planning/lessons.md', 'lessons.md', OLD)).toBe(true)
  })

  it('skips planning/RLS_POLICIES_*.md', () => {
    expect(isSkipped('planning/RLS_POLICIES_FOR_SECONDARY_USERS.md', 'RLS_POLICIES_FOR_SECONDARY_USERS.md', OLD)).toBe(true)
  })

  it('skips planning/SECURITY_AUDIT_*.md', () => {
    expect(isSkipped('planning/SECURITY_AUDIT_OWASP_2026.md', 'SECURITY_AUDIT_OWASP_2026.md', OLD)).toBe(true)
  })

  it('skips files modified within 7 days', () => {
    expect(isSkipped('planning/SOME_PLAN.md', 'SOME_PLAN.md', RECENT)).toBe(true)
  })

  it('does NOT skip a normal planning file', () => {
    expect(isSkipped('planning/LAUNCH_CHECKLIST.md', 'LAUNCH_CHECKLIST.md', OLD)).toBe(false)
  })
})

describe('isAutoDelete', () => {
  it('auto-deletes HANDOFF*.md', () => {
    expect(isAutoDelete('planning/HANDOFF_Auth_Pages_Refactor.md', 'HANDOFF_Auth_Pages_Refactor.md', OLD)).toBe(true)
  })

  it('auto-deletes *-handoff*.md', () => {
    expect(isAutoDelete('planning/2026-03-08-ios-profile-settings-handoff.md', '2026-03-08-ios-profile-settings-handoff.md', OLD)).toBe(true)
  })

  it('auto-deletes FIX_PLAN_*.md', () => {
    expect(isAutoDelete('planning/FIX_PLAN_EMAIL_MODAL.md', 'FIX_PLAN_EMAIL_MODAL.md', OLD)).toBe(true)
  })

  it('auto-deletes *_RECAP_*.md', () => {
    expect(isAutoDelete('archived-docs/SESSION_RECAP_JAN31.md', 'SESSION_RECAP_JAN31.md', OLD)).toBe(true)
  })

  it('auto-deletes DIAGNOSTIC_*.md', () => {
    expect(isAutoDelete('archived-docs/DIAGNOSTIC_REPORT.md', 'DIAGNOSTIC_REPORT.md', OLD)).toBe(true)
  })

  it('auto-deletes FAILURE_*.md', () => {
    expect(isAutoDelete('archived-docs/FAILURE_CORRELATION_MAP.md', 'FAILURE_CORRELATION_MAP.md', OLD)).toBe(true)
  })

  it('auto-deletes MOCK_*.md', () => {
    expect(isAutoDelete('planning/MOCK_ROOT_CAUSE_ANALYSIS.md', 'MOCK_ROOT_CAUSE_ANALYSIS.md', OLD)).toBe(true)
  })

  it('auto-deletes EXECUTION_STATUS_*.md', () => {
    expect(isAutoDelete('planning/EXECUTION_STATUS_JAN_27.md', 'EXECUTION_STATUS_JAN_27.md', OLD)).toBe(true)
  })

  it('auto-deletes archived-docs/ files older than 30 days', () => {
    expect(isAutoDelete('archived-docs/OLD_SUMMARY.md', 'OLD_SUMMARY.md', OLD)).toBe(true)
  })

  it('does NOT auto-delete archived-docs/ files modified within 30 days', () => {
    expect(isAutoDelete('archived-docs/RECENT.md', 'RECENT.md', MEDIUM)).toBe(false)
  })

  it('does NOT auto-delete *_SUMMARY.md in planning/', () => {
    // These are handled by compress/review, not auto-delete
    expect(isAutoDelete('planning/A11Y_SUMMARY.md', 'A11Y_SUMMARY.md', OLD)).toBe(false)
  })

  it('auto-deletes files in test-results/', () => {
    expect(isAutoDelete('test-results/some-test/error-context.md', 'error-context.md', OLD)).toBe(true)
  })

  it('auto-deletes *_handoff*.md (underscore variant)', () => {
    expect(isAutoDelete('planning/SOME_handoff_notes.md', 'SOME_handoff_notes.md', OLD)).toBe(true)
  })

  it('does NOT auto-delete a normal plan', () => {
    expect(isAutoDelete('planning/LAUNCH_CHECKLIST.md', 'LAUNCH_CHECKLIST.md', OLD)).toBe(false)
  })
})

describe('isCompress', () => {
  let tmpDir

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'scanner-test-'))
  })

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('compresses planning/IOS_SPEC files', async () => {
    const fullPath = join(tmpDir, 'iOS_SPEC_Phase1_Login.md')
    await writeFile(fullPath, '# Login Spec\nSome content')
    const result = await isCompress('planning/IOS_SPEC/iOS_SPEC_Phase1_Login.md', 'iOS_SPEC_Phase1_Login.md', OLD, fullPath)
    expect(result.compress).toBe(true)
    expect(result.reason).toBe('ios-spec')
  })

  it('compresses PHASE_N_*.md files', async () => {
    const fullPath = join(tmpDir, 'PHASE_1_REFACTORING.md')
    await writeFile(fullPath, '# Phase 1')
    const result = await isCompress('docs/plans/PHASE_1_REFACTORING.md', 'PHASE_1_REFACTORING.md', OLD, fullPath)
    expect(result.compress).toBe(true)
    expect(result.reason).toBe('phase-doc')
  })

  it('compresses old date-stamped file WITH top-level Status: Complete header', async () => {
    const fullPath = join(tmpDir, '2026-01-01-some-feature.md')
    await writeFile(fullPath, '# Some Feature\n\n## Status: Complete\n\nBody text')
    const result = await isCompress('docs/plans/2026-01-01-some-feature.md', '2026-01-01-some-feature.md', OLD, fullPath)
    expect(result.compress).toBe(true)
    expect(result.reason).toBe('date+completion')
  })

  it('does NOT compress old date-stamped file WITHOUT Status header', async () => {
    const fullPath = join(tmpDir, '2026-01-01-no-status.md')
    await writeFile(fullPath, '# Some Feature\n\nAll tasks ✅ completed\n\nBody text')
    const result = await isCompress('docs/plans/2026-01-01-no-status.md', '2026-01-01-no-status.md', OLD, fullPath)
    expect(result.compress).toBe(false)
  })

  it('does NOT compress recent date-stamped file even with Status header', async () => {
    const fullPath = join(tmpDir, '2026-03-17-recent-feature.md')
    await writeFile(fullPath, '## Status: Complete\n\nBody')
    const result = await isCompress('docs/plans/2026-03-17-recent-feature.md', '2026-03-17-recent-feature.md', RECENT, fullPath)
    expect(result.compress).toBe(false)
  })

  it('does NOT compress a file with Status: Complete only in body text, not as heading', async () => {
    const fullPath = join(tmpDir, '2026-01-01-body-status.md')
    await writeFile(fullPath, '# Plan\n\n- Task 1: Status: Complete in a list item\n\nDone')
    const result = await isCompress('docs/plans/2026-01-01-body-status.md', '2026-01-01-body-status.md', OLD, fullPath)
    expect(result.compress).toBe(false)
  })
})

describe('detectPairs', () => {
  it('groups -design.md and -plan.md with same date+slug into one item', () => {
    const input = [
      { relPath: 'docs/plans/2026-02-14-perf-design.md', basename: '2026-02-14-perf-design.md', reason: 'date+completion' },
      { relPath: 'docs/plans/2026-02-14-perf-plan.md', basename: '2026-02-14-perf-plan.md', reason: 'date+completion' },
    ]
    const result = detectPairs(input)
    expect(result).toHaveLength(1)
    expect(result[0].paths).toHaveLength(2)
    expect(result[0].reason).toBe('paired-date+completion')
  })

  it('leaves single files as individual items', () => {
    const input = [
      { relPath: 'docs/plans/2026-02-03-test-coverage.md', basename: '2026-02-03-test-coverage.md', reason: 'date+completion' },
    ]
    const result = detectPairs(input)
    expect(result).toHaveLength(1)
    expect(result[0].paths).toHaveLength(1)
    expect(result[0].reason).toBe('date+completion')
  })

  it('does not pair files with different dates', () => {
    const input = [
      { relPath: 'docs/plans/2026-02-14-perf-design.md', basename: '2026-02-14-perf-design.md', reason: 'date+completion' },
      { relPath: 'docs/plans/2026-02-15-perf-plan.md', basename: '2026-02-15-perf-plan.md', reason: 'date+completion' },
    ]
    const result = detectPairs(input)
    expect(result).toHaveLength(2)
  })
})

describe('scan() integration', () => {
  let tmpDir

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'scan-integration-'))
    // Create fixture directory structure
    await mkdir(join(tmpDir, 'planning', 'IOS_SPEC'), { recursive: true })
    await mkdir(join(tmpDir, 'docs', 'plans'), { recursive: true })
    await mkdir(join(tmpDir, 'archived-docs'), { recursive: true })

    // Should be auto-deleted (name pattern)
    await writeFile(join(tmpDir, 'planning', 'HANDOFF_Some_Feature.md'), '# Handoff')
    // Should be auto-deleted (archived-docs, old — set mtime later)
    await writeFile(join(tmpDir, 'archived-docs', 'OLD_FIX.md'), '# Old fix')

    // Should be compressed (IOS_SPEC)
    await writeFile(join(tmpDir, 'planning', 'IOS_SPEC', 'iOS_SPEC_Phase1_Login.md'), '# Login')

    // Should be in review (no completion marker, not old enough for date rule)
    await writeFile(join(tmpDir, 'planning', 'LAUNCH_CHECKLIST.md'), '# Launch\n- [ ] Item 1')

    // Protected — should not appear in any bucket
    await writeFile(join(tmpDir, 'CLAUDE.md'), '# Claude')
    await writeFile(join(tmpDir, 'COMPLETED_WORK.md'), '# Completed')
  })

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('produces a manifest with correct buckets', async () => {
    // Set old mtime on archived-docs file
    const { utimes } = await import('node:fs/promises')
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    await utimes(join(tmpDir, 'archived-docs', 'OLD_FIX.md'), oldDate, oldDate)
    await utimes(join(tmpDir, 'planning', 'HANDOFF_Some_Feature.md'), oldDate, oldDate)
    await utimes(join(tmpDir, 'planning', 'IOS_SPEC', 'iOS_SPEC_Phase1_Login.md'), oldDate, oldDate)
    await utimes(join(tmpDir, 'planning', 'LAUNCH_CHECKLIST.md'), oldDate, oldDate)

    const manifest = await scan(tmpDir, 'test-repo')

    expect(manifest.autoDelete).toContain('planning/HANDOFF_Some_Feature.md')
    expect(manifest.autoDelete).toContain('archived-docs/OLD_FIX.md')

    const compressPaths = manifest.compress.flatMap(c => c.paths)
    expect(compressPaths).toContain('planning/IOS_SPEC/iOS_SPEC_Phase1_Login.md')

    expect(manifest.review).toContain('planning/LAUNCH_CHECKLIST.md')

    // Protected files must not appear anywhere
    const allBucketedFiles = [
      ...manifest.autoDelete,
      ...manifest.compress.flatMap(c => c.paths),
      ...manifest.review,
    ]
    expect(allBucketedFiles).not.toContain('CLAUDE.md')
    expect(allBucketedFiles).not.toContain('COMPLETED_WORK.md')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail (RED)**

```bash
npx vitest run tests/unit/scripts/doc-cleanup/scanner.test.mjs 2>&1 | head -30
```
Expected: `Failed to resolve import "../../../../scripts/doc-cleanup/scanner.mjs"`

---

## Task 3: Implement scanner.mjs (GREEN)

**Files:**
- Create: `scripts/doc-cleanup/scanner.mjs`

- [ ] **Step 1: Create the scripts directory and scanner file**

```bash
mkdir -p scripts/doc-cleanup
```

- [ ] **Step 2: Write scanner.mjs**

```javascript
// scripts/doc-cleanup/scanner.mjs
import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join, basename as pathBasename, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '../..')

const SCAN_DIRS = ['planning', 'docs', 'archived-docs']

// Prefixes: skip any file whose relPath starts with one of these
const SKIP_DIR_PREFIXES = [
  'docs/history/',
  'docs/superpowers/specs/',
  '.claude/',
  'test-results/',
  'node_modules/',
  '.git/',
  '.nuxt/',
]

// Root-level filenames that are always protected
const SKIP_ROOT_FILES = new Set([
  'CLAUDE.md',
  'CLAUDE.local.md',
  'README.md',
  'CONTRIBUTING.md',
  'SECRETS.md',
  'COMPLETED_WORK.md',
])

// Regex patterns matched against relative path
const SKIP_PATH_PATTERNS = [
  /^planning\/lessons\.md$/i,
  /^planning\/RLS_POLICIES_/i,
  /^planning\/SECURITY_AUDIT_/i,
]

// Matched against basename (case-insensitive)
const AUTO_DELETE_BASENAME_PATTERNS = [
  /^HANDOFF/i,
  /.*[-_]handoff/i,
  /^FIX_PLAN_/i,
  /.*_RECAP_/i,
  /^DIAGNOSTIC_/i,
  /^FAILURE_/i,
  /^MOCK_/i,
  /^CONTEXT_READY\.md$/i,
  /^NEXT_SESSION_GUIDE\.md$/i,
  /^SESSION_COMPLETION_SUMMARY\.md$/i,
  /^EXECUTION_STATUS_/i,
]

// Top-level ## Status: heading — must be a markdown H2
const COMPLETION_MARKER_RE = /^##\s+Status:\s*(Complete|Done|Merged|Implemented)\s*$/im

const SIX_WEEKS_MS = 6 * 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ─── Core logic (exported for testing) ───────────────────────────────────────

export function isSkipped(relPath, base, mtime) {
  // Directory prefix check
  for (const prefix of SKIP_DIR_PREFIXES) {
    if (relPath.startsWith(prefix)) return true
  }
  // Root-level protected files (no slash in relPath = root level)
  if (!relPath.includes('/') && SKIP_ROOT_FILES.has(base)) return true
  // Path pattern check
  for (const re of SKIP_PATH_PATTERNS) {
    if (re.test(relPath)) return true
  }
  // 7-day recency buffer
  if (Date.now() - mtime < SEVEN_DAYS_MS) return true
  return false
}

export function isAutoDelete(relPath, base, mtime) {
  if (relPath.startsWith('test-results/')) return true
  if (relPath.startsWith('archived-docs/') && Date.now() - mtime > THIRTY_DAYS_MS) return true
  for (const re of AUTO_DELETE_BASENAME_PATTERNS) {
    if (re.test(base)) return true
  }
  return false
}

export async function isCompress(relPath, base, mtime, fullPath) {
  if (relPath.startsWith('planning/IOS_SPEC')) {
    return { compress: true, reason: 'ios-spec' }
  }
  if (relPath.startsWith('docs/phases/')) {
    return { compress: true, reason: 'phase-doc' }
  }
  if (/^PHASE_[0-9]_/i.test(base)) {
    return { compress: true, reason: 'phase-doc' }
  }
  // Date-stamped + old + top-level completion marker
  const hasDate = /^\d{4}-\d{2}-\d{2}-/.test(base)
  if (hasDate && Date.now() - mtime > SIX_WEEKS_MS) {
    const content = await readFile(fullPath, 'utf8')
    if (COMPLETION_MARKER_RE.test(content)) {
      return { compress: true, reason: 'date+completion' }
    }
  }
  return { compress: false }
}

export function detectPairs(items) {
  // Normalize a basename to a canonical slug by stripping -design / -plan suffixes
  const toSlug = (base) =>
    base
      .replace(/-design\.md$/i, '.md')
      .replace(/-plan\.md$/i, '.md')

  const groups = new Map()
  for (const item of items) {
    const dir = dirname(item.relPath)
    const slug = toSlug(item.basename)
    const key = `${dir}/${slug}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  return Array.from(groups.values()).map((group) => ({
    paths: group.map((i) => i.relPath),
    reason: group.length > 1 ? 'paired-date+completion' : group[0].reason,
  }))
}

// ─── Filesystem walker ────────────────────────────────────────────────────────

async function walkDir(dir, repoRoot) {
  const files = []
  if (!existsSync(dir)) return files
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, repoRoot)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({
        fullPath,
        relPath: relative(repoRoot, fullPath),
        basename: entry.name,
      })
    }
  }
  return files
}

// ─── Main scan ────────────────────────────────────────────────────────────────

export async function scan(repoRoot, repoName) {
  const files = []

  // Scan target directories
  for (const dir of SCAN_DIRS) {
    files.push(...(await walkDir(join(repoRoot, dir), repoRoot)))
  }

  // Scan root *.md files
  const rootEntries = await readdir(repoRoot, { withFileTypes: true }).catch(() => [])
  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({
        fullPath: join(repoRoot, entry.name),
        relPath: entry.name,
        basename: entry.name,
      })
    }
  }

  const autoDelete = []
  const compressRaw = []
  const review = []

  for (const file of files) {
    const { mtimeMs } = await stat(file.fullPath)

    if (isSkipped(file.relPath, file.basename, mtimeMs)) continue
    if (isAutoDelete(file.relPath, file.basename, mtimeMs)) {
      autoDelete.push(file.relPath)
      continue
    }

    const { compress, reason } = await isCompress(
      file.relPath,
      file.basename,
      mtimeMs,
      file.fullPath,
    )
    if (compress) {
      compressRaw.push({ ...file, reason })
      continue
    }

    review.push(file.relPath)
  }

  const compress = detectPairs(compressRaw)
  const manifest = {
    scannedAt: new Date().toISOString().split('T')[0],
    repo: repoName,
    autoDelete,
    compress,
    review,
  }

  await writeFile(
    join(repoRoot, '.doc-cleanup-manifest.json'),
    JSON.stringify(manifest, null, 2),
  )

  console.log(`\n✓ Doc scan complete — ${repoName}`)
  console.log(`  Auto-delete : ${autoDelete.length} files`)
  console.log(`  Compress    : ${compressRaw.length} files → ${compress.length} history entries`)
  console.log(`  Review      : ${review.length} files`)
  console.log(`  Manifest    → .doc-cleanup-manifest.json\n`)

  return manifest
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const repoName = process.argv[2] || 'recruiting-compass-web'
  scan(REPO_ROOT, repoName).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 3: Run tests (GREEN)**

```bash
npx vitest run tests/unit/scripts/doc-cleanup/scanner.test.mjs
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add scripts/doc-cleanup/scanner.mjs tests/unit/scripts/doc-cleanup/scanner.test.mjs
git commit -m "feat: add doc cleanup scanner with tests"
```

---

## Task 4: Create Web Skill

**Files:**
- Create: `.claude/skills/doc-cleanup/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p .claude/skills/doc-cleanup
```

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: doc-cleanup
description: 3-pass autonomous doc hygiene — reads .doc-cleanup-manifest.json, deletes session debris, compresses completed plans into docs/history/<domain>.md, reviews ambiguous docs. Runs fully autonomously with no confirmation.
trigger: manual or cron
---

# Doc Cleanup

Read `.doc-cleanup-manifest.json` from the repo root. If it doesn't exist, tell the user to run `node scripts/doc-cleanup/scanner.mjs` first. Then execute the three passes below autonomously — no confirmation needed.

---

## Pass 1 — Auto-Delete

Read `manifest.autoDelete[]`. For each path, delete the file:

```bash
rm "<path>"
```

After all deletions, log: `Deleted: N files (session debris)`

---

## Pass 2 — Compress

> **Ordering note:** `docs/history/<domain>.md` uses **prepend** (newest entry at top). `COMPLETED_WORK.md` uses **append** (newest entry at bottom). Do not mix these up.

Before writing the first history entry, ensure the directory exists:

```bash
mkdir -p docs/history
```

For each item in `manifest.compress[]`:

1. Read all files listed in `item.paths[]`
2. Write a 1–3 sentence summary combining all files (if paired): what was the goal, what was built/decided, any key pattern worth remembering
3. Infer the domain from content + path using this priority order (first match wins):
   - `family` — family unit, parent, invite, player, family invite
   - `auth` — login, signup, session, JWT, Supabase auth
   - `ios` — SwiftUI, Xcode, iOS, iPhone, UIKit
   - `e2e` — Playwright, E2E, end-to-end, test spec
   - `testing` — Vitest, unit test, coverage, mock
   - `ui` — component, design system, form, layout, TailwindCSS
   - `schools` — school, program, university
   - `coaches` — coach, staff, recruiting coordinator
   - `onboarding` — onboarding, wizard, signup flow
   - `infrastructure` — Vercel, Supabase, deployment, CI/CD, migration
   - `accessibility` — a11y, WCAG, aria, screen reader
   - `performance` — performance, optimization, bundle, speed
   - `marketing` — landing page, copy, email template, press kit
   - `general` — fallback when nothing else matches
4. **Prepend** this entry to `docs/history/<domain>.md` (create the file if it doesn't exist):

```markdown
# History: <Domain>

## YYYY-MM-DD — <Feature Name>
<1–3 sentence summary>

```

If the file already exists, insert the new entry after the `# History:` heading, before the first existing `## ` entry.

5. Delete all original files in `item.paths[]`

Log each compression: `Compressed: <filename> → docs/history/<domain>.md`

---

## Pass 3 — Review

For each file in `manifest.review[]`:

1. Read the file
2. Classify:
   - **keep** — future-looking, actively referenced, open checklists, security/audit docs, guides, launch plans, RLS policies. **When in doubt, keep.**
   - **compress** — clearly completed work with a concrete outcome → process identically to Pass 2
   - **delete** — stale one-off (old investigation, one-time fix plan, debugging session notes) with no lasting insight

Log your classification and reasoning briefly for each file.

---

## Final Step

**Append** the following to `COMPLETED_WORK.md` (do NOT rewrite existing content — append only):

```markdown

## Doc Cleanup Run — YYYY-MM-DD
- Deleted: N files (session debris)
- Compressed: N files → domain history
- Kept: N files (active/future-looking)

| Doc | Domain | Summary |
|-----|--------|---------|
| filename.md | domain | one-line summary |
```

Then commit everything:

```bash
git add -A
git commit -m "chore: doc cleanup run YYYY-MM-DD"
```
```

- [ ] **Step 3: Verify the skill is loadable**

```bash
ls .claude/skills/doc-cleanup/SKILL.md
```
Expected: file exists

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/doc-cleanup/SKILL.md
git commit -m "feat: add doc-cleanup Claude skill"
```

---

## Task 5: Configure Cron (Web + iOS)

- [ ] **Step 1: Run CronCreate for web repo**

Use the `CronCreate` tool with:
- `schedule`: `0 9 * * 0`
- `command`: `cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web && node scripts/doc-cleanup/scanner.mjs recruiting-compass-web && claude --print '/doc-cleanup'`
- `description`: `Weekly doc hygiene — recruiting-compass-web`

> After creating the cron, manually run the command once in a terminal to confirm `claude --print '/doc-cleanup'` correctly invokes the skill before relying on the schedule.

- [ ] **Step 2: Run CronCreate for iOS repo**

Use the `CronCreate` tool with:
- `schedule`: `0 9 * * 0`
- `command`: `cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios && node scripts/doc-cleanup/scanner.mjs recruiting-compass-ios && claude --print '/doc-cleanup'`
- `description`: `Weekly doc hygiene — recruiting-compass-ios`

- [ ] **Step 3: Verify both crons are registered**

Use the `CronList` tool and confirm both entries appear.

---

## Task 6: iOS Repo — Update .gitignore

**Files:**
- Modify: `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.gitignore`

- [ ] **Step 1: Add manifest to iOS .gitignore**

Append to `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.gitignore`:

```
# Doc cleanup
.doc-cleanup-manifest.json
```

- [ ] **Step 2: Verify**

```bash
grep "doc-cleanup-manifest" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.gitignore
```

- [ ] **Step 3: Commit (iOS repo)**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios
git add .gitignore
git commit -m "chore: gitignore doc cleanup manifest"
```

---

## Task 7: iOS Repo — Create Scanner

**Files:**
- Create: `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/scripts/doc-cleanup/scanner.mjs`

The iOS scanner is identical to the web scanner except for:
1. `REPO_ROOT` points to the iOS repo root (derived from `__dirname` — no change needed, it still walks up two levels from `scripts/doc-cleanup/`)
2. Different `SKIP_ROOT_FILES`: remove `CONTRIBUTING.md`; add nothing
3. Different `SKIP_PATH_PATTERNS`: remove `RLS_POLICIES` and `SECURITY_AUDIT` patterns (iOS has no such files)
4. `SCAN_DIRS`: same (`planning`, `docs`, `archived-docs`)
5. Additional `AUTO_DELETE_BASENAME_PATTERNS` for iOS-specific debris:
   - `/^REVIEW_SUMMARY\.md$/i`
   - `/^TEST_COVERAGE_REPORT\.md$/i`
   - `/^COMMIT_MESSAGE\.md$/i`
   - `/^.*_IMPLEMENTATION_COMPLETE\.md$/i`
   - `/^.*_IMPLEMENTATION_STATUS\.md$/i`
   - `/^.*_IMPLEMENTATION_PLAN\.md$/i` (one-off plans, not the living ones)
   - `/^AGENT_TEAM_.*\.md$/i` (agent team coordination docs)

- [ ] **Step 1: Create scripts directory**

```bash
mkdir -p /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/scripts/doc-cleanup
```

- [ ] **Step 2: Copy and adapt the web scanner**

Copy `scripts/doc-cleanup/scanner.mjs` to the iOS path, then apply the iOS-specific differences listed above:

- Remove `CONTRIBUTING.md` from `SKIP_ROOT_FILES`
- Remove the two `SKIP_PATH_PATTERNS` for RLS and SECURITY_AUDIT
- Add the iOS-specific `AUTO_DELETE_BASENAME_PATTERNS` listed above

- [ ] **Step 3: Smoke-test the iOS scanner**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios
node scripts/doc-cleanup/scanner.mjs recruiting-compass-ios
```
Expected: manifest summary printed, `.doc-cleanup-manifest.json` created. Spot-check a few entries look correct (e.g., `HANDOFF-about-page.md` should be in `autoDelete`).

- [ ] **Step 4: Commit (iOS repo)**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios
git add scripts/doc-cleanup/scanner.mjs
git commit -m "feat: add doc cleanup scanner"
```

---

## Task 8: iOS Repo — Create Skill

**Files:**
- Create: `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.claude/skills/doc-cleanup/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.claude/skills/doc-cleanup
```

- [ ] **Step 2: Copy the web skill**

```bash
cp /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web/.claude/skills/doc-cleanup/SKILL.md \
   /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/.claude/skills/doc-cleanup/SKILL.md
```

The skill content is identical — it reads whatever manifest is in the current repo root.

- [ ] **Step 3: Commit (iOS repo)**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios
git add .claude/skills/doc-cleanup/SKILL.md
git commit -m "feat: add doc-cleanup Claude skill"
```

---

## Task 9: Run Initial Cleanup (Web)

This is the first real run. It will clean up the existing 528-file backlog.

- [ ] **Step 1: Run the scanner**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
node scripts/doc-cleanup/scanner.mjs recruiting-compass-web
```

Review the printed summary. Spot-check `.doc-cleanup-manifest.json` — confirm a few `autoDelete` entries look right and nothing obviously wrong is in there.

- [ ] **Step 2: Run the skill**

Invoke the `/doc-cleanup` skill. Claude will execute all three passes, update `COMPLETED_WORK.md`, and commit.

- [ ] **Step 3: Verify results**

```bash
# Count remaining docs
find . -type f -name "*.md" | grep -v node_modules | grep -v .git | grep -v .nuxt | grep -v .claude | wc -l

# Check domain history was created
ls docs/history/

# Verify commit
git log --oneline -3
```

Expected:
- File count meaningfully reduced from 528
- `docs/history/` contains at least a few domain files
- Most recent commit is `chore: doc cleanup run YYYY-MM-DD`

---

## Task 10: Run Initial Cleanup (iOS)

- [ ] **Step 1: Run the iOS scanner**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios
node scripts/doc-cleanup/scanner.mjs recruiting-compass-ios
```

- [ ] **Step 2: Run the skill**

Invoke the `/doc-cleanup` skill from within the iOS repo context.

- [ ] **Step 3: Verify**

```bash
find /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios -type f -name "*.md" | grep -v ".git" | grep -v ".agents" | wc -l
ls /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/docs/history/ 2>/dev/null || echo "no history yet"
git -C /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios log --oneline -3
```

---

## Done Criteria

- [ ] `npm test` passes (all scanner unit tests green)
- [ ] `node scripts/doc-cleanup/scanner.mjs` runs and produces a valid manifest
- [ ] `/doc-cleanup` skill completes a full run and commits
- [ ] `docs/history/` contains at least one domain file after initial run
- [ ] Both cron jobs registered in Claude Code scheduler (verified with `CronList`)
- [ ] `COMPLETED_WORK.md` has a cleanup run entry
- [ ] Overall doc count meaningfully reduced
