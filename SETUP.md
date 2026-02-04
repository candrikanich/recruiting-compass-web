# CI/CD Setup Guide

This guide walks you through implementing professional CI/CD for The Recruiting Compass.

## What's Configured

✅ **Pre-commit Hooks** — Automatic linting, formatting, secret detection
✅ **Automated Testing** — Unit tests on every push/PR
✅ **Coverage Thresholds** — Balanced testing (75% lines/functions/statements, 70% branches)
✅ **Staged Deployments** — Auto-deploy to staging (develop) and production (main with approval)
✅ **Secret Management** — Secure handling of API keys and tokens

---

## Step 1: Install Pre-commit Hooks

Pre-commit hooks automatically run linting, formatting, and secret detection before each commit.

### Installation

```bash
# Install pre-commit (requires Python 3.9+)
pip install pre-commit

# Install the hooks
pre-commit install
pre-commit install --hook-type pre-push
```

### Verify Installation

```bash
# Run on all files to verify setup
pre-commit run --all-files
```

Expected output: Green checkmarks for each hook (ESLint, Prettier, YAML validation, Nuxt type check).

### How It Works

When you `git commit`:

1. **ESLint** checks TypeScript/Vue syntax and auto-fixes issues
2. **Prettier** auto-formats code
3. **Secret detection** prevents committing API keys
4. **Type checking** runs `nuxi typecheck` to catch type errors

If any check fails:

- The commit is blocked (you can fix and retry)
- Auto-fixes are applied, so you may only need to `git add` and retry

---

## Step 2: Configure GitHub Secrets

Your workflows require 4 GitHub Secrets for Vercel deployment.

### Get Your Secrets

#### VERCEL_TOKEN

```bash
# Open in browser
https://vercel.com/account/tokens

# Create new token named "GitHub CI/CD"
# Copy the token (you'll only see it once)
```

#### VERCEL*ORG_ID & VERCEL_PROJECT_ID*\*

```bash
# Already have .vercel/project.json? Use it
cat .vercel/project.json

# If not, link your project
npx vercel link
# Then check .vercel/project.json
```

### Add to GitHub

1. Go to: `https://github.com/candrikanich/recruiting-compass-web/settings/secrets/actions`
2. Click **New repository secret**
3. Add each secret:

| Secret Name                 | Value                                            |
| --------------------------- | ------------------------------------------------ |
| `VERCEL_TOKEN`              | Your Vercel token                                |
| `VERCEL_ORG_ID`             | From .vercel/project.json: `orgId`               |
| `VERCEL_PROJECT_ID_STAGING` | From .vercel/project.json: `projectId` (staging) |
| `VERCEL_PROJECT_ID_PROD`    | Production project ID from Vercel dashboard      |

**Full details:** See `SECRETS.md` in the repo root.

---

## Step 3: Test Locally

Before pushing to GitHub, verify everything works locally.

### Run Pre-commit Checks

```bash
# Check all files
pre-commit run --all-files

# Expected: All hooks should pass (green)
```

### Run Tests & Coverage

```bash
# Run tests with coverage
npm run test:coverage

# View HTML coverage report
open coverage/index.html
```

### Type Check & Lint

```bash
npm run type-check   # TypeScript errors
npm run lint         # ESLint warnings
npm run lint:fix     # Auto-fix fixable issues
```

---

## Step 4: Push and Verify CI/CD

### Trigger Test Workflow

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make changes, commit (pre-commit hooks run automatically)
git add .
git commit -m "feat: add new feature"

# Push to trigger test workflow
git push -u origin feature/my-feature
```

Watch the **Actions** tab: https://github.com/candrikanich/recruiting-compass-web/actions

Expected: ✅ Test & Verify workflow runs and passes

### Trigger Staging Deployment

```bash
# Merge your PR and push to develop
git checkout develop
git merge feature/my-feature
git push origin develop
```

Watch the **Actions** tab:

1. Test & Verify runs
2. When tests pass → Deploy to Staging automatically runs
3. Check Vercel dashboard: Staging deployment in progress

### Trigger Production Deployment

```bash
# Create PR from develop to main
# Get approval from a reviewer
# Merge PR

# or directly merge if solo:
git checkout main
git merge develop
git push origin main
```

Watch the **Actions** tab:

1. Test & Verify runs
2. When tests pass → Wait for Approval step appears
3. Click **Review deployments** → Approve
4. Deploy to Production runs
5. Check Vercel dashboard: Production deployment in progress

---

## Workflow Summary

### Local Development

```
code → pre-commit (auto-lint/format) → git push
```

### Pull Request

```
push to feature branch → GitHub Actions: test & verify
```

### Staging Deployment

```
merge to develop → GitHub Actions: test → auto-deploy to staging
```

### Production Deployment

```
merge to main → GitHub Actions: test → approval required → deploy to prod
```

---

## Troubleshooting

### Pre-commit Hook Failures

**"ESLint found 3 issues"**

```bash
# ESLint auto-fixes most issues
git add .
git commit -m "..." # Try again
```

**"Prettier formatting changes"**

```bash
# Prettier formats the file automatically
git add .
git commit -m "..." # Try again
```

**"Secrets detected in file"**

```bash
# Remove the secret from the file
# Add to .gitignore if it's a local config
git add .
git commit -m "..." # Try again
```

### GitHub Actions Failures

**Test workflow fails**

- Check the error message in Actions tab
- Run `npm run test` locally to debug
- Fix the issue and push again

**Deployment fails with "Invalid token"**

- Verify secrets exist in Settings → Secrets
- Check token hasn't expired
- Regenerate token if needed (see SECRETS.md)

**Staging deployment skips**

- Verify you pushed to `develop` branch
- Check workflow isn't scheduled (only runs on push)
- See `.github/workflows/deploy-staging.yml`

**Production approval step missing**

- Ensure you're pushing to `main` branch
- Check branch protection rules in Settings → Branches
- See `.github/workflows/deploy-prod.yml`

---

## Advanced: Coverage Thresholds

Your project is configured for **balanced testing** (75% coverage):

- **Lines:** 75%
- **Functions:** 75%
- **Statements:** 75%
- **Branches:** 70% (slightly lower to allow edge case testing)

To adjust thresholds:

1. **Locally:** Edit `vitest.config.ts` under `coverage`
2. **In CI/CD:** Same file is used for both local and CI runs

Example: Increase to comprehensive testing (85%):

```typescript
coverage: {
  lines: 85,
  functions: 85,
  statements: 85,
  branches: 80,
}
```

---

## Files Changed

| File                                   | Purpose                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `.pre-commit-config.yaml`              | Linting, formatting, secret detection                 |
| `.github/workflows/test.yml`           | Unit/integration tests on push/PR                     |
| `.github/workflows/deploy-staging.yml` | Auto-deploy to staging (develop)                      |
| `.github/workflows/deploy-prod.yml`    | Manual deployment to production (main)                |
| `vitest.config.ts`                     | Coverage thresholds and reporter config               |
| `.env.example`                         | Environment variables template (updated for security) |
| `SECRETS.md`                           | Documentation of all required secrets                 |
| `SETUP.md`                             | This file                                             |

---

## Next Steps

1. ✅ Install pre-commit hooks (Step 1)
2. ✅ Add GitHub Secrets (Step 2)
3. ✅ Test locally (Step 3)
4. ✅ Push code and verify workflows (Step 4)

**You're ready for professional CI/CD!**

---

## Need Help?

- **Pre-commit issues:** `pre-commit run --all-files --verbose`
- **Test failures:** `npm run test -- --ui` (interactive Vitest UI)
- **GitHub Actions:** Check the Actions tab for detailed logs
- **Coverage report:** `open coverage/index.html` (after running tests locally)

---

## Best Practices

✅ Always run `pre-commit run --all-files` before pushing
✅ Write tests for new features (TDD approach)
✅ Use feature branches (never push directly to main/develop)
✅ Create PRs even if solo (documents changes)
✅ Wait for tests to pass before merging
✅ Get approval before production deployments
✅ Monitor Actions tab after each push
✅ Rotate Vercel tokens every 90 days

---

## Success Criteria

Your CI/CD is working when:

1. ✅ Pre-commit hooks run automatically on commit
2. ✅ `npm run test:coverage` passes locally with 75%+ coverage
3. ✅ Pushing to feature branch triggers test workflow
4. ✅ Pushing to develop auto-deploys to staging
5. ✅ Pushing to main requires approval, then deploys to production
