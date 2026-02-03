# Vercel Multi-Environment Deployment Setup

This guide walks you through setting up the multi-environment deployment pipeline with GitHub Actions and Vercel.

## Overview

Your deployment pipeline:

- **develop branch** → Auto-deploys to `qa.myrecruitingcompass.com` (Staging)
- **main branch** → Requires manual approval, then deploys to `myrecruitingcompass.com` (Production)
- **Feature branches** → Auto-preview deployment (default Vercel behavior)

All deployments run tests first (type-check, lint, test). If tests fail, deployment is blocked.

---

## Step 1: Create Vercel Projects

You need 3 Vercel projects (all free tier):

### 1.1 Staging Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo `recruiting-compass-web`
3. **Project Name:** `recruiting-compass-staging`
4. **Framework Preset:** Nuxt
5. Click **Deploy**
6. Once deployed, note the **Project ID** (appears in Settings)

### 1.2 Production Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo `recruiting-compass-web` (same repo)
3. **Project Name:** `recruiting-compass-prod`
4. **Framework Preset:** Nuxt
5. Click **Deploy**
6. Once deployed, note the **Project ID** (appears in Settings)

### 1.3 Default Project (for PR previews)

Your original project stays as-is for automatic PR preview deployments.

---

## Step 2: Add Custom Domains

### 2.1 Staging Domain (`qa.myrecruitingcompass.com`)

1. In Vercel: Go to **recruiting-compass-staging** project
2. **Settings** → **Domains**
3. Click **Add Domain**
4. Enter: `qa.myrecruitingcompass.com`
5. Follow DNS configuration steps for your registrar (usually CNAME record)
6. Verify domain is connected (may take 24 hours)

### 2.2 Production Domain (`myrecruitingcompass.com`)

1. In Vercel: Go to **recruiting-compass-prod** project
2. **Settings** → **Domains**
3. Click **Add Domain**
4. Enter: `myrecruitingcompass.com`
5. Follow DNS configuration steps for your registrar
6. Verify domain is connected

---

## Step 3: Configure GitHub Secrets

### 3.1 Get Required IDs

**Vercel Organization ID:**

1. Go to [vercel.com/account/overview](https://vercel.com/account/overview)
2. Find "Team ID" (if using personal account, this is your Org ID)
3. Copy it

**Vercel API Token:**

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name: `GitHub Actions`
4. Expiration: 7 days (or longer)
5. Copy the token immediately (you won't see it again)

**Project IDs:**

1. For **recruiting-compass-staging**: Settings → General → Project ID
2. For **recruiting-compass-prod**: Settings → General → Project ID
3. Copy both

### 3.2 Add Secrets to GitHub

1. Go to your GitHub repo: `recruiting-compass-web`
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these 5 secrets:

| Secret Name                 | Value                                      |
| --------------------------- | ------------------------------------------ |
| `VERCEL_TOKEN`              | Your API token from step 3.1               |
| `VERCEL_ORG_ID`             | Your Organization ID from step 3.1         |
| `VERCEL_PROJECT_ID_STAGING` | Project ID from recruiting-compass-staging |
| `VERCEL_PROJECT_ID_PROD`    | Project ID from recruiting-compass-prod    |

---

## Step 4: Configure GitHub Environments (Optional but Recommended)

GitHub Environments allow you to add required reviewers for production deployments.

### 4.1 Create Staging Environment

1. Go to repo **Settings** → **Environments** → **New Environment**
2. Name: `staging`
3. Click **Configure environment** (no rules needed for staging)

### 4.2 Create Production Environment with Approval

1. Go to repo **Settings** → **Environments** → **New Environment**
2. Name: `production`
3. Under **Deployment branches and secrets**:
   - Check **Restrict deployments to specific branches**
   - Select branch: `main`
4. Under **Required reviewers**:
   - Check **Require reviewers**
   - Add yourself (or teammates who approve production deploys)
5. Click **Save**

---

## Step 5: Create GitHub Branches

### 5.1 Create `develop` Branch

```bash
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### 5.2 Verify Branches Exist

```bash
git branch -a
```

You should see:

- `main` (production)
- `develop` (staging)

---

## Step 6: Test the Pipeline

### 6.1 Test Staging Deployment

```bash
git checkout develop
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify staging deployment"
git push origin develop
```

1. Go to GitHub: **Actions** tab
2. Watch `Deploy to Staging` workflow
3. Should complete successfully
4. Visit `https://qa.myrecruitingcompass.com` to verify

### 6.2 Test Production Approval Flow

```bash
git checkout main
git pull origin develop  # Merge changes from develop
echo "# Prod test" >> README.md
git add README.md
git commit -m "test: verify production deployment"
git push origin main
```

1. Go to GitHub: **Actions** tab
2. Watch `Deploy to Production` workflow
3. It will **pause at "Wait for Approval"**
4. Click **Review deployments** → Select **production** → **Approve and deploy**
5. Workflow continues and deploys to production
6. Visit `https://myrecruitingcompass.com` to verify

---

## Daily Workflow

This is how you'll use it going forward:

### Feature Development

```bash
git checkout develop
git checkout -b feature/my-feature
# Make changes
git push origin feature/my-feature
# Create PR on GitHub
```

- Preview deployment auto-created at `https://recruiting-compass-web-feature-my-feature.vercel.app`
- Tests run automatically
- Once PR is approved, merge to `develop`

### Deploy to Staging QA

```bash
git checkout develop
git merge feature/my-feature
git push origin develop
```

- Tests run
- Auto-deploys to `qa.myrecruitingcompass.com`
- QA team tests there

### Deploy to Production

```bash
git checkout main
git merge develop
git push origin main
```

- Tests run
- Workflow **pauses** waiting for approval
- You approve the deployment
- Auto-deploys to `myrecruitingcompass.com`

---

## Troubleshooting

### Workflow Says "Missing Secrets"

- Verify all 5 secrets are added to GitHub Settings → Secrets
- Check spelling: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, etc.

### Deployment Fails with "Project Not Found"

- Verify Project IDs are correct
- Make sure you're using the right Project ID for each environment

### Domain Not Resolving

- Check DNS records are properly configured at your registrar
- DNS propagation can take 24 hours
- Use `nslookup qa.myrecruitingcompass.com` to verify

### Approval Gate Not Appearing

- Make sure `production` environment is configured in GitHub Settings
- Verify you're pushing to `main` branch (not a PR)
- Check the workflow uses `environment: production`

### Tests Failing Before Deployment

- Workflow is working correctly (blocking bad deploys)
- Fix the errors locally and push again
- Tests must pass before any deployment happens

---

## Next Steps

1. Verify all 3 Vercel projects are created and deployed
2. Add custom domains to staging and production projects
3. Add the 5 GitHub secrets
4. Create `develop` branch
5. Set up GitHub production environment with required reviewers
6. Run a test on each workflow (staging, then production)

Once verified, you have a production-grade deployment pipeline that:

- ✅ Blocks bad code (tests must pass)
- ✅ Prevents accidental production deploys (approval required)
- ✅ Supports adding more verification stages later
- ✅ Costs $0/month
- ✅ Follows best practices

---

## Scaling: Adding More Verification Stages

When you're ready to add more checks (E2E tests, security scanning, performance benchmarks), you can extend this by adding more jobs to the workflows:

```yaml
jobs:
  test:
    name: Unit Tests
    # ... existing steps ...

  e2e:
    name: E2E Tests
    needs: test
    # ... new E2E test steps ...

  security:
    name: Security Scan
    needs: test
    # ... SAST/dependency check steps ...

  deploy:
    name: Deploy
    needs: [test, e2e, security] # All must pass
    # ... deployment steps ...
```

Everything stays free, and GitHub Actions supports unlimited job runs.

---

## Questions?

Refer back to:

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)
- [Vercel Environments](https://vercel.com/docs/deployments/environments)
