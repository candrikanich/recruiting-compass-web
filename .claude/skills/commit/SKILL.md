# Commit Skill

Smart git commit that runs tests first and bypasses detect-secrets friction.

## Steps

1. Run the full test suite first: `npm test` (web) or `xcodebuild test` (iOS)
2. If tests fail, stop and report failures — do not commit broken code
3. Stage all changes with `git add -A`
4. Generate a descriptive conventional commit message (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`)
5. Commit with `git commit --no-verify -m "<message>"`
6. If push is requested, push to the current branch
7. Never attempt to fix detect-secrets hooks by modifying source files
