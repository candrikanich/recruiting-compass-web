# GitHub Secrets Configuration

This document lists all secrets required for CI/CD pipelines. Configure them at:
`https://github.com/candrikanich/recruiting-compass-web/settings/secrets/actions`

## Required Secrets

### Vercel Deployment (Required for deploy-staging.yml and deploy-prod.yml)

**`VERCEL_TOKEN`**

- **Purpose:** Authentication token for Vercel CLI
- **How to get:**
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Give it a name (e.g., "GitHub CI/CD")
  4. Set expiration (Recommended: No expiration)
  5. Copy the token
- **Scope:** Full account access for deployments
- **Used in:** Both staging and production deployment workflows

**`VERCEL_ORG_ID`**

- **Purpose:** Your Vercel organization/account ID
- **How to get:**
  1. Run: `npx vercel link` locally (follow prompts)
  2. Check `.vercel/project.json` file: `"orgId"` field
  3. Or go to https://vercel.com/account/general and find your ID
- **Scope:** Organization identifier
- **Used in:** Both staging and production deployment workflows

**`VERCEL_PROJECT_ID_STAGING`**

- **Purpose:** Vercel project ID for staging environment
- **How to get:**
  1. Run: `npx vercel link` locally for staging project
  2. Check `.vercel/project.json`: `"projectId"` field
  3. Or create staging project in Vercel dashboard
- **Scope:** Staging project only
- **Used in:** Staging deployment (deploy-staging.yml)

**`VERCEL_PROJECT_ID_PROD`**

- **Purpose:** Vercel project ID for production environment
- **How to get:**
  1. Go to https://vercel.com/projects
  2. Select your production project
  3. Go to Settings → General → Project ID
  4. Copy the ID
- **Scope:** Production project only
- **Used in:** Production deployment with approval gate (deploy-prod.yml)
- **⚠️ Critical:** This secret should be carefully guarded

---

**`SLACK_WEBHOOK_URL`**

- **Purpose:** Send CI/CD notifications to Slack (test results, deployments, failures)
- **How to get:**
  1. Go to your Slack workspace
  2. Create a new app: https://api.slack.com/apps
  3. Click "Create New App" → "From scratch"
  4. Name: "Recruiting Compass CI/CD"
  5. Select your workspace
  6. Go to "Incoming Webhooks" and activate it
  7. Click "Add New Webhook to Workspace"
  8. Select the channel (e.g., #deployments or #dev)
  9. Copy the Webhook URL
- **Scope:** Send messages to selected Slack channel
- **Used in:** All CI/CD workflows for notifications
- **Notifications include:**
  - ✅ Test suite passes
  - ❌ Test suite fails
  - 🚀 Production deployments
  - 🔧 Code quality issues

---

## Optional Secrets (for future external integrations)

If you plan to use these services, add them as secrets:

**`TWITTER_API_KEY`** - Twitter API v2 authentication
**`TWITTER_API_SECRET`** - Twitter API v2 secret
**`INSTAGRAM_ACCESS_TOKEN`** - Instagram Graph API token
**`RESEND_API_KEY`** - Resend email service API key

---

## Setting Up Secrets

### Step 1: Navigate to Repository Secrets

```
https://github.com/candrikanich/recruiting-compass-web/settings/secrets/actions
```

### Step 2: Click "New repository secret"

### Step 3: For each secret above:

- **Name:** Exactly as listed above
- **Value:** The actual token/ID from the source
- Click "Add secret"

### Step 4: Verify Locally

Before deploying, verify your Vercel setup:

```bash
# Verify Vercel configuration
cat .vercel/project.json

# Test that you can deploy locally (requires VERCEL_TOKEN env var)
npx vercel --token $VERCEL_TOKEN --prod
```

---

## Security Guidelines

✅ **DO:**

- Rotate tokens regularly (recommended: every 90 days)
- Use organization-level tokens for shared access
- Set token expiration dates when possible
- Log all secret usage in GitHub Actions logs (masked)

❌ **DON'T:**

- Commit secrets to version control (pre-commit hooks will catch this)
- Share secrets in Slack, email, or PRs
- Use personal API keys (create dedicated CI/CD accounts when possible)
- Leave expired tokens in the system

---

## Testing Secrets

After adding secrets, you can test them with a GitHub Actions workflow:

1. Push to `develop` branch → deploys to staging (tests the staging secrets)
2. Create PR to `main` → triggers test workflow
3. Merge to `main` → requires approval, then deploys to production

Watch the Actions tab to verify each deployment succeeds.

---

## Troubleshooting

**Deployment fails with "Invalid token"**

- Verify token is still active at token source (Vercel, Twitter, etc.)
- Check token hasn't expired
- Confirm secret name matches exactly (case-sensitive)

**"Project not found" error**

- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID_*` are correct
- Check projects exist in Vercel dashboard
- Ensure token has access to these projects

**Deployment skipped**

- Check that branch matches the workflow trigger (develop → staging, main → production)
- Verify environment protection rules in GitHub Settings → Environments
