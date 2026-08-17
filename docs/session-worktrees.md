# Session Worktrees — one isolated box per session

**Rule: never run a dev/Claude session in the main checkout.** Every session gets
its own git worktree on its own branch. Worktrees isolate the *working tree*, so a
concurrent session's `git checkout`/commit cannot clobber yours.

## Spin one up

```bash
scripts/new-session-worktree.sh <feature-name> [base-branch] [--install]
```

- Creates `../wt-<feature-name>` (sibling to the repo, **outside** it).
- Branch `feat/<feature-name>` off `develop` (or the base you pass).
- Symlinks `node_modules` by default; `--install` for an isolated install
  (use when the session changes `package.json`).
- Prints a free dev-server port (nuxt.config hardcodes 3003 — override per box).

## Why outside the repo dir

ESLint's flat config ignores `.gitignore` and would scan a nested `.worktrees/`
(24k parse errors → failed pre-push). Vite/Nuxt would double-scan it too. Sibling
dirs avoid all of it.

## Discipline (every session)

```bash
pwd && git branch --show-current   # confirm you're in YOUR box before edits/commits
```

## Tear down

```bash
git worktree remove ../wt-<feature-name>   # --force if the node_modules symlink blocks it
git worktree list                          # sanity check
```

## What worktrees do NOT isolate

- **The Supabase DB.** All sessions hit the same prod DB — every write is real and
  shared. Worktrees isolate code, not data. Use Supabase branching if you need
  data isolation.
- **The "agent checkpoint" cron.** An auto-cron that commits WIP and switches
  branches in a shared tree is the top contaminator. Scope it to one dedicated
  checkout, or disable it while multi-sessioning.
