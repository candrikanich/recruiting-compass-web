# Deployment

Read when deploying or changing build/runtime config.

- **Host**: Vercel (production from `main` branch; QA auto-deploys from `develop`)
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)
