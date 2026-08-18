# Vercel Migration — 3 projects → 1 project, 2 environments

**Date:** 2026-08-18
**Goal:** One Vercel project, native env model. `main` → Production (apex/www/admin), `develop` → Preview pinned to `qa.myrecruitingcompass.com`. Kill the other two projects. Cut ~66% wasted builds. Do it pre-launch, zero prod risk.

## Current state (verified)

| Vercel project | id | Git branch built | Custom domains |
|---|---|---|---|
| `recruiting-compass-web-production` | `prj_KcKf2CqlmAk7LEwwSxuOpRFypg0c` | main (prod) + all branches (preview) | **apex, www, admin.** |
| `recruiting-compass-web-staging` | `prj_Ithv5WjkRZLQVcJGJ5duLLMyAyzK` | develop → qa | **qa.** |
| `recruiting-compass-web` | `prj_KyWuWV2bI8cllCGNeANG9iGsvbXP` | main+develop (preview) | none (vercel.app only) — **local `.vercel` wrongly links here** |

- **DNS = Vercel-managed** (ns1/ns2.vercel-dns.com). Domain moves between projects are clean, no registrar step.
- **Survivor = `recruiting-compass-web-production`** — already owns the risky prod domains (they never move → no prod downtime) and has the clean env-var set.
- `admin-qa.myrecruitingcompass.com` — DNS record exists, assigned to **no project** (dangling). Confirm + remove or repoint.
- Prod project deployment protection: **OFF** (previews public → qa needs no login). ✔
- Prod project env vars: 13, correct. `NUXT_PUBLIC_ADMIN_HOST` already scoped Production+Preview. Supabase vars shared all-envs (single DB `xpxzhqghxecsjhvklsqg`).
- Staging(=QA) project env: **legacy cruft** — dead `NEXT_PUBLIC_*` (Next.js prefix) + `POSTGRES_*`/`SUPABASE_JWT` Supabase-integration block. **Do NOT migrate.** Missing `NUXT_PUBLIC_ADMIN_HOST`.

## Target state

- **One project:** `recruiting-compass-web-production` (optionally rename later).
- **Production env:** branch `main` → apex + www + admin.myrecruitingcompass.com.
- **Preview env:** branch `develop` → `qa.myrecruitingcompass.com` (Git-branch domain). Optionally `admin-qa.` for QA admin host.
- Env vars scoped: shared values all-env; Preview overrides for `NUXT_PUBLIC_ADMIN_HOST` (qa admin host) + `PUBLIC_BASE_URL` (qa url).
- Other two projects: git-disconnected + deleted.

## Cutover (ordered — prod/apex untouched throughout)

1. **Preview env vars on prod project** (BEFORE any develop build — SPA bakes NUXT_PUBLIC_* at build):
   - `NUXT_PUBLIC_ADMIN_HOST` (Preview) = QA admin host (decide: `admin-qa.myrecruitingcompass.com` or `qa.myrecruitingcompass.com`).
   - `PUBLIC_BASE_URL` (Preview) = `https://qa.myrecruitingcompass.com`.
   - Verify Preview has: supabase url/anon/service, cron secret, admin token, resend, upstash, scorecard, auth-enforcement (inherit all-env — already present).
2. **Confirm Preview protection OFF** (already off).
3. **Trigger a `develop` preview build** on prod project (push/redeploy). Verify on its `*.vercel.app` preview URL: loads, admin works, hits correct DB.
4. **Move `qa.myrecruitingcompass.com`**: remove from staging project → add to prod project → set as **Git Branch domain → `develop`**. (Brief QA-only blip.)
5. **Verify** `qa.myrecruitingcompass.com` serves latest develop from prod project.
6. **Handle `admin-qa.`**: assign to prod project (branch develop) if QA admin uses it, else delete the DNS record.
7. **Decommission** staging + `recruiting-compass-web`: disconnect Git (stops builds), then delete projects.
8. **Relink local**: `.vercel/project.json` → prod project id (`vercel link` or edit).
9. **(Optional) Limit preview builds** — see open decision.
10. **(Optional) Rename** project → `recruiting-compass-web`.

## Rollback

- Prod domains never move → prod safe regardless.
- If qa breaks: re-add `qa.` to staging project (still exists until step 7). Keep staging until qa verified on new project.
- Env var changes are additive/scoped; revertible.

## Open decision — feature-branch previews

Single project previews **every** branch by default (PR previews). Keep, or restrict builds to `main`+`develop` only (Ignored Build Step) to save Hobby build minutes?

## Open verifies (non-blocking, resolve during exec)

- QA admin host: `admin-qa.` vs `qa./admin` — what does QA use today?
- Current Preview `NUXT_PUBLIC_ADMIN_HOST` value on prod project (hidden).
- Is `admin-qa.` actually needed?

---

## STATUS: COMPLETE — 2026-08-18

All steps executed. Final state:
- **One project** `recruiting-compass-web-production`. Deleted `recruiting-compass-web` + `recruiting-compass-web-staging` (204).
- Production=main (apex/www/admin), Preview=develop (qa + admin-qa, Git-Branch domains). All 4 hosts: root 200, `/api/admin/growth` 401 (admin suite live).
- Preview env: `NUXT_PUBLIC_ADMIN_HOST=admin-qa.myrecruitingcompass.com`, `PUBLIC_BASE_URL=https://qa.myrecruitingcompass.com`. Production restored after `vercel env rm` all-env-delete footgun (see planning/lessons.md).
- Ignored Build Step: only main+develop build.
- Local `.vercel` relinked to prod project (backup at /tmp/vercel-link-backup.json).
- Decision: previews = develop+main only.

Not done (optional): rename project → `recruiting-compass-web`.
