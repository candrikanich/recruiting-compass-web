#!/bin/sh
# Install tracked git hooks from scripts/hooks/ into .git/hooks/
# Run automatically via `npm run prepare` after `npm install`.
set -e

# Deploy/CI sandboxes (e.g. Vercel) run `npm ci` against a checked-out
# tarball with no `.git` directory. Hook installation is a local dev
# convenience only — skip silently rather than failing the whole install.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository, skipping hook install."
  exit 0
fi

HOOKS_DIR="$(git rev-parse --show-toplevel)/scripts/hooks"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "No scripts/hooks/ directory found, skipping hook install."
  exit 0
fi

for hook in "$HOOKS_DIR"/*; do
  [ -f "$hook" ] || continue
  name=$(basename "$hook")
  cp "$hook" "$GIT_HOOKS_DIR/$name"
  chmod +x "$GIT_HOOKS_DIR/$name"
done

echo "Git hooks installed: $(ls "$HOOKS_DIR" | tr '\n' ' ')"
