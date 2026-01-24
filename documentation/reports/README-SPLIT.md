# Baseball Recruiting Tracker - Web Application

Full-stack web application for tracking college baseball recruiting interactions.

## Quick Start

```bash
# Install dependencies
npm ci

# Development
npm run dev        # Start dev server
npm run build      # Build for production
npm run type-check # TypeScript validation
npm run lint       # ESLint validation
```

## Deployment

This repository is connected to **Netlify** and automatically deploys on push to `main`.

### Environment Variables

Set these in Netlify UI (Settings → Build & Deploy → Environment):

- `NUXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY` - College Scorecard API key

### Manual Deployment

To trigger a rebuild in Netlify UI:

1. Go to Netlify → Site Settings → Build & Deploy
2. Click "Trigger Deploy" → "Deploy Site"

## Documentation

See the [documentation](../documentation/) directory in the main repository for:

- Architecture and design patterns
- API endpoints
- Database schema
- Component structure
- Testing guidelines

## Related Repositories

This is part of the recruiting-compass project. Related repos:

- [recruiting-compass-landing](https://gitlab.com/recruiting-compass/recruiting-compass-landing)
- [recruiting-compass-blog](https://gitlab.com/recruiting-compass/recruiting-compass-blog)
- [recruiting-compass-ios](https://gitlab.com/recruiting-compass/recruiting-compass-ios)
