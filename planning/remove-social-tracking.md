# Remove Social Media Tracking — Full Deletion Plan

**Decision (Chris, 2026-08-14):** Social-media monitoring not worth including at any point — X API ~$200/mo, Instagram Graph API gated. Remove all of it. Keep repo clean.

**Scope:** Delete the coach/program social-post monitoring feature end to end. KEEP social *handles* (twitter/instagram fields on school/coach/player profiles) — those are contact info, not tracking. KEEP interaction `type: "social"`.

## A. Delete files
- `pages/social/index.vue`, `pages/social/analytics.vue`, `pages/social/coach/[id].vue`
- `pages/settings/social-sync.vue`
- `composables/useSocialMedia.ts`, `composables/useSocialSyncSettings.ts`
- `components/SocialPostCard.vue`, `components/Dashboard/SocialMediaWidget.vue`
- `components/Dashboard/DashboardWidgetsSection.vue` (dead code, imports SocialMediaWidget)
- `server/api/social/sync.post.ts`, `server/api/social/sync-all.post.ts`
- `server/utils/twitterService.ts`, `server/utils/instagramService.ts`
- `utils/sentimentAnalysis.ts`

## B. Delete tests (test deleted code only)
- `tests/unit/composables/useSocialMedia.spec.ts`, `useSocialSyncSettings.spec.ts`
- `tests/unit/server/utils/twitterService.spec.ts`, `instagramService.spec.ts`
- `tests/unit/utils/sentimentAnalysis.spec.ts`
- `tests/unit/server/api/social/sync-all.post.spec.ts`
- `tests/unit/server/api/social-sync-all-auth.spec.ts`

## C. Edit files (remove refs)
1. `pages/dashboard.vue` — drop `linkedAccounts` componentMap + widgetPropsMap entries
2. `types/models.ts` — drop `linkedAccounts` (widgets bool, WidgetId union, WIDGET_SIZES, WIDGET_LABELS) + `socialMedia` notification bool
3. `components/Dashboard/DashboardAnalytics.vue` — drop "Social Media Monitoring / Monitor Activity" card
4. `pages/settings/index.vue` — drop "Social Media Sync" SettingsCard
5. `components/Coach/CoachHeader.vue` — drop "Social Posts" link
6. `utils/preferenceValidation.ts` — drop `{ id: "linkedAccounts", visible: true }` default
7. `utils/validation/schemas.ts` — drop `socialMediaPostSchema` + `SocialMediaPostInput`
8. `server/api/coaches/[id]/cascade-delete.post.ts` — drop social_media_posts delete
9. `server/api/coaches/[id]/deletion-blockers.get.ts` — drop social_media_posts check
10. `server/api/schools/[id]/cascade-delete.post.ts` — drop social_media_posts delete
11. `server/api/schools/[id]/deletion-blockers.get.ts` — drop social_media_posts check
12. `server/middleware/rate-limit.ts` — drop `social` config + `/api/social` path match
13. `types/database.ts` — drop `social_media_posts` table block + `social_platform` enum
14. `types/database-helpers.ts` — drop SocialMediaPost Row/Insert aliases

## D. Edit tests (strip social assertions, keep rest)
- coaches/schools cascade-delete + deletion-blockers specs
- `schemas.extended.spec.ts`, `preferenceValidation.spec.ts`
- `parent-access-control.integration.spec.ts`, `rls-family-deferrals.integration.spec.ts`

## E. DB migration (LIVE — confirm before apply)
- New migration `DROP TABLE social_media_posts CASCADE;` + `DROP TYPE social_platform;` (cascades RLS policies). Historical migrations untouched (can't rewrite history). Apply via Supabase MCP.

## Verify
`npm run type-check`, `npm run lint`, `npm run test`, `npm run build`.
