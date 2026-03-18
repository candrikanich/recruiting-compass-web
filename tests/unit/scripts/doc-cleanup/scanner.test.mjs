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
