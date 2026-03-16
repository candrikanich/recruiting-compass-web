#!/usr/bin/env bash
# ci-heal.sh — self-healing CI agent
# Polls GitHub CI, diagnoses failures, fixes them, pushes, and watches the new run.
# Usage: bash scripts/ci-heal.sh [--watch] [--max-attempts=N] [--branch=BRANCH]

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WATCH=false
MAX_ATTEMPTS=3
BRANCH=$(git rev-parse --abbrev-ref HEAD)
ATTEMPT=0  # total fix attempts across all cycles (not reset per cycle in --watch mode)

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

# Validate required tools
for tool in gh python3; do
  if ! command -v "$tool" &>/dev/null; then
    echo "Error: required tool '$tool' not found. Install it before running ci-heal." >&2
    exit 1
  fi
done
if [ ! -x "$CLAUDE" ]; then
  echo "Error: Claude CLI not found at $CLAUDE" >&2
  exit 1
fi

heal_once() {
  echo "▶ Checking CI status for branch: $BRANCH"

  RUN_JSON=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId,status,conclusion,name 2>/dev/null)
  read -r RUN_ID STATUS CONCLUSION < <(echo "$RUN_JSON" | python3 -c "
import sys, json
try:
    runs = json.load(sys.stdin)
    if not runs:
        print('  none ')
    else:
        r = runs[0]
        print(r.get('databaseId',''), r.get('status','none'), r.get('conclusion','') or '')
except Exception:
    print('  none ')
" 2>/dev/null || echo "  none ")

  if [ -z "$RUN_ID" ]; then
    echo "No CI runs found for branch $BRANCH."
    return 0
  fi

  echo "  Run ID: $RUN_ID  Status: $STATUS  Conclusion: $CONCLUSION"

  if [ "$STATUS" = "in_progress" ] || [ "$STATUS" = "queued" ] || [ "$STATUS" = "waiting" ]; then
    echo "  CI is still running — waiting for completion..."
    gh run watch "$RUN_ID" --exit-status 2>/dev/null || true
    CONCLUSION=$(gh run view "$RUN_ID" --json conclusion -q '.conclusion' 2>/dev/null || echo "failure")
  fi

  if [ "$CONCLUSION" = "success" ]; then
    echo "✅ CI is green. Nothing to fix."
    return 0
  fi

  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -gt "$MAX_ATTEMPTS" ]; then
    echo "❌ Reached max attempts ($MAX_ATTEMPTS). Giving up — manual intervention needed."
    echo "   Last run: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions/runs/$RUN_ID"
    return 1
  fi

  echo ""
  echo "▶ CI failed (attempt $ATTEMPT/$MAX_ATTEMPTS) — diagnosing..."

  LOGS=$(gh run view "$RUN_ID" --log-failed 2>/dev/null | tail -200)

  $CLAUDE -p \
    "You are a CI repair agent for The Recruiting Compass — a Nuxt 3 (TypeScript/Vue 3) web app with a companion SwiftUI iOS app.

The following GitHub Actions CI run failed. Diagnose the root cause, apply a fix, verify locally, commit and push.

## CI Failure Logs

\`\`\`
$LOGS
\`\`\`

## Fix Rules

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

If you cannot confidently fix the failure, stop and explain what you found and why you stopped." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print

  echo ""
  echo "▶ Fix applied. Waiting for new CI run to start..."
  sleep 15

  NEW_RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
  if [ -n "$NEW_RUN_ID" ] && [ "$NEW_RUN_ID" != "$RUN_ID" ]; then
    echo "  Watching run $NEW_RUN_ID..."
    gh run watch "$NEW_RUN_ID" --exit-status 2>/dev/null && echo "✅ CI is now green!" || echo "⚠️  New run failed — will retry if --watch is set"
  fi
}

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
