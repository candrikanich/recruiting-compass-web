---
name: release-flow
description: Ship web work through this repo's fixed release flow — feature branch → PR to develop (QA), then promote develop → main (prod), then back-merge. Use when the user says "push", "merge <PR#>", "merge to develop", "promote develop to main", "push develop to main", "promote to prod", "ship it", "are develop and main in sync?", or "back-merge main into develop".
---

# Release Flow

Branch → environment mapping:

| Branch | Environment |
|---|---|
| `develop` | QA |
| `main` | production (Vercel `recruiting-compass-web-production`) |

Feature branches never merge to `main` directly. Path is always: branch → PR to `develop` → promote `develop` → `main`.

Terse commands are execution orders, not questions. "push", "promote to prod", "merge 385 and 387" mean do it now. Report the result; don't re-ask for confirmation of a step already named.

## 1. Land work on develop

1. Commit on a feature branch (or on `develop` for small direct work).
2. Push. Pre-push hooks run type-check + lint — let them run, don't `--no-verify` a push.
3. For a feature branch, open the PR against `develop`, never `main`.
4. Once on `develop`, the change is live on QA. Say so, and say what is still unpromoted.

## 2. Before opening or merging a PR

- **List open PRs first.** Concurrent sessions share this checkout and may already have opened a PR for the same work. `gh pr list --base develop`. If a duplicate exists, close yours and merge theirs rather than shipping both.
- **Check whether pending out-of-band work is already live.** Migrations in particular are often applied to the live DB before they are in the repo. Verify against the DB, then fold the file into the PR so it isn't stranded — don't leave it untracked.
- **Don't over-ship.** If the needed change is one file sitting on a large unfinished feature branch, cherry-pick that commit onto a fresh branch off `develop` and PR that. Verify the commit touches only the intended files before cherry-picking.
- Confirm `MERGEABLE` / CI green before merging. Verify the merge actually landed — `gh pr merge` can return empty output on failure.

## 3. Promote develop → main

Promotion is a production ship. Check scope before merging.

1. `git fetch origin`, then check divergence **both ways**:
   `git rev-list --count origin/main..origin/develop` and `git rev-list --count origin/develop..origin/main`.
2. `main` being ahead is normal and usually harmless — those commits are `--no-ff` merge bubbles from past promotions plus prod hotfixes that were never back-merged. Confirm with `git diff origin/main origin/develop`: empty diff means content is in sync regardless of commit counts.
3. Report what the promotion actually carries (`git log --oneline origin/main..origin/develop`) before merging — dependabot bumps and other sessions' merged PRs ride along.
4. Merge:
   - Branches diverged → open a `develop` → `main` PR and merge it as a **merge commit**. Never squash — repo history is "Merge develop into main" bubbles, and a squash makes `develop` look permanently diverged.
   - `main` is a strict ancestor of `develop` → fast-forward is fine and leaves no new gap.
5. `main` runs more CI gates than develop PRs (E2E, CodeQL, secret + vuln scans). If gates are still running, enable auto-merge rather than waiting idle; verify afterward that it actually merged.
6. Push/merge to `main` triggers the prod deploy. Confirm `main`'s new tip, then return to `develop`.

## 4. Back-merge main → develop

After a merge-commit promotion, `main` sits ahead of `develop` and the gap grows by one each time; prod hotfixes landed on `main` never reach QA otherwise.

Back-merge `main` into `develop` and push. When content is identical and `develop` is an ancestor of `main`, this fast-forwards and closes the gap both ways.

When asked "are develop and main in sync?", answer on **content** (`git diff origin/main origin/develop`) and separately note the commit-graph gap and its cause. Don't report a merge-bubble gap as unshipped work.

## Reporting

After each step state: commit range pushed, which environment it is now live on, what remains unpromoted, and any loose end (open back-merge gap, pending migration, other session's branch). Flag anything that needs the user's call instead of deciding it silently.
