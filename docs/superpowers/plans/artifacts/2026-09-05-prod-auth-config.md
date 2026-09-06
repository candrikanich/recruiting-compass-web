# Prod Auth Config Handoff (Task 4)

Paste these into **Supabase Dashboard → `recruiting-compass-prod`
(`lrzsenidegcqhwzwncve`) → Authentication → URL Configuration**.

## Site URL

```
https://myrecruitingcompass.com
```

(Staging's equivalent: `https://qa.myrecruitingcompass.com`)

## Redirect URLs

Add all 4:

```
https://myrecruitingcompass.com/
https://myrecruitingcompass.com/**
https://recruiting-compass-*-the-recruiting-compass.vercel.app
https://recruiting-compass-*-the-recruiting-compass.vercel.app/**
```

Derived from the real prod Vercel project (`recruiting-compass-web`,
`prj_KcKf2CqlmAk7LEwwSxuOpRFypg0c`) domains, confirmed live via Vercel
MCP — not guessed. The wildcard pattern covers per-deployment preview-style
URLs (confirmed real example: `recruiting-compass-r457mflh3-the-recruiting-compass.vercel.app`),
mirroring the same 4-pattern shape staging uses for its preview URLs.

Note: `admin.myrecruitingcompass.com` and `www.myrecruitingcompass.com`
are also prod domains on this same Vercel project but not included above —
add them too if the admin app or a `www.` visit ever needs to complete a
Supabase Auth redirect (signup/reset) directly, not just the app itself.

## Email Templates

All 6 (Confirm sign up, Invite user, Magic link/OTP, Change email address,
Reset password, Reauthentication) are Supabase defaults on staging — no
customization to copy. Prod needs no template changes.

Security notification toggles (Password/email/phone changed, Sign-in
method linked/removed, MFA added/removed) are all **off** on staging —
this is also Supabase's default state, so prod needs no action here either
(confirm it matches after setup, don't need to explicitly toggle
anything).

## SMTP Settings

Paste into **Supabase Dashboard → `recruiting-compass-prod` →
Authentication → Emails → SMTP Settings**, toggle "Enable custom SMTP" on:

| Field | Value |
|---|---|
| Sender email address | `info@therecruitingcompass.com` |
| Sender name | `The Recruiting Compass` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Minimum interval per user | `60` seconds |
| Username | `resend` |
| Password | **new, prod-only Resend API key** (see below — not staging's, which can't be copied once saved anyway) |

**Action for Chris:** generate a new API key in the Resend dashboard
scoped/named for prod (e.g. `recruiting-compass-prod`), paste it into the
Password field above. Keeps prod's outbound email fully independent from
staging's, same isolation principle as the `CRON_SECRET`/
`NUXT_ADMIN_TOKEN_SECRET` split in Task 5.
