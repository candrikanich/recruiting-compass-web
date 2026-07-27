# Six-Domain Codebase Audit — Findings Register (2026-07-27)

Companion to `prd/audit-remediation.md`. Six parallel read-only audit agents (Vue/Nuxt standards, SQL/Supabase, security, correctness/bugs, testing, UX/a11y), each with false-positive guards from `planning/lessons.md`. Headline criticals spot-verified by reading cited source (verification notes inline).

Severity scale: **C**ritical / **H**igh / **M**edium / **L**ow.

---

## 1. Verified criticals (main-thread confirmed by reading source)

| Finding | Status |
|---|---|
| Events RLS: `USING (school_id IS NULL OR ...)` on UPDATE/DELETE — any authed user can modify/delete any school-less event | **CONFIRMED** (`baseline.sql:3865,4130,4286`) |
| Phase advancement dead: `PHASE_MILESTONES` uses slugs (`sign-nli`), `task.id` is UUID; slugs seeded nowhere | **CONFIRMED** (`utils/phaseCalculation.ts:12-38`; zero grep hits in supabase/ or scripts/) |
| `notifications/create.post.ts` inserts `action_url` — column exists in no migration and not in `types/database.ts` | **CONFIRMED** |
| `useDeadlines.ts:23-24` assigns whole `{ deadlines: [...] }` envelope to `deadlines.value` → deadlines page crashes | **CONFIRMED** (server returns envelope at `deadlines/index.get.ts:31`) |
| No store reset on logout: `stores/schools.ts` has only `resetFilters()`; `user.logout()` clears user state only → cross-account data leak in SPA session | **CONFIRMED** |
| `email/send.post.ts` "open relay" | **DOWNGRADED to M** — has `requireAuth`, opt-out suppression, 2-template enum, currently dormant (no caller). Arbitrary-recipient abuse still real |

---

## 2. SQL / Supabase

| file:line | Sev | Problem |
|---|---|---|
| `supabase/migrations/00000000000000_baseline.sql:3865,4130,4286` | H | Events SELECT/UPDATE/DELETE policies pass on `school_id IS NULL` — cross-tenant access to school-less events (verified) |
| `baseline.sql:387-450,4778-4780` | H | `get_athlete_status(p_user_id)` SECURITY DEFINER, EXECUTE granted to anon+authenticated, no `auth.uid()` check — anyone can probe any athlete's stats by UUID via rpc |
| `server/api/cron/process-account-deletions.get.ts:139-149` | H | `users` delete error ignored, `deleted++` regardless. NO-ACTION FKs (`family_units.created_by_user_id`, `account_links.initiator_user_id`, `schools/coaches/events/interactions.created_by/updated_by`, `data_ownership_snapshot.original_owner_id`; auth-side `device_tokens`, `notification_preferences`, `user_deadlines`, `deadline_alert_log`, `school_status_history.changed_by`) block deletion → GDPR delete silently never completes, reports success |
| `server/api/notifications/create.post.ts:13-33,55-66` | H | Triple schema mismatch: `action_url` column missing; zod `type` allows `offer/event` absent from PG enum; zod `priority: medium` vs CHECK `low/normal/high` → insert 500s (verified) |
| `baseline.sql:4565` | M | `family_units_update` no WITH CHECK — any member can reassign `created_by_user_id` to self, then delete whole family via `family_units_delete` |
| `baseline.sql:4000` | M | Legacy "Users can insert interactions" doesn't force `logged_by = auth.uid()` — forgeable attribution; defeats player-only insert intent (permissive OR) |
| `baseline.sql:3677-3747,3810-4440` | M | Legacy `account_links` policies coexist with `family_unit_id` policies (3-4 permissive per verb) — access = union, unauditable; consolidation migration = highest-leverage fix |
| `server/api/schools/[id]/fit-score.get.ts:20-47` | M | Authz via `account_links` only — family-model parents get 404; duplicate second `.single()` fetch |
| `server/api/athlete-tasks/[taskId].patch.ts:93-113,160-201` | M | Per-prerequisite N+1 loop; check-then-insert race → unique-violation 500 on double-click. Fix: `.in()` batch + upsert `onConflict` |
| `server/api/family/code/join.post.ts:71-103` | M | Check-then-insert membership race → generic 500 instead of idempotent already-member |
| `composables/useEntitySearch.ts:171-260` | M | Queries nonexistent columns (`coaches.name/school/sport`, `interactions.notes/user_id/sentiment_label`) — every search errors → swallowed to empty results |
| `composables/useCollaboration.ts:45` | M | Queries `shared_records` table that exists in no migration — dead feature failing at runtime |
| `useEntitySearch.ts:176,240` | M | Raw interpolation into `.or("name.ilike.%${q}%")` — PostgREST filter injection (RLS bounds rows; contrast escaping in `high-school-search.get.ts:36-40`) |
| `composables/useDashboardData.ts:152-160`; `useInteractions.ts:102-130` | M | Unbounded interaction fetches (no limit/order) on heaviest table |
| `server/utils/supabase.ts:13-29` | M | `useSupabaseAdmin()` builds new client per call — database.md mandates singleton |
| `baseline.sql:727-741` | M | `trigger_push_notification` hardcodes prod URL, no auth header, pg_net dependency — breaks local/QA or edge fn must accept unauthenticated posts |
| `server/api/suggestions/index.get.ts:26-44` | M | `.maybeSingle()` on multi-family parent → unchecked multi-row error → silent fallback to parent id → empty suggestions |
| `baseline.sql:3782,680-724` | L | `data_ownership_snapshot` deny-all RLS + SECURITY INVOKER unlink fns — unlink flow fails for non-service-role |
| `baseline.sql:574-583,4808-4810` | L | `increment_profile_link_view` EXECUTE granted anon/authenticated despite service-role-only design |
| `server/api/public/profile/[slug]/view.post.ts:32-70` | L | View recording doesn't check `is_published` |
| `baseline.sql:3556,3331,3347` | L | Unindexed FKs: `suggestion.previous_suggestion_id`, `family_invitations.invited_by`, `family_units.created_by_user_id`, `users.*_sport_id/_position_id`; `profile_tracking_links.coach_id` non-leading only |
| `baseline.sql:1035-1244,4928-5176` | L | Six `*_backup_pre_family` + `user_preferences_v1_backup` tables persist with PII (incl. dropped `private_notes`) |
| `20260324000000_player_profile_header_color.sql:5-8` | L | Constraint add unguarded (not idempotent) |
| `20260318000002_create_user_deadlines.sql:4` | L | Declares FK `users(id) CASCADE` but deployed baseline has `auth.users(id)` NO ACTION — local rebuild diverges from prod |
| `server/utils/familyCode.ts:64-90` | L | In-memory Map rate limiter — per-instance on Vercel, unbounded growth; Redis-backed `rateLimit.ts` exists |
| `baseline.sql:2823` | L | Nothing enforces 1-player-per-family (documented model); second player can join |
| `server/utils/triggerSuggestionUpdate.ts:67-71` | L | `select("*")` from 5 tables incl. full `task` master list, per athlete per daily cron |

## 3. Security (server/API)

| file:line | Sev | Problem |
|---|---|---|
| `server/middleware/rate-limit.ts:130-141` | M | Trusts leftmost `X-Forwarded-For` — spoofable fresh bucket per request, defeats auth brute-force limits. Use Vercel trusted IP headers |
| `server/api/family/invite/[token]/accept.post.ts:47-84` | M | Accept succeeds on `user.email !== invited_email` (mismatch flagged, not enforced) — forwarded invite link joins family, reads minor's data |
| `server/api/family/invite/[token].get.ts:16-60` | M | Unauthenticated token GET returns family name + child PII (name, grad year, sport, position) pre-acceptance |
| `server/api/auth/validate-admin-token.post.ts:26-45` | M | Unauthenticated admin-token oracle; no rate limit; static HMAC of constant, never rotates; + `admin-profile.post.ts` = self-promotion path for token holder |
| `composables/useDocumentUpload.ts:145-156` | M | Upload validation client-only; server enforcement depends on unseen Storage bucket policies. Also `:147` raw `file.name` in storage key (path chars) |
| `server/middleware/security-headers.ts:50` | M | CSP `script-src 'unsafe-inline'` in prod (documented SPA limitation) |
| `server/middleware/csrf.ts:25-29` | L | Whole `/api/auth/*` prefix CSRF-exempt incl. cookie-authed `change-email`/`change-password` (mitigated by currentPassword requirement) |
| `server/api/auth/confirm-password-reset.post.ts:37-79` | L | References `event.context.supabase` never set by any middleware → endpoint always throws; reset-confirm path dead |
| `nuxt.config.ts:173-176` | L | `unsubscribeSecret` falls back to `adminTokenSecret` — one secret, two trust domains |
| `server/api/schools/favicon.ts:12-27` | L | SSRF residual: regex IP blocklist, no resolution check (DNS rebinding) |
| `server/api/email/send.post.ts:16-40` | M | Authed users can send 2 templated emails to arbitrary recipients with attacker-controlled data; dormant endpoint (downgraded from H — see §1) |
| `server/api/recruiting-packet/email.post.ts:139-146` | L | 10 arbitrary recipients, rate-limited 5/24h — spam vector; acceptable with monitoring |

Verified solid: `requireAuth`/`requireAdmin` on every non-public endpoint; id-param authz consistent (`resolveTargetAthleteId`, family-unit checks); Zod on security-relevant bodies; timing-safe cron secrets; no service-role key in public runtimeConfig; HSTS/XFO/nosniff/Referrer-Policy present. **No criticals; no IDOR found on reviewed endpoints.**

## 4. Correctness / bugs

| file:line | Sev | Problem |
|---|---|---|
| `utils/phaseCalculation.ts:12-38` | C | Slug-vs-UUID: phase advancement permanently impossible; milestone progress always 0% (verified) |
| `stores/user.ts:198` + schools/coaches/offers stores | C | No auth-change reset lifecycle — cross-account data leak on SPA logout/login (verified) |
| `composables/useParentContext.ts:64` + `components/Timeline/TaskItem.vue:215` | C | Reads nonexistent `linked_accounts` → `isViewingAsParent` always false → parents can toggle athlete tasks (read-only guard dead) |
| `composables/useSessionTimeout.ts:103-105` | H | Inactivity logout is Pinia-only; `supabase.auth.signOut()` never called — reload re-authenticates on shared computer |
| `composables/useDeadlines.ts:23-24` | H | Envelope mismatch crashes deadlines page (verified) |
| `composables/useTasks.ts:131-134` + `server/api/athlete-tasks/index.get.ts:18-22` | H | `/api/athlete-tasks` ignores `athleteId` — parent view merges athlete deadlines with parent's empty completions → all tasks show not-started |
| `server/api/athlete/phase.get.ts:110-117` vs `phase/advance.post.ts:35-50` | H | GET derives phase from grad year; POST writes `users.current_phase` GET never reads — advance never visible |
| `composables/useEvents.ts:90` vs `:180` | H | Fetch filters by viewer id, create inserts data-owner id — parent-created events vanish on reload; null owner pre-load → NOT NULL violation |
| `composables/useSearchConsolidated.ts:198-216 et al.` | H | `limit(20)` before term filter, fuzzy client-side — >20 rows = arbitrary misses ("Stanford" not found). Deprecated predecessor pushed `ilike` to DB |
| `pages/schools/[id]/interactions.vue:322` + `useInteractionReminders.ts:42,287` | H | date input → `toISOString()` UTC midnight → reminders overdue/display a day early (US TZ) |
| `utils/dashboardCalculations.ts:77`; `useEventStats.ts:8` | H | UTC-anchored "today" — today's events missing from dashboard/upcoming after evening US time |
| `composables/useInteractions.ts:156-161`; `useEvents.ts:101-113` | H | End-date filter `lte(T00:00Z)` excludes entire end day; same-day range empty |
| `composables/useFamilyInvite.ts:128-131` + `utils/familyCodeValidation.ts:97-101` | H | Query nonexistent `users.family_code` / `family_codes` table behind `as`-casts — valid codes fail |
| `stores/user.ts:86-91,127-130` | H | Profile-create failure fabricates `role: "player"` fallback (parent gets player dashboard); existing-profile path returns true without loading profile → logged-in-but-empty |
| `composables/useNotifications.ts:124,156-158` | H | `shallowRef` mutated in place (`unshift`) — badge/list never re-render |
| `server/api/colleges/search.get.ts:30-32` | H | Redis key omits `fields`/`per_page` — first caller shape cached 30 days for all callers |
| `utils/dateFormatters.ts:12`; `utils/exportUtils.ts:133,410,777,848`; `stores/offers.ts:270-275`; `utils/deadlineHelpers.ts:17,66`; `components/Interactions/InteractionAddForm.vue:354` | M | Codebase-wide `new Date("YYYY-MM-DD")` UTC-midnight parse — dates render one day early US TZ; offers flip overdue evening before; datetime-local default in UTC. One shared local-parse helper fixes class |
| `server/api/athlete/status/recalculate.post.ts:101-118,196` | M | Query errors silently zero sub-scores, depressed composite **persisted** to `users.status_score` |
| `composables/useDashboardData.ts:179-235` | M | `if (!error && data)` swallows errors, keeps prior athlete's data as current; no reset on fetchAll |
| `composables/useInteractions.ts:387-396` | M | 0-row delete (RLS block) treated as success — item removed locally, reappears |
| Typeaheads (`useCollegeAutocomplete.ts:57-111`, `useHighSchoolSearch.ts:34`, `useAddressAutocomplete.ts:29`) + domain fetches (`useInteractions.ts:82`, `useActivityFeed.ts:141`, `stores/coaches.ts:103-122`) | M | Zero request cancellation anywhere — out-of-order responses clobber newer data |
| `utils/interactions/attachments.ts:58-60` | M | Upload failure console-only; interaction saves with empty attachments silently |
| `composables/useCursorPagination.ts:62-74,197-209` | M | Strict `lt/gt` timestamp cursor skips equal-timestamp rows |
| `composables/useAutoSave.ts:14-26` | M | No flush on unmount — edit-then-navigate within debounce = silent loss in "auto-save" |
| `utils/exportUtils.ts:274,292-297,410` | M | HTML report builders interpolate names/notes unescaped — stored XSS in exported reports (CSV path escapes; HTML doesn't) |
| `composables/useSchoolMatching.ts:288-292` | M | 2-letter state `includes()` — "IN" matches "Springfield" — inflated match scores |
| `stores/coaches.ts:149-160` | M | 7-column select cast `as Coach[]` replaces full objects — phone/notes/socials silently lost |
| `server/api/family/accessible.get.ts:116,126` + `useFamilyContext.ts:14`, `app.vue:43` | M | `graduationYear` hardcoded null (closest-to-grad never matches); three `useActiveFamily` instances desync; singleton survives logout |
| `middleware/auth.ts:15-18` | M | Hardcoded 30-day window; `prefs.expiresAt` (rememberMe) never read — "1 day" sessions last 30 days |
| `composables/useParentPreviewMode.ts:22,63-66` | M | Preview flag written to localStorage, never read back; per-call refs → banner never shows |
| `useFamilyInvitations.ts:59-63`; `accept.post.ts:78-81` | L | Resend = delete-then-create (create fail = invite lost); double-accept unique violation → 500 despite success |
| `server/api/tasks/index.get.ts:30-32,65` et al. | L | `parseInt` no radix/NaN guard; `?.map() as string[]`; cascade-deletes without `{count:"exact"}` always report "No records"; `daysAgo` Math.abs renders future as past; `utils/autoTaskCompletion.ts:13-91` trigger arrays all empty (silent no-op feature) |

## 5. Vue/Nuxt standards

| file:line | Sev | Problem |
|---|---|---|
| `pages/admin/signup.vue:456` | H | `console.log` dumps full Supabase signup response (session/tokens) |
| `pages/settings/player-details.vue:1148` | H | Auto-save catch = console.error only — silent data-loss risk |
| `pages/settings/notifications.vue:107-186` | H | Page holds `useSupabase() as any`, inline queries — bypasses composable/store layers |
| `middleware/onboarding.ts:26-35` | H | Uncached `users` query on nearly every navigation |
| `pages/school-[id]-coaches.vue` | H | 459-line dead duplicate of `schools/[id]/coaches.vue` — unreferenced live route, drifting copy |
| `pages/settings/player-details.vue:544,710` | H | `:key="idx"` on editable/removable lists — input state bleeds across rows |
| `pages/dashboard.vue:180`; `pages/timeline/index.vue:222`; `components/Timeline/UpcomingMilestones.vue:81-82` | H | Client imports from `~/server/utils/ncaaRecruitingCalendar` — server code in client bundle |
| systemic (130 hits) | H | Unmigrated `console.*` across pages/components/middleware/plugins; `createClientLogger` exists. Add ESLint `no-console` |
| systemic (215 hits) | H | `any` in non-test code — mostly `(supabase as any)` casts for tables missing from generated types (`school_status_history`, `notification_preferences`, `parent_view_log`). **One `supabase gen types` regen kills ~60%** |
| `components/UniversalFilter.vue:356` | M | `` `lg:grid-cols-${props.columns}` `` — invisible to Tailwind JIT, no safelist → silently single-column |
| `UniversalFilter.vue`, `Search/AdvancedFilters.vue`, `Dashboard/DashboardCharts.vue`, `DesignSystem/EmptyState.vue:52` | M | `any`-typed props/emits in component APIs |
| `pages/settings/player-details.vue` (1346), `pages/events/[id].vue` (1142), `pages/admin/index.vue` (992) | M | God-pages over 800-line max, logic belongs in composables |
| `useDocumentValidation/useFileAttachments/useInteractionAttachments/useFormValidation` | M | MIME/size validation copy-pasted 4× with divergent limits (50MB vs 5-10MB) |
| `pages/admin/index.vue:708,816`; `pages/social/index.vue:325-326` | M | Direct `supabase.auth.getSession()` — the exact pattern behind the fixed dashboard bug (f2a622dc) |
| `composables/ncaaDatabase.ts` | L | 600-school static data in composables/ auto-import scope, non-useXxx naming |

Verified clean: interval/listener cleanup (all 6 files), no component-side Pinia mutation, no service-role client-side, no `v-html`, SSR guards correct.

## 6. Testing

| Item | Sev | Problem |
|---|---|---|
| `tests/integration/auth-flow-with-onboarding.integration.spec.ts` (86), `tests/unit/pages/onboarding/index.spec.ts` (61), `tests/integration/parent-access-control.integration.spec.ts` (39) + 6 more files | C | **~208 tautological `expect(true).toBe(true)` tests** fake-covering auth/onboarding and parent access control — green-washed security coverage, inflates count 3.5% |
| `server/utils/athleteAccess.ts` | P0 | The `?athleteId` authz gate — untested; regression = silent cross-athlete access |
| `server/api/athlete/phase/advance.post.ts` | P0 | Phase advancement writes untested |
| `server/api/cron/*` (4 jobs incl. process-account-deletions) | P0 | Destructive batch jobs (account deletion) unverified |
| `tests/unit/server/csrf-middleware.spec.ts:4-52` | H | Tests a hand-copied duplicate of CSRF exemption logic — drift-blind by construction. Export predicates from middleware, import in test |
| ~35 of 98 API endpoints untested | H | Incl. tasks endpoints, fit-score endpoints (calculator util IS well tested), preferences, suggestions surface endpoints, admin/delete-user, export |
| `server/utils/auditLog.ts` (348), `csrf.ts`, `adminToken.ts`, `secrets.ts`, `errorHandler.ts`, `redis.ts`, `exportUser.ts` | M | Security primitives + big utils untested |
| `useNotifications` (295), `useDocumentUpload` (267), `useDocumentSharing` (150) + 41/124 composables total | M | No dedicated specs |
| E2E: 78 `test.skip(` sites (not 92) | M | 28 bare reason-less data-guards (coaching-philosophy 10, notifications 9, user-story-9-1 8); ~13 declarative permanently-off; ~35 conditional-with-reason |
| Coverage thresholds 71/69/59/70 | L | Below stated 80% target; 5 e2e files still share player@test.com |

Well-covered: all 5 Pinia stores, fitScoreCalculation, computeTaskDeadline, invite state machine (unit), 8/12 suggestion rules, most auth endpoints. No snapshot abuse; component tests genuinely mount.

## 7. UX / a11y

`npm run audit:tokens`: 0 errors, 115 warnings — all raw hex in chart/canvas `<script>` configs missing sanctioned `// audit-ignore` (`pages/analytics/index.vue:199-217`, `pages/performance/index.vue:593-643`).

| file:line | Sev | Problem |
|---|---|---|
| 10 Teleport modals (`EmailSendModal`, `TemplateSendModal`, `FamilyInviteModal`, `Coach/AddCoachModal`, `Coach/OtherCoachModal`, `Performance/ExportModal`, `School/DocumentUploadModal`, `Recovery/RecoveryModal`, `Search/SaveSearchDialog`, `Suggestion/SuggestionHelpModal`) | C | No `role="dialog"`, `aria-modal`, Escape, focus trap, or focus restore. Remediated pattern exists: `EditCoachModal.vue:7-12` + `useFocusTrap` — copy-the-pattern work |
| `pages/tasks/index.vue:481-495` | C | Task checkbox: only `:title`, no accessible name |
| `pages/search/index.vue:157-235` + `components/CoachCard.vue:2` | C | Clickable result cards: no focus, keyboard, or role |
| `components/OfferComparison.vue:1-7,13-18,67-99` | H | Modal without dialog semantics; `bg-opacity-50` dead in Tailwind v4 → solid black backdrop; "×"-only close; best-value conveyed by color alone |
| `components/FamilyInviteModal.vue:113-124` | H | Label sibling without `for`/`id` |
| Icon-only buttons: `Settings/ProfileEditHistory.vue:26`, `Dashboard/ParentGuidanceCard.vue:48-51`, `Performance/ExportModal.vue:16-19`, `School/SchoolProsConsCard.vue:21-24`, `Dashboard/DashboardAnalytics.vue:239-281` | H | No aria-label (Toast.vue:38 = reference pattern) |
| `pages/documents/view.vue:126-131`, `pages/documents/[id].vue:126-131` | H | Preview `<img>` no alt |
| `pages/interactions/add.vue:39-41`; `pages/offers/index.vue:696-708`; `pages/timeline/index.vue:349-351` | H | Silent mutation failures — console.error only, user believes saved |
| `pages/timeline/index.vue:31-34,314,400-407` | H | Status = 3px color dot only; `graduationYear: 2027` hardcoded (TODO) — milestones wrong for every non-2027 athlete |
| ~15 files (offers, events, documents, recommendations, family-management, SocialPostCard, DocumentCard, TemplateEditor) | M | Native `confirm()` for destructive deletes while `DesignSystemConfirmDialog` exists (pattern: `pages/schools/index.vue:227-236`) |
| `components/DesignSystem/{Empty,Error,Loading}State + 3 skeletons` | M | **Zero adopters** — every page hand-rolls states; docs mandate = fiction. Enforce or retire |
| `pages/tasks/index.vue:196-199,220-224` | M | Native `alert()` incl. raw `err.message` shown to users |
| `pages/search/index.vue:80-93,110-126` | M | Tabs without aria-current; results without live region |
| `pages/tasks/index.vue:432-437,499-503`; `Timeline/PhaseCardInline.vue:11`; `EmailRecruitingPacketModal` (no Esc/trap); `Help/HelpModal` (no role) | M | aria-live missing on toast; aria-expanded missing; half-migrated dialogs |
| Palette drift: stock `green/yellow/gray` vs brand-emerald/orange/slate (`tasks`, `timeline`, `search`, `documents/[id]`) | L | Class-name drift invisible to hex-only token audit |
| Dead-end empty/error states without CTA (`tasks:453-468`, `search:129-134`, `schools:90-96`, `interactions:161-178`) | L | timeline:54-66 shows correct retry pattern |

## Cross-domain systemic themes (PRD phase drivers)

1. **Legacy/current model duality** — `account_links` vs `family_units` in RLS + server code; `useParentContext` vs `useActiveFamily`; slug vs UUID task ids; `family_codes`/`users.family_code` ghosts. Union of permissive policies = real security holes; casts hide the drift from TS.
2. **No auth-change lifecycle** — stores/singletons never reset on logout/switch; session timeout doesn't sign out of Supabase; auth expiry prefs ignored.
3. **Date-only strings parsed as UTC** — one shared local-date helper fixes a codebase-wide "day early" class.
4. **Supabase returns-not-throws mishandled** — swallowed errors, 0-row writes as success, one path persisting corrupted scores.
5. **Stale generated DB types** — root of 215 `any`s and multiple ghost-schema bugs; regen + missing-table migrations.
6. **Silent failure UX** — mutations fail to console only across interactions/offers/timeline/settings/attachments.
7. **Fake test coverage** — 208 tautologies on the most sensitive flows; security primitives and destructive crons untested.
8. **Modal a11y debt** — 10+ dialogs missing semantics with in-repo remediated pattern to copy.
