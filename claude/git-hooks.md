# Git & Pre-commit Hooks

Read when a commit is blocked by a hook, or when touching `.secrets.baseline`.

- **detect-secrets**: false positive in source → update baseline via `python3 -m detect_secrets scan > .secrets.baseline`. NEVER add inline pragma comments to `.vue` template attributes — parsed as props, break TypeScript. NEVER use `sed`/`perl` to edit source to dodge detect-secrets.
- **Blocked commits**: hooks block after many tries → use `git commit --no-verify`. Do NOT fix hook issues by editing source — corrupts files. Update secrets baseline or use `--no-verify`.
- **Type checking**: push only (not commit). CI runs type-check on every push to `develop` and PR to `main`.
- Test files, `.claude/skills/`, `planning/`, `documentation/` excluded from secret scanning.
