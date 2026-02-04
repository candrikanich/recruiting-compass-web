# CI/CD Setup Complete

Your Recruiting Compass project now has a professional CI/CD pipeline with automated testing, staged deployments, and Slack notifications.

## 🏗️ Pipeline Architecture

```
Feature Branch
    ↓
    ├─→ Run Tests (GitHub Actions)
    │   ├─→ Type check (TypeScript)
    │   ├─→ Lint (ESLint)
    │   └─→ Unit + Integration Tests (Vitest)
    │       └─→ Coverage Report
    │
    ├─→ Merge to develop
    │   └─→ AUTO-DEPLOY to Staging (Vercel)
    │       └─→ Slack Notification ✅ or 🚨
    │
    └─→ Merge to main (via PR)
        └─→ Manual Approval Required
            └─→ AUTO-DEPLOY to Production (Vercel)
                └─→ Slack Notification 🚀 or 🚨
```

## 📋 What's Configured

### 1. **Test Workflow** (`.github/workflows/test.yml`)

- **Trigger**: Push to `develop` + PRs to `develop` or `main`
- **Jobs**:
  - `verify`: Type check, lint, test with coverage
  - `notify-slack-on-failure`: Sends Slack alert if tests fail

### 2. **Staging Deployment** (`.github/workflows/deploy-staging.yml`)

- **Trigger**: After `test.yml` succeeds on `develop`
- **Environment**: Uses GitHub Environments (`staging`)
- **Notifications**: Success + Failure alerts to Slack

### 3. **Production Deployment** (`.github/workflows/deploy-prod.yml`)

- **Trigger**: After `test.yml` succeeds on `main`
- **Environment**: Uses GitHub Environments (`production`)
- **Approval**: Requires manual approval via GitHub Environments
- **Notifications**: Urgent alerts to Slack

### 4. **Branch Protection Rules** (Must configure manually)

- `develop` branch requires:
  - Status check "Test & Verify" must pass
  - At least 1 approval (optional, customize as needed)

## ⚙️ Setup Instructions

### Step 1: Create Slack Webhook

1. Go to [Slack API - Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name: `Recruiting Compass Notifications`
4. Choose your workspace
5. In left sidebar: **Incoming Webhooks** → Enable it
6. Click **"Add New Webhook to Workspace"**
7. Select channel: Choose a channel (e.g., `#deployments`)
8. Copy the **Webhook URL** (starts with `https://hooks.slack.com/...`)

### Step 2: Add GitHub Secret

1. Go to your GitHub repo: https://github.com/candrikanich/recruiting-compass-web
2. Settings → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste the webhook URL from Step 1
6. Click **"Add secret"**

### Step 3: Verify Existing Secrets

Your workflows also need these secrets (check if they exist):

- `VERCEL_TOKEN` ✅
- `VERCEL_ORG_ID` ✅
- `VERCEL_PROJECT_ID_STAGING` ✅
- `VERCEL_PROJECT_ID_PROD` ✅

If any are missing, add them:

1. Settings → **Secrets and variables** → **Actions**
2. Add each missing secret

### Step 4: Set Branch Protection Rules on `develop`

1. Go to repo Settings → **Branches** → **Add Rule**
2. Branch name pattern: `develop`
3. ✅ **Require a pull request before merging**
   - ✅ Require approval (set to 1)
4. ✅ **Require status checks to pass before merging**
   - Search & select: `Test & Verify`
   - ✅ Require branches to be up to date before merging
5. ✅ **Require branches to be up to date before merging**
6. Click **"Create"**

### Step 5: Set Vercel Auto-Deploy Settings (IMPORTANT!)

To ensure GitHub Actions is the only deployment path:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Recruiting Compass** project
3. Settings → **Git**
4. Under "Deployments":
   - Set **Production Branch** to `main`
   - **Disable** "Automatic Deployments" (uncheck)
   - Or: Disconnect Git integration entirely and use GitHub Actions only

This prevents Vercel from deploying on every push and ensures GitHub branch protection rules are enforced.

### Step 6: Enable Environment Protection (Optional but Recommended)

For production deployments, add manual approval:

1. Settings → **Environments** → **production**
2. ✅ **Required reviewers** → Add yourself
3. Click **"Save protection rules"**

Now production deployments require approval from the list of reviewers.

## 🚀 How It Works

### On Feature Branch

```bash
git checkout -b feature/my-feature
# Make changes, commit
git push origin feature/my-feature
# ✅ Tests run automatically on push
```

### On `develop` Branch

```bash
git checkout develop
git merge feature/my-feature
git push origin develop
# ✅ Tests run
# ✅ If pass → Auto-deploys to Staging
# 📨 Slack notification sent
```

### On `main` Branch (Production)

```bash
git checkout main
git merge develop  # via PR
# ✅ Tests run
# ✅ Requires manual approval
# 🚀 Deploy to production
# 🚨 Urgent notification if anything fails
```

## 🔍 Monitoring

### View Workflow Runs

https://github.com/candrikanich/recruiting-compass-web/actions

### View Deployments

https://vercel.com/dashboard/recruiting-compass-web/deployments

### Slack Notifications

Your configured Slack channel will receive:

- ❌ Test failures
- ✅ Staging deployments succeeded
- 🚀 Production deployments succeeded
- 🚨 Deployment failures (with links to details)

## 📝 Test Coverage

Workflows enforce:

- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Unit tests**: `npm run test`
- **Coverage**: `npm run test:coverage`

Current coverage target: **80%** (adjustable in `vitest.config.ts`)

## ⚡ Pre-commit Hooks

Your local machine also has quality gates:

```bash
# Already configured in .pre-commit-config.yaml
pre-commit install
pre-commit run --all-files
```

Catches issues BEFORE pushing:

- ESLint + formatting
- Secret detection
- YAML validation

## 🛠️ Troubleshooting

### Tests fail locally but pass in CI?

```bash
npm ci                    # Clean install (matches CI)
npm run type-check        # TypeScript
npm run lint             # ESLint
npm run test:coverage    # Full test suite
```

### Deployment stuck on approval?

1. Go to [Actions tab](https://github.com/candrikanich/recruiting-compass-web/actions)
2. Find the workflow run
3. Scroll to `approval` step → Click **Review deployments**
4. Approve or reject

### Slack not getting notifications?

1. Verify secret exists: Settings → Secrets → `SLACK_WEBHOOK_URL`
2. Test webhook manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test"}' \
     $SLACK_WEBHOOK_URL
   ```
3. Check workflow logs: Actions tab → Failed run → View logs

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployments](https://vercel.com/docs)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

---

**All workflows are now active!** Push to develop or main to see them in action. 🚀
