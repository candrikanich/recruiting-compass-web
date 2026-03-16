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

if [[ ! "$SCOPE" =~ ^(web|ios|both)$ ]]; then
  echo "Error: invalid scope '$SCOPE' — must be web, ios, or both" >&2
  exit 1
fi

# Validate required tools
if [ ! -x "$CLAUDE" ]; then
  echo "Error: Claude CLI not found at $CLAUDE" >&2
  exit 1
fi
if [ "$SCOPE" = "ios" ] || [ "$SCOPE" = "both" ]; then
  if ! command -v xcodebuild &>/dev/null; then
    echo "Error: xcodebuild not found — required for iOS scope" >&2
    exit 1
  fi
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
- Components: UI only, consume composables and stores
- API routes: server/api/** (Nitro handlers)

## Project location
Working directory: $ROOT

## TDD Requirements — follow this sequence exactly:

### Phase 1: Decompose
Identify the independent modules this feature needs (e.g., API route, composable, store action, component). List them. For each, define the interface before writing any code. Do NOT start writing code until you have listed all modules.

### Phase 2: For EACH module (in dependency order, deepest dependency first):
1. **Write the failing test first** in the appropriate test file (Vitest)
   - Test file mirrors source: \`server/api/foo.get.ts\` → \`tests/unit/server/api/foo.get.test.ts\`
   - Test runtime behavior and business logic — NOT TypeScript type constraints
   - Tests must use the project's existing mock patterns (check nearby test files for examples)
2. **Run the test and confirm RED**: \`npx vitest run <test-file> 2>&1 | tail -20\`
   - If it passes immediately, the test is wrong — stop and fix it before proceeding
   - Expected output: test name with FAIL and the reason (e.g., function not defined)
3. **Write minimal implementation** — only what makes the test pass, nothing more
4. **Run the test and confirm GREEN**: \`npx vitest run <test-file> 2>&1 | tail -10\`
   - Expected output: test name with PASS
5. **Commit**: \`git add <files> && git commit -m \"feat($FEATURE): add <module-name>\"\`

### Phase 3: Integration verification
After all modules pass their unit tests:
1. Run the full test suite: \`npm run test 2>&1 | tail -20\`
2. Run type-check: \`npm run type-check 2>&1 | tail -20\`
3. If anything fails, fix the implementation (not the tests)
4. Final commit if any fixes were needed: \`git commit -m \"feat($FEATURE): fix integration issues\"\`

### Phase 4: Report
- List every file created or modified
- Total new test count
- Any decisions made or trade-offs taken
- Any gaps or follow-up needed" \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
fi

# ── iOS TDD ───────────────────────────────────────────────────────────────────
if [ "$SCOPE" = "ios" ] || [ "$SCOPE" = "both" ]; then
  echo "▶ iOS TDD implementation: $FEATURE"

  IOS_ROOT="$(dirname "$ROOT")/recruiting-compass-ios/TheRecruitingCompass"

  $CLAUDE -p \
    "You are implementing a feature for The Recruiting Compass iOS app — SwiftUI + Swift Concurrency.

## Feature: $FEATURE

$DESCRIPTION

## Project location
iOS root: $IOS_ROOT
Structure:
- Features/  — feature-specific Views, ViewModels, Services
- Core/       — shared models, networking, auth
- Shared/     — reusable UI components

## TDD Requirements — follow this sequence exactly:

### Phase 1: Decompose
Identify the independent modules (Service, ViewModel, View, Model). Define each public interface before writing any code.

### Phase 2: For EACH testable module (Services and ViewModels — Views are not unit-tested):
1. **Write the failing test first** in \`TheRecruitingCompassTests/\`
2. **Run and confirm RED**:
   \`cd $IOS_ROOT && xcodebuild test -scheme TheRecruitingCompass -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:TheRecruitingCompassTests/<TestClass> -quiet 2>&1 | tail -10\`
   - Expected: FAILED with the specific test class/method
3. **Write minimal implementation**
4. **Run and confirm GREEN** (same command) — expected: no failures for that test class
5. **Build check**:
   \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
6. **Per-module checklist before committing:**
   - Build passes (no new errors)
   - No dropped prefixes (Color., Font., Image., etc.)
   - No fabricated SwiftUI APIs — verify any unfamiliar modifier exists in the project first
   - No double-optional removal (T?? → T? is not always safe)
   - Line length ≤ 120 chars (SwiftLint limit)
7. **Commit**: \`cd $IOS_ROOT && git add <files> && git commit -m \"feat($FEATURE): add <module-name>\"\`

### Phase 3: Integration
1. Add the new feature to app navigation (check existing tab bar / NavigationStack structure)
2. Full build: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
3. Final commit: \`git commit -m \"feat($FEATURE): iOS implementation complete\"\`

### Phase 4: Report
- Every file created or modified
- Test count added
- Any decisions or trade-offs" \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  feature-tdd complete: $FEATURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
