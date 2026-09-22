#!/bin/bash
# Fails if supabase/migrations/*.sql contains files not yet applied to the
# currently-linked project. Read-only — never pushes.
#
# `supabase migration list --linked` reports each local migration file
# alongside its matching remote-applied version, if any; an unapplied
# local file has an empty "remote" field. CLI status noise ("Initialising
# login role...", "Connecting to remote database...") lands on stdout
# ahead of the JSON, so it must be stripped with `2>/dev/null` AND `tail`
# won't help — only stderr-vs-stdout separation does, and this CLI puts
# it on stdout, so we redirect stderr away and let jq find the first `{`.
set -euo pipefail

RAW=$(supabase migration list --linked --output-format json 2>/dev/null)
JSON=$(echo "$RAW" | sed -n '/^{/,$p')

PENDING=$(echo "$JSON" | jq -r '.migrations[] | select((.remote // "") == "") | .local')

if [ -n "$PENDING" ]; then
  echo "Migrations present locally but not yet applied to the linked project:"
  echo "$PENDING"
  echo ""
  echo "If this is a PR check: this PR's E2E smoke tests will run against a DB"
  echo "missing these migrations. Run migrate-qa-e2e.yml via workflow_dispatch"
  echo "to sync QA/E2E before merging."
  echo "If this is a post-push verification: the push above did not land"
  echo "cleanly, or schema_migrations bookkeeping has drifted — investigate"
  echo "before merging further migrations."
  exit 1
fi

echo "In sync — no local migrations pending on the linked project."
