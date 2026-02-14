# Handoff: Form Width Issue (February 10, 2026)

## Summary

The "Add New School" form is too wide on desktop browsers. The fix has been implemented in code but is NOT deploying correctly to QA or Production environments.

## The Problem

- **Issue**: Form spans nearly full viewport width on desktop (should be ~672px, actually rendering at 1280px+)
- **Affected Page**: `/schools/new` (and any page using `FormPageLayout` component)
- **User Report**: "form should not be full width for a desktop browser"

## What We Tried

### 1. Code Fix (✅ Complete)

**Commit**: `79d6688` - "fix(ui): reduce form max-width from 3xl to 2xl for better desktop UX"

- **File**: `components/Layout/FormPageLayout.vue`
- **Change**: Line 26: `max-w-3xl` → `max-w-2xl`
- **Result**: Code is CORRECT locally (verified)

### 2. Cache Busting Fix (✅ Complete)

**Commit**: `48ecda5` - "fix(build): force file hash regeneration to prevent CDN cache issues"

- **File**: `nuxt.config.ts`
- **Change**: Added `rollupOptions` to force content-based hashes in filenames
- **Purpose**: Prevent Vercel CDN from serving stale JavaScript bundles
- **Result**: Should prevent future caching issues

### 3. Deployment Verification (❌ FAILED)

**Problem**: Both QA and Production still show WRONG code after multiple deployments

- **Expected**: `max-w-2xl` (672px)
- **Actual**: `max-w-7xl` (1280px) - WHERE IS THIS COMING FROM?

## Current Status

### Code Status ✅

```bash
# Local code is correct
$ grep "max-w" components/Layout/FormPageLayout.vue
    <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
```

### Git History

```bash
$ git log --oneline -- components/Layout/FormPageLayout.vue
79d6688 fix(ui): reduce form max-width from 3xl to 2xl for better desktop UX
56e56fa refactor: extract reusable components from add pages
```

**Never had `max-w-7xl` in git history!** Original was `max-w-3xl`, changed to `max-w-2xl`.

### Deployed Status ❌

**Both QA and Production render**:

```html
<div class="max-w-7xl mx-auto px-4 sm:px-6"></div>
```

**This is WRONG** - neither `max-w-3xl` (old) nor `max-w-2xl` (new), but `max-w-7xl` (unknown source)!

## Environment Configuration

### QA (qa.myrecruitingcompass.com)

- **Vercel Project**: `recruiting-compass-web-staging`
- **Environment**: Changed from "Production" to "Preview"
- **Branch**: Should deploy from `develop`
- **Protection**: Vercel Deployment Protection enabled (login required)
- **Status**: Redeployed after environment change
- **Issue**: Still shows `max-w-7xl`

### Production (www.myrecruitingcompass.com)

- **Vercel Project**: `recruiting-compass-web` (assumed)
- **Environment**: Production
- **Branch**: Deploys from `main`
- **Status**: Should have fix (commit `79d6688` is on `main`)
- **Issue**: Still shows `max-w-7xl`

### Working URL ✅

```
https://recruiting-compass-web-staging-1guhpiuao-the-recruiting-compass.vercel.app
```

- Direct Vercel preview URL works correctly
- Shows latest code
- Custom domain doesn't work

## The Mystery: Where is `max-w-7xl` Coming From?

### Evidence

1. ✅ Local code: `max-w-2xl`
2. ✅ Git history: Never had `max-w-7xl`
3. ❌ Deployed sites: Showing `max-w-7xl`
4. ✅ Direct Vercel URL: Works (needs verification)

### Theories

1. **Build cache corruption** - Vercel is mixing files from different builds
2. **Component not rendering** - Maybe `FormPageLayout` isn't being used and there's a default layout with `max-w-7xl`
3. **Different codebase** - QA/Prod pointing to different repos or branches
4. **CSS override** - Some global CSS or Tailwind config is overriding the class

## What Needs to Happen Next

### Immediate Actions

1. **Verify the direct Vercel preview URL**:

   ```
   https://recruiting-compass-web-staging-{hash}.vercel.app/schools/new
   ```

   - Check if it shows `max-w-2xl` or `max-w-7xl`
   - Use browser DevTools to inspect the div classes

2. **Check Vercel build logs**:
   - Go to latest deployment in Vercel Dashboard
   - Check build logs for any errors or cache hits
   - Verify which commit was actually deployed

3. **Nuclear option - Clear ALL caches**:

   ```bash
   # Delete .nuxt and .output directories
   rm -rf .nuxt .output .vercel/output

   # Force fresh build
   npm run build

   # Commit and push
   git commit --allow-empty -m "chore: force complete rebuild - clear all caches"
   git push origin develop
   ```

4. **Check for global CSS overrides**:
   ```bash
   # Search for max-w-7xl in the codebase
   grep -r "max-w-7xl" --include="*.vue" --include="*.css" --include="*.ts"
   ```

### Investigation Questions

- [ ] Is `FormPageLayout` actually being used in the deployed version?
- [ ] Are there any Tailwind config changes that could affect max-width?
- [ ] Is there a global layout that's overriding form page layouts?
- [ ] Are QA and Production pointing to the correct Vercel projects?
- [ ] Have migrations or other deployments touched layout files?

## Files Involved

```
components/Layout/FormPageLayout.vue  - The component with the fix
pages/schools/new.vue                 - Uses FormPageLayout
nuxt.config.ts                        - Build configuration with cache busting
```

## Commits Involved

```
79d6688  fix(ui): reduce form max-width from 3xl to 2xl for better desktop UX
48ecda5  fix(build): force file hash regeneration to prevent CDN cache issues
cce8667  chore: force clean QA rebuild - clear build cache
433d781  chore: add migration script for QA database sync
37b5aa1  debug: add session diagnostic endpoint for QA data loading issue
```

## Related Issues Discovered

During investigation, we also found:

- **Data loading issue** (resolved): QA was showing old code that referenced `student_user_id` instead of `player_user_id`
- **CDN caching issue** (partially resolved): Cache busting added but still seeing stale content
- **Environment confusion**: Both QA and Prod were set to "Production" environment initially

## Recommendations for Next Session

1. **Start with the working Vercel preview URL** - Verify it has `max-w-2xl`
2. **If preview URL is correct**, the issue is with custom domain CDN caching
3. **If preview URL is also wrong**, the issue is with the build process itself
4. **Contact Vercel support** if custom domains continue serving wrong content after cache purge
5. **Consider using direct .vercel.app URLs** for QA until caching is resolved

## Success Criteria

- [ ] QA shows `max-w-2xl` (672px form width)
- [ ] Production shows `max-w-2xl` (672px form width)
- [ ] Form is visually narrower and more comfortable on desktop
- [ ] No Vercel login required for QA
- [ ] Changes persist across hard refresh

---

**Handoff Date**: February 10, 2026, 4:30 PM EST
**Created By**: Claude Code Session
**Next Steps**: Investigate `max-w-7xl` mystery and verify Vercel deployments
