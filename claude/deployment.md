# Deployment

Read when deploying or changing build/runtime config.

- **Full Vercel topology, env model, ops + gotchas**: `docs/deployment/vercel-runbook.md` (read first for anything project/domain/env-var related)
- **Host**: Vercel — ONE project per app (`recruiting-compass-web`). Production from `main`; QA/Preview auto-deploys from `develop` → qa.myrecruitingcompass.com. Never make a 2nd project for the same repo.
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)

## Blocking Before Production: `EMAIL_LEGAL_ADDRESS`

The branded email footer (`server/utils/emailTemplates.ts`) requires a real physical mailing address for CAN-SPAM compliance. `EMAIL_LEGAL_ADDRESS` must be set to the real address on Vercel Production before any of the 6 app-sent emails (invite, digest, deadline, nudge, notification, feedback ack) go live — see `docs/superpowers/specs/2026-09-13-trc-email-design-system-design.md`. Unset, it falls back to a placeholder ("The Recruiting Compass") which is not compliant.
