# Deployment

Read when deploying or changing build/runtime config.

- **Full Vercel topology, env model, ops + gotchas**: `docs/deployment/vercel-runbook.md` (read first for anything project/domain/env-var related)
- **Host**: Vercel — ONE project per app (`recruiting-compass-web`). Production from `main`; QA/Preview auto-deploys from `develop` → qa.myrecruitingcompass.com. Never make a 2nd project for the same repo.
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)
