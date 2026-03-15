#!/usr/bin/env bash
# autofix.sh — headless Claude fix pipeline
# Runs three passes in sequence: security → lint/types → CI triage
# Each pass commits its changes independently. Safe to run anytime.

set -euo pipefail

CLAUDE=/Users/chrisandrikanich/.local/bin/claude
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS_SECURITY=true
PASS_LINT=true
PASS_CI=false  # only runs when --ci flag is passed

for arg in "$@"; do
  case $arg in
    --no-security) PASS_SECURITY=false ;;
    --no-lint)     PASS_LINT=false ;;
    --ci)          PASS_CI=true ;;
    --only-ci)     PASS_SECURITY=false; PASS_LINT=false; PASS_CI=true ;;
    --only-security) PASS_LINT=false; PASS_CI=false ;;
    --only-lint)   PASS_SECURITY=false; PASS_CI=false ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  autofix pipeline"
echo "  security=$PASS_SECURITY  lint=$PASS_LINT  ci=$PASS_CI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Pass 1: Security ──────────────────────────────────────────────────────────
if [ "$PASS_SECURITY" = true ]; then
  echo "▶ Pass 1: Security (npm audit)"
  $CLAUDE -p \
    "Run \`npm audit fix\` to fix vulnerabilities automatically.
    If vulnerabilities remain that require \`--force\`, evaluate each one:
    - Fix it with a targeted override in package.json if the package has a safe newer version
    - Skip it with a comment if it's a dev-only dep with no production impact
    Do NOT blindly run \`npm audit fix --force\` — that can introduce breaking changes.
    After fixing, run \`npm run test\` to verify nothing broke.
    If tests pass and there are changes, commit with message: 'fix(security): resolve npm audit vulnerabilities'
    If nothing changed, say 'No vulnerabilities found' and stop." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print
  echo ""
fi

# ── Pass 2: Lint + Types ──────────────────────────────────────────────────────
if [ "$PASS_LINT" = true ]; then
  echo "▶ Pass 2: Lint + Types"
  $CLAUDE -p \
    "Fix all code quality issues in this Nuxt 3 / TypeScript / Vue 3 project:
    1. Run \`npm run lint:fix\` to auto-fix ESLint and Prettier violations
    2. Run \`npm run lint\` — if errors remain that auto-fix couldn't handle, fix them manually (read the file, apply the fix, do not suppress with eslint-disable unless genuinely inapplicable)
    3. Run \`npm run type-check\` — fix any TypeScript errors. When a type fix would cascade to 50+ files, use targeted casts at the call site instead of chasing the root cause
    4. Run \`npm run test\` to verify nothing broke
    If there are changes and all checks pass, commit with message: 'fix(quality): resolve lint and type errors'
    If nothing changed, say 'Nothing to fix' and stop.
    Never use \`any\` except in test files. Never suppress ESLint rules without explanation." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print
  echo ""
fi

# ── Pass 3: CI Triage (opt-in) ────────────────────────────────────────────────
if [ "$PASS_CI" = true ]; then
  echo "▶ Pass 3: CI failure triage"
  $CLAUDE -p \
    "Check the latest GitHub Actions CI run for this repository using the GitHub CLI (\`gh run list --limit 3\`).
    If the latest run succeeded, say 'CI is green' and stop.
    If it failed:
    1. Download the failure logs: \`gh run view <id> --log-failed\`
    2. Classify the failure type: Lint | Type | Test | Build | E2E | iOS/Xcode
    3. Apply the fix following the ci-fix skill rules:
       - For iOS/Xcode: NEVER edit gitignored xcconfig files — always edit project.pbxproj. Update BOTH Debug and Release configs. Verify flag names exactly before applying.
       - For TypeScript: prefer targeted fixes, avoid 50+ file cascades
       - For tests: fix implementation, not tests
    4. Verify locally with the appropriate command (npm run build, npm run test, xcodebuild, etc.)
    5. Commit and push with message: 'fix(ci): <description>'
    6. Run \`gh run watch\` to confirm the new run passes
    If the fix requires changes you are not confident about, stop and explain what you found." \
    --allowedTools "Bash,Read,Edit,Write,Glob,Grep" \
    --print
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  autofix complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
