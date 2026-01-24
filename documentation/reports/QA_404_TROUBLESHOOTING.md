# QA Site 404 Troubleshooting Guide

## Issue

`https://qa.myrecruitingcompass.com` is returning 404 errors even though GitLab CI and Netlify deployments are passing.

## Root Cause Analysis

### 1. **Netlify Auto-Builds Conflict** ⚠️ MOST LIKELY ISSUE

When GitLab CI uses `netlify deploy --prod`, it deploys files directly. However, if Netlify has **auto-builds enabled**, it might:

- Trigger a build when GitLab pushes to main
- Build from the wrong directory (looking for `web/dist/public` instead of `.output/public`)
- Overwrite the CLI deployment with an empty/failed build
- Result in a 404 because no files are actually deployed

**Solution:** Disable Netlify auto-builds for this site

1. Go to Netlify Dashboard → Your QA site → Site settings → Build & deploy
2. Under "Build settings", click "Stop auto publishing"
3. Or set "Build command" to empty/blank
4. This ensures only GitLab CI deployments are used

### 2. **Site ID Mismatch** ⚠️ LIKELY ISSUE

**CRITICAL:** GitLab CI environment URL shows `https://qa-recruiting.chrisandrikanich.com` but you're accessing `qa.myrecruitingcompass.com`. These are different domains!

This suggests:

- The `$NETLIFY_SITE_ID_WEB_QA` might be pointing to the wrong Netlify site
- OR `qa.myrecruitingcompass.com` isn't configured as a custom domain on the Netlify site

**Verification Steps:**

1. Go to Netlify Dashboard → Find the site that has `qa.myrecruitingcompass.com` as a custom domain
2. Site settings → General → Site details → Copy the Site ID
3. Compare with GitLab CI/CD variable `NETLIFY_SITE_ID_WEB_QA`
4. If they don't match, update the GitLab variable to the correct site ID
5. Also verify: Domain settings → Check if `qa.myrecruitingcompass.com` is listed as a custom domain

### 3. **Missing Files in Deployment**

The deployment might be succeeding but files aren't in the right place.

**Verification Steps:**

1. Check GitLab CI logs for the `deploy:web:qa` job
2. Look for the "Build output contents:" log line (added in recent fix)
3. Verify `index.html` and `_redirects` are listed
4. If files are missing, the build might be failing silently

### 4. **Publish Directory Mismatch**

Even though CLI uses `--dir=.output/public`, Netlify UI settings might interfere.

**Current Configuration:**

- GitLab CI deploys: `--dir=.output/public` (relative to `/web` directory)
- Netlify UI should have: Base directory = `web`, Publish directory = `.output/public`
- Root `netlify.toml`: `publish = "web/.output/public"` (relative to repo root)

**Action:** Verify Netlify UI settings match:

- Base directory: `web`
- Publish directory: `.output/public` (NOT `web/dist/public`)

### 5. **Missing \_redirects File**

The `_redirects` file is needed for SPA routing. Nuxt should copy it from `web/public/_redirects` to `.output/public/_redirects`, but this might not be happening.

**Check:**

- Verify `web/public/_redirects` exists (it does: `/* /index.html 200`)
- Check if it's copied to `.output/public/_redirects` during build
- The recent CI fix will copy it if missing

### 6. **Domain Configuration**

Verify the custom domain is properly configured:

- Netlify Dashboard → Domain settings → Verify `qa.myrecruitingcompass.com` is listed
- Check DNS records are correct
- Ensure SSL certificate is provisioned

## Immediate Action Items

### Priority 1: Disable Netlify Auto-Builds

1. Netlify Dashboard → QA site → Site settings → Build & deploy
2. Under "Continuous Deployment", disable it or set build command to empty
3. This prevents Netlify from building and overwriting CLI deployments

### Priority 2: Verify Site ID and Domain ⚠️ CRITICAL

1. In Netlify Dashboard, find the site that has `qa.myrecruitingcompass.com` configured
2. Site settings → General → Site details → Copy the Site ID
3. Go to GitLab → Settings → CI/CD → Variables
4. Find `NETLIFY_SITE_ID_WEB_QA` and compare with the Netlify Site ID
5. **If they don't match, update the GitLab variable to the correct Site ID**
6. Also verify: Netlify → Domain settings → Ensure `qa.myrecruitingcompass.com` is listed
7. Check DNS: Ensure `qa.myrecruitingcompass.com` points to the correct Netlify site

### Priority 3: Check Deployment Logs

1. Go to GitLab → CI/CD → Pipelines
2. Find the latest successful `deploy:web:qa` job
3. Check the logs for:
   - "Build output contents:" - should show files
   - Any errors or warnings
   - Confirmation that `netlify deploy` succeeded

### Priority 4: Manual Verification

After the next deployment, verify files are actually on Netlify:

1. Netlify Dashboard → Deploys → Latest deploy
2. Click "Browse published files" or "View deploy log"
3. Verify `index.html` exists in the root
4. Verify `_redirects` file exists

## Testing After Fixes

1. Trigger a new deployment (push to main or manually trigger GitLab CI)
2. Wait for deployment to complete
3. Check `https://qa.myrecruitingcompass.com`
4. If still 404, check Netlify deploy logs for errors

## Expected Behavior

After fixes:

- GitLab CI builds the app to `.output/public`
- GitLab CI deploys via `netlify deploy --prod`
- Netlify serves files from the deployed directory
- Site loads correctly at `qa.myrecruitingcompass.com`

## Additional Notes

- The `netlify.toml` files are for configuration, but when using CLI `--dir` flag, it should override publish directory
- However, if Netlify auto-builds are enabled, they might ignore the CLI deployment
- The safest approach is to disable Netlify builds entirely and rely only on GitLab CI
