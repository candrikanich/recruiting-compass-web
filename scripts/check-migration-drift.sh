#!/bin/bash
# Fails if supabase/migrations/*.sql and the currently-linked project's
# schema_migrations aren't a 1:1 match. Read-only — never pushes.
#
# `supabase migration list --linked` reports each migration version
# alongside its local file (if any) and its remote-applied row (if any).
# An unapplied local file has an empty "remote" field (LOCAL_ONLY —
# pending migration). An orphaned remote row with no matching local file
# has an empty "local" field (REMOTE_ONLY — stale/duplicate bookkeeping,
# the exact class of bug behind the 20260928000008/9 E2E incident). CLI
# status noise ("Initialising login role...", "Connecting to remote
# database...") lands on stdout ahead of the JSON, so it must be stripped
# — this CLI puts it on stdout, not stderr, so redirecting stderr away
# isn't enough; skip to the first `{` instead.
set -euo pipefail

RAW=$(supabase migration list --linked --output-format json 2>/dev/null)
JSON=$(echo "$RAW" | sed -n '/^{/,$p')

LOCAL_ONLY=$(echo "$JSON" | jq -r '.migrations[] | select((.remote // "") == "" and (.local // "") != "") | .local')
REMOTE_ONLY=$(echo "$JSON" | jq -r '.migrations[] | select((.local // "") == "" and (.remote // "") != "") | .remote')

FAILED=0

if [ -n "$LOCAL_ONLY" ]; then
  FAILED=1
  echo "LOCAL_ONLY — migrations present locally but not yet applied to the linked project:"
  echo "$LOCAL_ONLY"
  echo ""
  echo "If this is a PR check: this PR's E2E smoke tests will run against a DB"
  echo "missing these migrations. Run migrate-qa-e2e.yml via workflow_dispatch"
  echo "to sync QA/E2E before merging."
fi

if [ -n "$REMOTE_ONLY" ]; then
  FAILED=1
  echo "REMOTE_ONLY — versions applied to the linked project with no matching"
  echo "local migration file (orphaned schema_migrations bookkeeping):"
  echo "$REMOTE_ONLY"
  echo ""
  echo "This is stale/duplicate tracking-row drift, not a pending migration —"
  echo "investigate via Supabase MCP execute_sql against"
  echo "supabase_migrations.schema_migrations before repairing. See"
  echo "claude/database.md's 'E2E migration reconciliation' section for the"
  echo "prior incident this mirrors."
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "If this is a post-push verification: investigate before merging further"
  echo "migrations — schema_migrations bookkeeping has drifted from the repo."
  exit 1
fi

echo "In sync — local migrations and the linked project's schema_migrations match 1:1."
