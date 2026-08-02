#!/usr/bin/env bash
# cross-account-logout.spec.ts drives a real UI logout as the shared
# player/admin TEST_ACCOUNTS. supabase.auth.signOut() defaults to global
# scope, revoking that account's refresh token server-side for EVERY
# session — not just this test's own browser context. Any other worker
# concurrently holding a player.json/admin.json storageState session gets
# bounced mid-test ("session expired" cascade).
#
# It runs in its own Playwright project (playwright.config.ts) and is
# invoked here as a second, fully sequential phase — never concurrently
# with the main suite — so no other worker's session is live when its
# real signOut() fires. This is deliberately NOT done via Playwright's
# `dependencies` project option: that skips the dependent project entirely
# if the depended-on project has ANY failing test, which would silently
# stop cross-account-logout from running whenever an unrelated flake hits.
set -u

# Playwright's --project flag is repeatable/unioned, not overridden — passing
# "$@" straight through to phase 1 on top of the FULL_TESTS-derived default
# list used to union chromium+firefox+webkit with a caller's own
# `--project webkit`, running firefox tests in jobs that never install
# firefox. Passing "$@" to phase 2 as well ran cross-account-logout (a real
# global signOut on the shared player/admin accounts) concurrently with a
# second full run of the caller's projects — reinstating the exact
# session-revocation cascade this two-phase split exists to prevent.
#
# Fix: if the caller passed an explicit --project, honor ONLY that in phase
# 1 (skip the FULL_TESTS-derived default list). Strip all --project flags
# out of the args before phase 2 — it always runs cross-account-logout
# alone — while still forwarding any other passthrough flags (--grep,
# --reporter, etc.) to both phases.
CALLER_HAS_PROJECT=0
NON_PROJECT_ARGS=()
skip_next=0
for arg in "$@"; do
  if [ "$skip_next" = "1" ]; then
    skip_next=0
    continue
  fi
  case "$arg" in
    --project=*)
      CALLER_HAS_PROJECT=1
      ;;
    --project)
      CALLER_HAS_PROJECT=1
      skip_next=1
      ;;
    *)
      NON_PROJECT_ARGS+=("$arg")
      ;;
  esac
done

if [ "$CALLER_HAS_PROJECT" = "1" ]; then
  MAIN_PROJECTS=()
else
  MAIN_PROJECTS=(--project=chromium)
  if [ "${FULL_TESTS:-}" = "1" ]; then
    MAIN_PROJECTS+=(--project=firefox --project=webkit)
  fi
fi

playwright test "${MAIN_PROJECTS[@]+"${MAIN_PROJECTS[@]}"}" "$@"
main_status=$?

playwright test --project=cross-account-logout "${NON_PROJECT_ARGS[@]+"${NON_PROJECT_ARGS[@]}"}"
logout_status=$?

exit_code=$main_status
if [ "$logout_status" -gt "$exit_code" ]; then
  exit_code=$logout_status
fi
exit "$exit_code"
