# Lessons Learned

This file tracks patterns, mistakes, and corrections to prevent recurring issues.

## Template

```markdown
## Pattern: [Brief description]

**Date:** YYYY-MM-DD
**Context:** What went wrong
**Root Cause:** Why it happened
**Prevention:** Rule to prevent recurrence
```

---

## Lessons

## Pattern: Nuxt 3 Auto-Import Component Naming

**Date:** 2026-02-14
**Context:** Vue failed to resolve `ProfileEditHistory` and `ProfilePhotoUpload` components despite files existing in `/components/Settings/`
**Root Cause:** Nuxt 3 auto-import requires folder prefix for nested components. Components in `/components/Settings/` must be referenced as `SettingsComponentName`, not just `ComponentName`
**Prevention:**
- When creating components in subdirectories of `/components/`, always use the folder prefix
- Pattern: `/components/FolderName/ComponentName.vue` → `<FolderNameComponentName />`
- Example: `/components/Settings/ProfileCard.vue` → `<SettingsProfileCard />`
- Alternative: Explicitly import components if you want to use custom names
