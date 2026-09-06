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

## SMTP / Email Templates — outstanding

Not yet captured. Chris to paste from Supabase Dashboard → staging
project → Authentication → Email Templates (SMTP host/port/sender +
which template subject lines are customized vs default), or set directly
on prod Auth once looked up.
