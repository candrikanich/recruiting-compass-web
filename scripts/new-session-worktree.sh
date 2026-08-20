#!/usr/bin/env bash
#
# new-session-worktree.sh — spin up an isolated git worktree for one Claude/dev
# session so concurrent sessions never clobber each other's working tree.
#
# Usage:
#   scripts/new-session-worktree.sh <feature-name> [base-branch] [--install]
#
#   <feature-name>   short kebab slug; becomes branch feat/<feature-name>
#   [base-branch]    branch to fork from (default: develop)
#   --install        run a fresh `npm install` in the worktree instead of
#                    symlinking node_modules from the main checkout
#
# Why a sibling dir (../wt-<name>) and not .worktrees/ inside the repo:
#   ESLint flat config ignores .gitignore and would scan a nested worktree
#   (24k parse errors, failed pre-push). Vite/Nuxt would double-scan it too.
#   Keeping worktrees OUTSIDE the repo root avoids all of that.
#
# node_modules:
#   Default symlinks the main checkout's node_modules — instant, shares one
#   install. Safe ONLY while no session runs `npm install` (a dep change in
#   one mutates it for all). Pass --install when this session will touch
#   package.json, for a fully isolated modules dir.
#
set -euo pipefail

FEATURE="${1:-}"
BASE="develop"
DO_INSTALL="0"

if [[ -z "$FEATURE" ]]; then
  echo "usage: $0 <feature-name> [base-branch] [--install]" >&2
  exit 1
fi
shift

for arg in "$@"; do
  case "$arg" in
    --install) DO_INSTALL="1" ;;
    *) BASE="$arg" ;;
  esac
done

# Resolve the PRIMARY checkout (first entry of `worktree list`), not whatever
# worktree we happen to run from — its node_modules is the one we symlink, and
# its parent dir is where sibling worktrees live.
REPO_ROOT="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
CODE_ROOT="$(dirname "$REPO_ROOT")"
WT_DIR="$CODE_ROOT/wt-$FEATURE"
BRANCH="feat/$FEATURE"

if [[ -e "$WT_DIR" ]]; then
  echo "error: $WT_DIR already exists" >&2
  exit 1
fi

# Make sure we fork from an up-to-date base without disturbing the main
# checkout's currently-checked-out branch.
echo "→ fetching $BASE …"
git -C "$REPO_ROOT" fetch --quiet origin "$BASE" || true

echo "→ creating worktree $WT_DIR on $BRANCH (off $BASE)"
git -C "$REPO_ROOT" worktree add -b "$BRANCH" "$WT_DIR" "$BASE"

# node_modules
if [[ "$DO_INSTALL" == "1" ]]; then
  echo "→ npm install (isolated)"
  ( cd "$WT_DIR" && npm install )
else
  echo "→ symlinking node_modules from main checkout"
  ln -s "$REPO_ROOT/node_modules" "$WT_DIR/node_modules"
fi

# Pick the first free TCP port at/above 3010 for the dev server (nuxt.config
# hardcodes 3003, so every worktree must override to avoid a collision).
pick_port() {
  local p=3010
  while lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; do
    p=$((p + 1))
  done
  echo "$p"
}
PORT="$(pick_port)"

cat <<EOF

✅ worktree ready
   dir:    $WT_DIR
   branch: $BRANCH  (off $BASE)
   port:   $PORT (free)

next:
   cd $WT_DIR
   PORT=$PORT npm run dev        # http://localhost:$PORT
   NUXT_PUBLIC_ADMIN_HOST=localhost:$PORT PORT=$PORT npm run dev   # if touching /admin

when done (from the main checkout):
   git worktree remove $WT_DIR   # add --force if node_modules symlink blocks it
EOF
