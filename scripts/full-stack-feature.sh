#!/usr/bin/env bash
# full-stack-feature.sh — automated web-to-iOS full-stack pipeline
# Describe a feature once, get both platforms implemented end-to-end.
# Phases: web TDD → iOS spec generation → iOS TDD
# Usage: bash scripts/full-stack-feature.sh --feature "name" --description "what it does" [options]
# Options:
#   --web-only          Run Phase 1 only (web TDD), skip spec + iOS
#   --from-spec PATH    Skip Phases 1+2, implement iOS from existing spec file

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_ROOT="$(dirname "$ROOT")/recruiting-compass-ios/TheRecruitingCompass"
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
  echo "       --web-only          Run web TDD only, skip iOS spec + implementation"
  echo "       --from-spec PATH    Skip web + spec, implement iOS from existing spec"
  exit 1
fi

# Validate required tools
if [ ! -x "$CLAUDE" ]; then
  echo "Error: Claude CLI not found at $CLAUDE" >&2
  exit 1
fi
if [ "$WEB_ONLY" = false ] && ! command -v xcodebuild &>/dev/null; then
  echo "Error: xcodebuild not found — required for iOS phases" >&2
  exit 1
fi

SPEC_PATH="$ROOT/planning/iOS_SPEC_${FEATURE}-${DATE}.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  full-stack-feature pipeline"
echo "  feature:   $FEATURE"
echo "  web-only:  $WEB_ONLY"
echo "  from-spec: ${FROM_SPEC:-none}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Phase 1: Web TDD ──────────────────────────────────────────────────────────
if [ -z "$FROM_SPEC" ]; then
  echo "▶ Phase 1: Web TDD implementation"
  bash "$ROOT/scripts/feature-tdd.sh" \
    --feature "$FEATURE" \
    --description "$DESCRIPTION" \
    --scope web
  echo ""
fi

if [ "$WEB_ONLY" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Phase 1 complete (--web-only)."
  echo "  Run without --web-only to continue to iOS spec + implementation."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# ── Phase 2: iOS Spec Generation ──────────────────────────────────────────────
if [ -z "$FROM_SPEC" ]; then
  echo "▶ Phase 2: Generating iOS handoff spec → $SPEC_PATH"

  $CLAUDE -p \
    "You are generating an iOS handoff spec for The Recruiting Compass.

## Feature: $FEATURE
$DESCRIPTION

## Working directory
Web project root: $ROOT

## Step 0 — Parity Check (REQUIRED — do this before anything else)
Check whether this feature already exists in the iOS app:
\`\`\`bash
grep -ril \"$FEATURE\" $IOS_ROOT --include='*.swift' 2>/dev/null | sort || echo 'no matches'
ls $ROOT/planning/iOS_SPEC_* 2>/dev/null | grep -i \"$FEATURE\" || echo 'no prior spec'
\`\`\`
If the iOS app already fully implements this feature, STOP and report that. Do not generate a spec.

## Step 1 — Identify web implementation files
Find what was recently changed for this feature:
\`\`\`bash
git -C $ROOT log --oneline -15
git -C $ROOT diff --name-only HEAD~10..HEAD 2>/dev/null | grep -v '^$' || true
\`\`\`
Read each relevant file (API routes in server/api/, composables/, types/, pages/, components/).

## Step 2 — Generate the iOS spec
Write a complete iOS spec to exactly this path: $SPEC_PATH

The spec MUST include ALL of these sections (use 'N/A' if truly empty, never skip):
1. Feature Overview (2-4 sentences, user-facing behavior only)
2. Web Implementation Summary (list files changed and what each does)
3. What iOS Needs to Build (screens table, navigation approach, section breakdown with states)
4. API Endpoints to Call (method, path, auth, request body, response 200, error responses)
5. Data Models in Swift (Codable structs with field types and CodingKeys if needed)
6. Business Rules to Enforce Client-Side (specific conditions and error messages)
7. Excluded Items (DB migrations, RLS policies, CSRF, email sending)
8. Dependencies (other iOS features required first)
9. Notes for iOS Claude (non-obvious implementation details)
10. Test Checklist (5+ concrete user-action scenarios)

## Quick Reference
- Auth: Bearer <supabase_access_token> on all endpoints
- Base URL: https://therecruitingcompass.com/api/
- No CSRF headers for mobile clients
- Dates: ISO 8601 strings, display with DateFormatter 'MMMM d, yyyy'
- Roles: 'player' | 'parent'
- Family code pattern: ^FAM-[A-Z0-9]{6}\$
- Error display: inline red Text() for field errors, green auto-dismiss for success, Alert for destructive

After writing, print the full spec path and a 3-5 bullet summary of what iOS needs to build." \
    --allowedTools "Bash,Read,Write,Glob,Grep" \
    --print

  echo ""

  if [ ! -f "$SPEC_PATH" ]; then
    echo "⚠️  Spec file not found at expected path: $SPEC_PATH"
    echo "   Phase 3 (iOS implementation) skipped — locate the spec and re-run with --from-spec"
    exit 1
  fi

  echo "  Spec saved to: $SPEC_PATH"
  echo ""
else
  SPEC_PATH="$FROM_SPEC"
  if [ ! -f "$SPEC_PATH" ]; then
    echo "Error: spec file not found: $SPEC_PATH" >&2
    exit 1
  fi
  echo "▶ Phase 2: Using existing spec: $SPEC_PATH"
  echo ""
fi

# ── Phase 3: iOS TDD Implementation ──────────────────────────────────────────
echo "▶ Phase 3: iOS TDD implementation from spec"

SPEC_CONTENT=$(cat "$SPEC_PATH")

$CLAUDE -p \
  "You are implementing a feature for The Recruiting Compass iOS app (SwiftUI + Swift Concurrency) from a handoff spec.

## Feature: $FEATURE

## iOS Project
Root: $IOS_ROOT
Structure:
- Features/  — feature-specific Views, ViewModels, Services
- Core/       — shared models, networking, auth
- Shared/     — reusable UI components

## iOS Spec (implement exactly what this says)
$SPEC_CONTENT

## Pre-Implementation: Orient Before Acting
1. Read the spec fully before touching any files
2. Check what already exists for this feature:
   \`grep -ril \"$FEATURE\" $IOS_ROOT --include='*.swift' 2>/dev/null | sort || echo 'none'\`
3. Only build what the spec says is NOT already implemented

## TDD Sequence for Services and ViewModels (Views are not unit-tested)

For each testable module:
1. Write failing test in TheRecruitingCompassTests/
2. Confirm RED: \`cd $IOS_ROOT && xcodebuild test -scheme TheRecruitingCompass -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:TheRecruitingCompassTests/<TestClass> -quiet 2>&1 | tail -10\`
3. Write minimal implementation
4. Confirm GREEN (same command)
5. Build check: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
6. Per-module checklist:
   - [ ] Build passes — no new errors
   - [ ] No dropped prefixes (Color., Font., Image.)
   - [ ] No fabricated SwiftUI APIs — verify any unfamiliar modifier in project first
   - [ ] No double-optional removal (T?? → T? is NOT always safe)
   - [ ] Line length ≤ 120 chars
7. Commit: \`cd $IOS_ROOT && git add <files> && git commit -m 'feat($FEATURE): add <module>'\`

## Final Steps
1. Add to app navigation (check existing tab bar / NavigationStack structure)
2. Final build: \`xcodebuild build -scheme TheRecruitingCompass -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | grep -E 'error:|BUILD SUCCEEDED|BUILD FAILED'\`
3. Final commit: \`git commit -m 'feat($FEATURE): iOS implementation complete'\`

## Report
- Every file created/modified
- Test count added
- Decisions made" \
  --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
  --print

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  full-stack-feature complete: $FEATURE"
echo "  Web:  committed to $ROOT"
echo "  Spec: $SPEC_PATH"
echo "  iOS:  committed to $IOS_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
