# Admin Subdomain — Operator Runbook (manual steps)

These steps live outside code and must be done by the operator. Do the DNS +
Vercel steps BEFORE deploying the host middleware, so the main-host `/admin`
redirect points at a domain that already resolves.

## 1. Vercel domain (prod project = recruiting-compass-web-production)
- Confirm the prod project identity first (local `.vercel` may link to QA).
- Add domain `admin.myrecruitingcompass.com` to the prod project.
- Set env `NUXT_PUBLIC_ADMIN_HOST=admin.myrecruitingcompass.com` (Production).

## 2. DNS
- Add a CNAME `admin` → the Vercel target shown in the domain settings.
- Wait for verification (Vercel shows "Valid Configuration").

## 3. Create the admin account
- Visit https://admin.myrecruitingcompass.com/admin/signup
- Complete signup with `admin@therecruitingcompass.com` using a valid token
  (HMAC of NUXT_ADMIN_TOKEN_SECRET; see server/utils/adminToken.ts).
- In the DB: `UPDATE users SET is_admin = true WHERE email = 'admin@therecruitingcompass.com';`

## 4. Smoke test (dual-login)
- Tab A: myrecruitingcompass.com — sign in as a parent test account.
- Tab B: admin.myrecruitingcompass.com — sign in as admin@. Both persist on reload.
- On myrecruitingcompass.com, visit /admin → hard-redirects to admin host.
- On admin host, visit /schools → redirects to /admin.
- As a non-admin, hit /admin/migrate-school-sizes and /admin/batch-fetch-logos → redirected to /.

## 5. Cookie invariant
- Do NOT set the Supabase auth cookie domain to `.myrecruitingcompass.com`.
  Sessions must stay per-origin (localStorage) or dual-login breaks.
