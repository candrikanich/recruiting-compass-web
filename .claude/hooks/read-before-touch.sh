#!/usr/bin/env bash
# PreToolUse reinforcement for progressive-disclosure CLAUDE.md.
# Reminds the model to read the matching domain doc before editing files in
# that domain. Non-blocking: always exits 0, only injects additionalContext.

input="$(cat)"
command -v jq >/dev/null 2>&1 || exit 0

fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$fp" ] && exit 0

doc=""
case "$fp" in
  *server/api/*)                    doc="claude/logging.md (useLogger, error handling)";;
  *supabase/migrations/*|*.sql)     doc="claude/database.md (migrations, indexing, RLS, cascade-delete)";;
esac

# database.md also covers Supabase client usage in composables/stores
if [ -z "$doc" ]; then
  case "$fp" in
    *composables/*|*stores/*)
      if printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null | grep -q "useSupabase"; then
        doc="claude/database.md (Supabase client singleton, query patterns)"
      fi;;
  esac
fi

[ -z "$doc" ] && exit 0

jq -n --arg d "$doc" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("Progressive-disclosure reminder: editing this file — if you have not already, read " + $d + " before proceeding.")
  }
}'
exit 0
