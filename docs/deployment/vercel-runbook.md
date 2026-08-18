# Vercel Runbook

Operational reference for the Vercel setup. Last restructured **2026-08-18** (3-projects-per-app → 1-project-per-app, native env model).

## Topology (one project per app)

| Vercel project | id | Repo | Production branch | Custom domains |
|---|---|---|---|---|
| `recruiting-compass-web` | `prj_KcKf2CqlmAk7LEwwSxuOpRFypg0c` | `candrikanich/recruiting-compass-web` | `main` | myrecruitingcompass.com, www, admin.myrecruitingcompass.com (Prod) · qa.myrecruitingcompass.com, admin-qa.myrecruitingcompass.com (Preview) |
| `recruiting-compass-landing` | `prj_5whiF2eaWitZdy1fO2fIFJi20EIL` | `candrikanich/recruiting-compass-landing` | `main` | therecruitingcompass.com, www.therecruitingcompass.com |
| `recruiting-compass-resources` | `prj_kh2uvmcWgVokSi290jhqCu83KsNl` | `candrikanich/recruiting-compass-resources` | `main` | none (vercel.app only; dormant) |

- **Team:** `the-recruiting-compass` (`team_kUxZdkds8DNlvJPNb2afLJyb`).
- **One project per app.** Do NOT create a second Vercel project for the same repo — that was the old mistake (each project builds every branch → N× build waste). Use environments, not projects, to separate prod/non-prod.
- Deleted 2026-08-18: `recruiting-compass-web` (old dead QA), `recruiting-compass-web-staging` (old QA), `recruiting-compass-landing` (old orphan). Names since reused.

## Environment model (web app)

Native Vercel envs on the single `recruiting-compass-web` project:

| Env | Git branch | Serves | `NUXT_PUBLIC_ADMIN_HOST` | `PUBLIC_BASE_URL` |
|---|---|---|---|---|
| **Production** | `main` | apex + www + admin. | `admin.myrecruitingcompass.com` | `https://myrecruitingcompass.com` |
| **Preview** | `develop` | qa. + admin-qa. | `admin-qa.myrecruitingcompass.com` | `https://qa.myrecruitingcompass.com` |

- `qa.` and `admin-qa.` are **Git-Branch domains** bound to `develop` — they always serve the latest `develop` Preview deployment.
- **Ignored Build Step** limits builds to `main`+`develop` only (no feature-branch/PR previews). Command on the project: `if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "develop" ]; then exit 1; else exit 0; fi` (exit 1 = build, exit 0 = skip). Landing uses the `main`-only variant.
- Deployment protection: **OFF** (Preview URLs are public).

## Deploy flow

- **Push to `main`** → Production build → auto-promotes to apex/www/admin.
- **Push to `develop`** → Preview build → auto-serves qa./admin-qa.
- **Promote develop → main** = normal release flow (PR develop→main, merge). Merging to `main` triggers the prod build. If a merge ever does NOT build (rare webhook miss), force one with an empty commit:
  ```
  git checkout main && git pull && git commit --allow-empty -m "chore: trigger prod deploy" && git push
  ```

## Data

- **One Supabase DB serves BOTH prod and QA/Preview** — `xpxzhqghxecsjhvklsqg`. Every write (incl. QA + E2E) hits production data. Supabase env vars are identical across Production/Preview (only host + admin-host + base-url differ). See [[prod-infra-identity]].

## Gotchas (read before touching)

- **SPA bakes `NUXT_PUBLIC_*` at build time** (`ssr:false`). An env-var change does nothing until the affected env is **rebuilt**. Diagnose by curling the live JS bundle, not by theorizing. See `nuxt.config.ts` `runtimeConfig.public`; `adminHost` defaults to `admin.myrecruitingcompass.com` (`nuxt.config.ts:211`).
- **`vercel env rm NAME <env>` deletes the var across ALL environments**, not just the named one. To change ONE env's value, just `vercel env add NAME <env>` (it overwrites that target) — never `rm` first on a multi-env var. If you must, re-add every other scope immediately and verify with `vercel env pull`.
- **Sensitive vars mask on pull** (`[SENSITIVE]`) — you cannot read the value back. Recover known values from `nuxt.config.ts` defaults or the live baked bundle before deleting.
- **False 200 during a build**: an in-progress deployment URL returns a Vercel placeholder page (Geist fonts / `instant-preview-site`) with HTTP 200. It is NOT the app. Verify real readiness by grepping the body for `/_nuxt/entry`.
- **DNS is Vercel-managed** (nameservers `ns1/ns2.vercel-dns.com`) for both `myrecruitingcompass.com` and `therecruitingcompass.com` — domain moves between Vercel projects are clean, no registrar step.

## Common operations

CLI is authenticated locally; token at `~/Library/Application Support/com.vercel.cli/auth.json`. Set once per shell:
```
export VERCEL_ORG_ID=team_kUxZdkds8DNlvJPNb2afLJyb
export VERCEL_PROJECT_ID=prj_KcKf2CqlmAk7LEwwSxuOpRFypg0c   # web
S=the-recruiting-compass
TOKEN=$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/Library/Application Support/com.vercel.cli/auth.json')))['token'])")
```

**List env keys / pull values:**
```
npx vercel env ls --scope $S
npx vercel env pull /tmp/x.env --environment=production --scope $S   # or preview
```

**Change one env value (safe):**
```
printf 'newvalue' | npx vercel env add NAME production --scope $S    # overwrites that env only
```

**Move a domain between projects** (REST — detaches without deleting the domain):
```
curl -s -X DELETE "https://api.vercel.com/v9/projects/$FROM/domains/$D?teamId=$VERCEL_ORG_ID" -H "Authorization: Bearer $TOKEN"
curl -s -X POST   "https://api.vercel.com/v10/projects/$TO/domains?teamId=$VERCEL_ORG_ID" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"'$D'","gitBranch":"develop"}'   # omit gitBranch for a production domain
```

**Verify all hosts** (200 root + 401 on admin endpoint = admin suite live):
```
for u in myrecruitingcompass.com admin.myrecruitingcompass.com qa.myrecruitingcompass.com admin-qa.myrecruitingcompass.com; do
  printf "%-36s " "$u"; curl -s -o /dev/null -w "root=%{http_code} " "https://$u/"; curl -s -o /dev/null -w "growth=%{http_code}\n" "https://$u/api/admin/growth"
done
```

## Related

- Migration record: `planning/vercel-single-project-migration.md`
- Env-var footgun lesson: `planning/lessons.md` ("Vercel `env rm` deletes the var across ALL environments")
- Release flow: `release-flow` skill · CI/CD: `docs/deployment/ci-cd.md`
