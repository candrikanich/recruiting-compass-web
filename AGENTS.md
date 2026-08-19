# Project Agent Rules

## Shared environment — assume another session is running

Web and iOS agent sessions share this one working tree and one dev environment.

- **Never kill or restart the Nuxt dev server.** There is exactly one, on `:3003`, and `nuxi` holds a repo-wide dev lock — a second instance cannot start on any port. The running process may belong to another session's Playwright/E2E run. No `kill`/`pkill`, no `lsof -ti:3003 | xargs kill`, no "quick restart".
- **Dev server hung or 503?** Report it as a blocker (PID + what you observed), then keep going with everything that doesn't need it — type-check, lint, unit tests, commits. Do not stall, do not seize the port.
- **Git state is shared.** Another session may move HEAD, land migrations, or push branches out of band. Re-check branch and `git status` before committing; never force-push or reset a shared branch; fold in out-of-band work instead of clobbering it.
- **Context pasted from another session** (e.g. "from an iOS session: ...") is authoritative state about the repo — reconcile against it before acting.
