# On the Horizon: Automation Pipelines Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3 headless Claude automation pipelines: a self-healing CI agent, a parallel TDD feature pipeline, and an automated web-to-iOS full-stack pipeline.

**Architecture:** Each pipeline is a bash script (matching `scripts/autofix.sh` pattern) that invokes `claude -p` headlessly with carefully engineered prompts. Scripts are wired into `package.json`. No new dependencies — just `claude` CLI + `gh` CLI + existing project tooling.

**Tech Stack:** Bash, Claude CLI (`claude -p`), GitHub CLI (`gh`), existing `npm run` scripts, `xcodebuild`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/ci-heal.sh` | Create | Self-healing CI agent |
| `scripts/feature-tdd.sh` | Create | Parallel TDD feature pipeline |
| `scripts/full-stack-feature.sh` | Create | Automated web-to-iOS pipeline |
| `package.json` | Modify | Wire all 3 scripts as npm commands |

---

## Chunk 1: Self-Healing CI Agent

### Task 1: `scripts/ci-heal.sh`

**Files:**
- Create: `scripts/ci-heal.sh`
- Modify: `package.json` (scripts section)

The `autofix:ci` pass in `autofix.sh` is reactive — you run it manually. `ci-heal.sh` is proactive: it polls GitHub CI, waits for a run to complete, diagnoses failures, fixes them, pushes, and watches the new run. It also has a `--watch` mode that keeps polling until green.

**Design:**
```
ci-heal.sh [--watch] [--max-attempts N] [--branch BRANCH]

--watch         Keep polling until CI is green (default: run once)
--max-attempts  Max fix attempts before giving up (default: 3)
--branch        Branch to watch (default: current branch)
```

- [ ] **Step 1: Create `scripts/ci-heal.sh`**

```bash
#!/usr/bin/env bash
# ci-heal.sh — self-healing CI agent
# Polls GitHub CI, diagnoses failures, fixes them, pushes, and watches the new run.
# Usage: bash scripts/ci-heal.sh [--watch] [--max-attempts N] [--branch BRANCH]

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WATCH=false
MAX_ATTEMPTS=3
BRANCH=$(git rev-parse --abbrev-ref HEAD)
ATTEMPT=0

for arg in "$@"; do
  case $arg in
    --watch)              WATCH=true ;;
    --max-attempts=*)     MAX_ATTEMPTS="${arg#*=}" ;;
    --branch=*)           BRANCH="${arg#*=}" ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ci-heal  branch=$BRANCH  watch=$WATCH  max-attempts=$MAX_ATTEMPTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

heal_once() {
  echo "▶ Checking CI status for branch: $BRANCH"

  # Get the latest run for this branch
  RUN_JSON=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId,status,conclusion,name 2>/dev/null)
  RUN_ID=$(echo "$RUN_JSON" | python3 -c "import sys,json; runs=json.load(sys.stdin); print(runs[0]['databaseId']) if runs else print('')" 2>/dev/null || echo "")
  STATUS=$(echo "$RUN_JSON" | python3 -c "import sys,json; runs=json.load(sys.stdin); print(runs[0]['status']) if runs else print('none')" 2>/dev/null || echo "none")
  CONCLUSION=$(echo "$RUN_JSON" | python3 -c "import sys,json; runs=json.load(sys.stdin); print(runs[0]['conclusion'] or '') if runs else print('')" 2>/dev/null || echo "")

  if [ -z "$RUN_ID" ]; then
    echo "No CI runs found for branch $BRANCH."
    return 0
  fi

  echo "  Run ID: $RUN_ID  Status: $STATUS  Conclusion: $CONCLUSION"

  # If still running, wait for it
  if [ "$STATUS" = "in_progress" ] || [ "$STATUS" = "queued" ] || [ "$STATUS" = "waiting" ]; then
    echo "  CI is still running — waiting for completion..."
    gh run watch "$RUN_ID" --exit-status 2>/dev/null || true
    # Re-check after watch completes
    CONCLUSION=$(gh run view "$RUN_ID" --json conclusion -q '.conclusion' 2>/dev/null || echo "failure")
  fi

  if [ "$CONCLUSION" = "success" ]; then
    echo "✅ CI is green. Nothing to fix."
    return 0
  fi

  # CI failed — diagnose and fix
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -gt "$MAX_ATTEMPTS" ]; then
    echo "❌ Reached max attempts ($MAX_ATTEMPTS). Giving up — manual intervention needed."
    echo "   Last run: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions/runs/$RUN_ID"
    return 1
  fi

  echo ""
  echo "▶ CI failed (attempt $ATTEMPT/$MAX_ATTEMPTS) — diagnosing..."

  # Fetch failure logs
  LOGS=$(gh run view "$RUN_ID" --log-failed 2>/dev/null | head -200)

  $CLAUDE -p \
    "You are a CI repair agent for The Recruiting Compass — a Nuxt 3 (TypeScript/Vue 3) web app with a companion SwiftUI iOS app.

The following GitHub Actions CI run failed. Diagnose the root cause, apply a fix, verify locally, commit and push.

## CI Failure Logs

\`\`\`
$LOGS
\`\`\`

## Fix Rules

Follow the ci-fix skill exactly:

**Classify first** — identify failure type: Lint | Type | Test | Build | E2E | iOS/Xcode

**iOS/Xcode failures:**
- NEVER edit gitignored xcconfig files — always edit project.pbxproj
- Verify both Debug AND Release configurations are updated
- Verify Swift flag names exactly — grep existing project settings before applying
- Local verify: \`cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass && xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`

**TypeScript failures:**
- When a fix would cascade to 50+ files, use targeted casts at the call site instead
- No \`any\` except in test files

**Test failures:**
- Fix the implementation, not the test
- Run: \`npx vitest run path/to/failing.test.ts\` to confirm fix, then \`npm run test\` for full suite

**After fixing:**
1. Run the appropriate local verify command
2. If it passes, commit with: \`fix(ci): <description>\`
3. Push: \`git push\`
4. Report: what you found, what you changed, what command confirmed the fix

If you cannot confidently fix the failure (e.g., requires architectural decision or missing context), stop and explain exactly what you found and why you stopped." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
  echo "▶ Fix applied. Waiting for new CI run to start..."
  sleep 15

  # Watch the new run
  NEW_RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
  if [ -n "$NEW_RUN_ID" ] && [ "$NEW_RUN_ID" != "$RUN_ID" ]; then
    echo "  Watching run $NEW_RUN_ID..."
    gh run watch "$NEW_RUN_ID" --exit-status 2>/dev/null && echo "✅ CI is now green!" || echo "⚠️  New run failed — will retry if --watch is set"
  fi
}

# Main loop
if [ "$WATCH" = true ]; then
  while true; do
    heal_once && break || true
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
      break
    fi
    echo "  Retrying in 30 seconds..."
    sleep 30
  done
else
  heal_once
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ci-heal complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/ci-heal.sh
```

- [ ] **Step 3: Add to package.json scripts**

Add under `"autofix:ci"`:
```json
"ci:heal": "bash scripts/ci-heal.sh",
"ci:heal:watch": "bash scripts/ci-heal.sh --watch"
```

- [ ] **Step 4: Smoke test — verify it runs and detects green CI**

```bash
npm run ci:heal
```
Expected: prints CI status, exits cleanly. If CI is currently green: `✅ CI is green. Nothing to fix.`

- [ ] **Step 5: Commit**

```bash
git add scripts/ci-heal.sh package.json
git commit -m "feat: add ci-heal self-healing CI agent script"
```

---

## Chunk 2: Parallel TDD Feature Pipeline

### Task 2: `scripts/feature-tdd.sh`

**Files:**
- Create: `scripts/feature-tdd.sh`
- Modify: `package.json`

Takes a feature name and description, then dispatches Claude to implement it with strict TDD: write failing tests first, confirm RED, implement minimal code, confirm GREEN, commit. The "parallel" aspect: for features touching multiple independent modules (e.g., API route + composable + component), Claude is instructed to identify the modules, implement each in TDD sequence, and verify integration at the end.

**Design:**
```
feature-tdd.sh --feature "feature-name" --description "what it does" [--scope web|ios|both]

--feature      Short name used for branch/commit naming
--description  Full description of what to build (can be multi-line, use quotes)
--scope        web (default), ios, or both
```

- [ ] **Step 1: Create `scripts/feature-tdd.sh`**

```bash
#!/usr/bin/env bash
# feature-tdd.sh — parallel TDD feature pipeline
# Implements a feature using strict TDD: tests first, RED confirmed, GREEN confirmed.
# Usage: bash scripts/feature-tdd.sh --feature "name" --description "what it does" [--scope web|ios|both]

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FEATURE=""
DESCRIPTION=""
SCOPE="web"

while [[ $# -gt 0 ]]; do
  case $1 in
    --feature)      FEATURE="$2";      shift 2 ;;
    --description)  DESCRIPTION="$2";  shift 2 ;;
    --scope)        SCOPE="$2";        shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$FEATURE" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: bash scripts/feature-tdd.sh --feature \"name\" --description \"what it does\" [--scope web|ios|both]"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  feature-tdd"
echo "  feature: $FEATURE"
echo "  scope:   $SCOPE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Web TDD ───────────────────────────────────────────────────────────────────
if [ "$SCOPE" = "web" ] || [ "$SCOPE" = "both" ]; then
  echo "▶ Web TDD implementation: $FEATURE"

  $CLAUDE -p \
    "You are implementing a feature for The Recruiting Compass — a Nuxt 3 (TypeScript/Vue 3) web app.

## Feature: $FEATURE

$DESCRIPTION

## Architecture
Page → Composable (useXxx) → Pinia Store → Supabase/API
- Composables: fetch data, orchestrate logic, return refs/computed
- Stores: centralized state, getters, actions (mutate here only)
- Components: UI only
- API routes: server/api/** (Nitro)

## TDD Requirements — follow this sequence exactly:

### Phase 1: Decompose
Identify the independent modules this feature needs (e.g., API route, composable, store action, component). List them. For each, define the interface before writing any code.

### Phase 2: For EACH module (in dependency order):
1. **Write the failing test first** — in the appropriate test file (Vitest for unit/integration)
   - Test file location mirrors source: \`server/api/foo.get.ts\` → \`tests/unit/server/api/foo.get.test.ts\`
   - Test runtime behavior, business logic, edge cases — NOT TypeScript types
2. **Run the test and confirm RED**: \`npx vitest run <test-file>\`
   - If it passes immediately, the test is wrong — fix it before proceeding
3. **Write minimal implementation** to make the test pass (no gold-plating)
4. **Run the test and confirm GREEN**: \`npx vitest run <test-file>\`
5. **Commit**: \`git add <files> && git commit -m \"feat($FEATURE): add <module-name>\"\`

### Phase 3: Integration
After all modules pass their unit tests:
1. Run the full suite: \`npm run test\`
2. Run type-check: \`npm run type-check\`
3. If anything fails, fix it (implementation, not tests)
4. Final commit: \`git commit -m \"feat($FEATURE): integration verified\"\`

### Phase 4: Report
List every file created/modified, test count added, and any decisions made." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
fi

# ── iOS TDD ───────────────────────────────────────────────────────────────────
if [ "$SCOPE" = "ios" ] || [ "$SCOPE" = "both" ]; then
  echo "▶ iOS TDD implementation: $FEATURE"

  IOS_ROOT=/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass

  $CLAUDE -p \
    "You are implementing a feature for The Recruiting Compass iOS app — SwiftUI + Swift Concurrency.

## Feature: $FEATURE

$DESCRIPTION

## TDD Requirements — follow this sequence exactly:

### Phase 1: Decompose
Identify the independent modules (Service, ViewModel, View, Model). For each, define the public interface before writing any code.

### Phase 2: For EACH module (Service and ViewModel only — Views are harder to unit test):
1. **Write the failing test first** in \`TheRecruitingCompassTests/\`
2. **Run and confirm RED**: \`cd $IOS_ROOT && xcodebuild test -scheme TheRecruitingCompass -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:TheRecruitingCompassTests/<TestClass> -quiet 2>&1 | grep -E 'error:|FAILED|PASSED'\`
3. **Write minimal implementation**
4. **Run and confirm GREEN**
5. **Build check**: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
6. **Commit**: \`cd $IOS_ROOT && git add <files> && git commit -m \"feat($FEATURE): add <module-name>\"\`

Per-agent checklist before marking any module done:
- [ ] Build passes (no new errors)
- [ ] No dropped prefixes (Color., Font., Image.)
- [ ] No wrong API substitutions
- [ ] Line length within 120 chars

### Phase 3: Report
List every file created/modified, test count added, any decisions made." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  feature-tdd complete: $FEATURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/feature-tdd.sh
```

- [ ] **Step 3: Add to package.json**

```json
"feature": "bash scripts/feature-tdd.sh --scope web",
"feature:ios": "bash scripts/feature-tdd.sh --scope ios",
"feature:both": "bash scripts/feature-tdd.sh --scope both"
```

- [ ] **Step 4: Smoke test — verify help message**

```bash
bash scripts/feature-tdd.sh
```
Expected: prints usage string, exits with code 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/feature-tdd.sh package.json
git commit -m "feat: add feature-tdd parallel TDD feature pipeline script"
```

---

## Chunk 3: Automated Web-to-iOS Full-Stack Pipeline

### Task 3: `scripts/full-stack-feature.sh`

**Files:**
- Create: `scripts/full-stack-feature.sh`
- Modify: `package.json`

The most ambitious pipeline. Describe a feature once — get both platforms implemented end-to-end:
1. **Web**: TDD implementation (via `feature-tdd.sh --scope web` prompt)
2. **Spec**: iOS handoff spec generated from the web implementation (invokes web-to-ios-handoff logic)
3. **iOS**: TDD implementation from the spec

Each phase runs sequentially (the spec depends on the web implementation; iOS depends on the spec).

**Design:**
```
full-stack-feature.sh --feature "name" --description "what it does" [--web-only] [--from-spec PATH]

--feature      Short name
--description  Full description
--web-only     Only run Phase 1 (web impl), skip spec + iOS
--from-spec    Skip Phase 1+2, implement iOS from an existing spec file
```

- [ ] **Step 1: Create `scripts/full-stack-feature.sh`**

```bash
#!/usr/bin/env bash
# full-stack-feature.sh — automated web-to-iOS full-stack pipeline
# Describe a feature once, get both platforms implemented end-to-end.
# Phases: web TDD → iOS spec → iOS TDD
# Usage: bash scripts/full-stack-feature.sh --feature "name" --description "what it does"

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FEATURE=""
DESCRIPTION=""
WEB_ONLY=false
FROM_SPEC=""
DATE=$(date +%Y-%m-%d)

while [[ $# -gt 0 ]]; do
  case $1 in
    --feature)      FEATURE="$2";      shift 2 ;;
    --description)  DESCRIPTION="$2";  shift 2 ;;
    --web-only)     WEB_ONLY=true;     shift ;;
    --from-spec)    FROM_SPEC="$2";    shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$FEATURE" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: bash scripts/full-stack-feature.sh --feature \"name\" --description \"what it does\""
  echo "       bash scripts/full-stack-feature.sh --feature \"name\" --description \"...\" --web-only"
  echo "       bash scripts/full-stack-feature.sh --feature \"name\" --description \"...\" --from-spec planning/iOS_SPEC_foo.md"
  exit 1
fi

SPEC_PATH="$ROOT/planning/iOS_SPEC_${FEATURE}-${DATE}.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  full-stack-feature pipeline"
echo "  feature:  $FEATURE"
echo "  web-only: $WEB_ONLY"
echo "  from-spec: ${FROM_SPEC:-none}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Phase 1: Web TDD ──────────────────────────────────────────────────────────
if [ -z "$FROM_SPEC" ]; then
  echo "▶ Phase 1: Web TDD implementation"
  bash "$ROOT/scripts/feature-tdd.sh" --feature "$FEATURE" --description "$DESCRIPTION" --scope web
  echo ""
fi

if [ "$WEB_ONLY" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Phase 1 complete (--web-only). iOS spec and implementation skipped."
  echo "  Run without --web-only to continue."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# ── Phase 2: iOS Spec Generation ──────────────────────────────────────────────
if [ -z "$FROM_SPEC" ]; then
  echo "▶ Phase 2: Generating iOS handoff spec"

  $CLAUDE -p \
    "You are generating an iOS handoff spec for The Recruiting Compass.

## Feature: $FEATURE
$DESCRIPTION

## Step 0 — Parity Check (REQUIRED first)
Before reading any web code, check whether this feature already exists in the iOS app:
\`\`\`bash
grep -ril \"$FEATURE\" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios --include=\"*.swift\" | sort
ls $ROOT/planning/iOS_SPEC_* 2>/dev/null | grep -i \"$FEATURE\" || true
\`\`\`
If iOS already has a complete implementation of this feature, stop and report. Do not generate a spec.

## Step 1 — Read Web Implementation
Find and read all files changed for this feature (API routes, composables, types, pages, components):
\`\`\`bash
git -C $ROOT log --oneline -10  # find recent commits for this feature
git -C $ROOT show --name-only HEAD~5..HEAD | grep -v '^commit'
\`\`\`

## Step 2 — Generate Spec
Write a complete iOS spec to: $SPEC_PATH

Follow the iOS spec template exactly (all sections, no skipping):
- Feature Overview
- Web Implementation Summary (files changed)
- What iOS Needs to Build (screens, navigation, component breakdown)
- API Endpoints to Call (full request/response shapes)
- Data Models in Swift (Codable structs)
- Business Rules to Enforce Client-Side
- Excluded Items (DB migrations, RLS, CSRF, email)
- Dependencies
- Notes for iOS Claude
- Test Checklist

## Quick Reference
- Auth: Bearer <supabase_access_token> on all endpoints
- Base URL: https://therecruitingcompass.com/api/
- No CSRF headers for mobile
- ISO 8601 dates, roles: 'player' | 'parent'
- Family code pattern: ^FAM-[A-Z0-9]{6}\$

After writing the spec, print the full path and a 3-5 bullet summary of what iOS needs to build." \
    --allowedTools "Bash,Read,Write,Glob,Grep" \
    --print

  echo ""
  echo "  Spec saved to: $SPEC_PATH"
  echo ""
else
  SPEC_PATH="$FROM_SPEC"
  echo "▶ Phase 2: Using existing spec: $SPEC_PATH"
  echo ""
fi

# ── Phase 3: iOS TDD Implementation ──────────────────────────────────────────
echo "▶ Phase 3: iOS TDD implementation from spec"

SPEC_CONTENT=$(cat "$SPEC_PATH" 2>/dev/null || echo "Spec file not found at $SPEC_PATH")

IOS_ROOT=/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass

$CLAUDE -p \
  "You are implementing a feature for The Recruiting Compass iOS app (SwiftUI + Swift Concurrency) from a handoff spec.

## Feature: $FEATURE

## iOS Spec
$SPEC_CONTENT

## Project Structure
- $IOS_ROOT/Features/  — feature-specific Views, ViewModels, Services
- $IOS_ROOT/Core/      — shared models, networking, auth
- $IOS_ROOT/Shared/    — reusable UI components

## Implementation Rules

**Orient before acting:**
1. Read the spec fully before touching any files
2. Check existing iOS files: \`grep -ril \"$FEATURE\" $IOS_ROOT --include='*.swift'\`
3. Only build what the spec says is NOT already implemented

**TDD sequence for Services and ViewModels:**
1. Write failing test in TheRecruitingCompassTests/
2. Confirm RED: \`cd $IOS_ROOT && xcodebuild test -scheme TheRecruitingCompass -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:TheRecruitingCompassTests/<TestClass> -quiet 2>&1 | tail -5\`
3. Write minimal implementation
4. Confirm GREEN
5. Build check: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
6. Commit: \`git commit -m 'feat($FEATURE): add <module>'\`

**Per-module checklist before marking done:**
- [ ] Build passes (no new errors)
- [ ] No dropped prefixes (Color., Font., Image.)
- [ ] No fabricated SwiftUI APIs — verify any unfamiliar modifier exists in project first
- [ ] No double-optional removal
- [ ] Line length ≤ 120 chars

**Final steps:**
1. Add feature to app navigation (check existing tab/navigation structure)
2. Full build: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet\`
3. Final commit: \`git commit -m 'feat($FEATURE): iOS implementation complete'\`
4. Report: every file created/modified, test count, decisions made" \
  --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
  --print

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  full-stack-feature complete: $FEATURE"
echo "  Web:  committed to $ROOT"
echo "  Spec: $SPEC_PATH"
echo "  iOS:  committed to $IOS_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/full-stack-feature.sh
```

- [ ] **Step 3: Add to package.json**

```json
"feature:full": "bash scripts/full-stack-feature.sh",
"feature:full:web-only": "bash scripts/full-stack-feature.sh --web-only"
```

- [ ] **Step 4: Smoke test — verify help message**

```bash
bash scripts/full-stack-feature.sh
```
Expected: prints usage string, exits with code 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/full-stack-feature.sh package.json
git commit -m "feat: add full-stack-feature automated web-to-iOS pipeline script"
```

---

## Chunk 4: Final package.json wiring + documentation

### Task 4: Wire everything and verify

**Files:**
- Modify: `package.json` (consolidate all new scripts)

- [ ] **Step 1: Verify final package.json scripts section looks like this**

```json
"scripts": {
  ...existing scripts...,
  "autofix": "bash scripts/autofix.sh",
  "autofix:security": "bash scripts/autofix.sh --only-security",
  "autofix:lint": "bash scripts/autofix.sh --only-lint",
  "autofix:ci": "bash scripts/autofix.sh --only-ci",
  "ci:heal": "bash scripts/ci-heal.sh",
  "ci:heal:watch": "bash scripts/ci-heal.sh --watch",
  "feature": "bash scripts/feature-tdd.sh --scope web",
  "feature:ios": "bash scripts/feature-tdd.sh --scope ios",
  "feature:both": "bash scripts/feature-tdd.sh --scope both",
  "feature:full": "bash scripts/full-stack-feature.sh",
  "feature:full:web-only": "bash scripts/full-stack-feature.sh --web-only"
}
```

- [ ] **Step 2: Run all smoke tests in sequence**

```bash
bash scripts/ci-heal.sh          # should print status + exit cleanly
bash scripts/feature-tdd.sh      # should print usage + exit 1
bash scripts/full-stack-feature.sh  # should print usage + exit 1
```

- [ ] **Step 3: Verify autofix still works**

```bash
npm run autofix
```
Expected: both passes clean (as before).

- [ ] **Step 4: Final commit**

```bash
git add package.json
git commit -m "chore: wire all automation scripts into package.json"
```

---

## Usage Reference

After implementation, the full automation suite:

```bash
# Proactive maintenance (run anytime)
npm run autofix                  # security + lint/types
npm run autofix:security         # just vulnerabilities
npm run autofix:lint             # just lint + types

# CI repair
npm run ci:heal                  # fix current CI failure once
npm run ci:heal:watch            # keep fixing until green

# Feature development
npm run feature -- --feature "coach-search" --description "..."     # web TDD
npm run feature:ios -- --feature "..." --description "..."          # iOS TDD
npm run feature:both -- --feature "..." --description "..."         # both

# Full-stack pipeline
npm run feature:full -- --feature "..." --description "..."         # web → spec → iOS
npm run feature:full:web-only -- --feature "..." --description "..."  # web only
```
