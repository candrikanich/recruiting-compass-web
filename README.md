# The Recruiting Compass - Web Application

The web application for managing high school athlete recruiting interactions, built with **Nuxt 3**, **Vue 3**, **TypeScript**, **TailwindCSS**, and **Supabase**.

## Quick Start

### Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm** (bundled with Node.js)
- **Supabase account** (free tier available at supabase.com)
- **College Scorecard API key** (free from <https://api.data.gov/signup/>)

### Installation

```bash
# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local

# Add your API keys to .env.local (see Environment Variables section)
```

### Development Server

```bash
# Start dev server (hot reload enabled)
npm run dev

# Open http://localhost:3000 in your browser
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Environment Variables

Create a `.env.local` file in the `/web` directory with the following:

```env
# Supabase Configuration (required)
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# College Scorecard API (required for college auto-complete)
NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY=your_api_key_here

# Optional: Development/testing
NUXT_PUBLIC_DEBUG_MODE=false
```

**Important:** Do NOT commit `.env.local` to Git. It contains secrets.

See `.env.example` for all available configuration options.

## Project Structure

```
web/
├── app.vue                 # Root component
├── nuxt.config.cjs         # Nuxt configuration
├── tailwind.config.js      # TailwindCSS configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Web dependencies
│
├── pages/                  # File-based routes
│   ├── index.vue           # Dashboard home
│   ├── login.vue           # Authentication
│   ├── coaches/
│   ├── schools/
│   ├── interactions/
│   ├── events/
│   ├── performance/
│   ├── documents/
│   ├── reports/
│   ├── settings/
│   └── [other pages...]
│
├── components/             # Reusable Vue components
│   ├── DesignSystem/       # Base UI components (Button, Input, Card, etc.)
│   ├── School/             # School-related components
│   ├── Coach/              # Coach-related components
│   ├── Interaction/        # Interaction logging
│   ├── Performance/        # Performance metrics
│   ├── Dashboard/          # Dashboard widgets
│   └── [other components...]
│
├── composables/            # Vue 3 composables (reusable logic)
│   ├── useSchools.ts       # School data management
│   ├── useCoaches.ts       # Coach data management
│   ├── useAuth.ts          # Authentication
│   ├── useSupabase.ts      # Supabase client setup
│   └── [other composables...]
│
├── stores/                 # Pinia stores (state management)
│   ├── user.ts             # User state
│   └── notifications.ts    # Notification queue
│
├── server/                 # Nitro API routes (backend)
│   ├── api/                # API endpoints
│   ├── middleware/         # Server middleware (CSRF, rate-limit)
│   └── utils/              # Server utilities
│
├── types/                  # TypeScript type definitions
│   ├── models.ts           # Database models
│   ├── api.ts              # API response types
│   └── [other types...]
│
├── utils/                  # Utility functions
│   ├── validators.ts       # Input validation
│   ├── formatters.ts       # Data formatting
│   ├── exportHelpers.ts    # Export functionality
│   └── [other utilities...]
│
├── assets/                 # Static assets
│   └── styles/             # Global CSS
│       ├── main.css
│       ├── theme.css
│       └── transitions.css
│
├── public/                 # Static files (served at root)
│
├── .nuxt/                  # Generated (dev only)
├── dist/                   # Build output
├── node_modules/           # Dependencies
│
├── .env.example            # Environment template
├── README.md               # This file
└── [config files...]
```

## Available Scripts

| Script               | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start development server (<http://localhost:3000>) |
| `npm run build`      | Build for production                               |
| `npm run preview`    | Preview production build locally                   |
| `npm run type-check` | Check TypeScript types                             |
| `npm run lint`       | Run ESLint                                         |
| `npm run lint:fix`   | Fix ESLint issues automatically                    |

## Technology Stack

### Frontend

- **Nuxt 3** - Vue 3 framework with file-based routing
- **Vue 3** - Progressive UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework

### State Management

- **Pinia** - Lightweight Vue state management

### Backend / API

- **Nitro** - Server engine (auto-API routes in `/server/api`)
- **Supabase** - PostgreSQL backend + Auth + Storage

### Authentication

- **Supabase Auth** - JWT-based authentication
- Middleware: `web/middleware/auth.ts`

### Database

- **PostgreSQL** (via Supabase)
- Migrations in `/database/migrations/`
- Schema: See `/documentation/reference/database-schema.md`

### Data Validation

- **Server-side:** Validators in `server/utils/validation.ts`
- **Client-side:** Composables and utility functions

## Development Workflow

### 1. Adding a New Page

```bash
# Create new page file in /pages
# File structure automatically becomes a route
touch pages/my-feature/index.vue

# Edit the component
# Routes are file-based: pages/my-feature/index.vue → /my-feature
```

### 2. Creating a Reusable Component

```bash
# Add to /components
touch components/MyFeature/MyComponent.vue

# Auto-imported in templates
# <MyFeature:MyComponent /> works without explicit import
```

### 3. Adding a Composable (Reusable Logic)

```bash
# Add to /composables
touch composables/useMyFeature.ts

# Export a function that uses Ref, Computed, onMounted, etc.
# Auto-imported in components with useXxx naming convention
```

### 4. Adding a Server API Route

```bash
# Create in /server/api
touch server/api/my-feature.post.ts

# Export default handler
# URL: POST /api/my-feature
# Accessible via: $fetch('/api/my-feature', { method: 'post', body: {...} })
```

## Code Quality Standards

### TypeScript

- Use strict mode
- Define types for all function parameters and returns
- Use interfaces for data models

### Vue Components

- Use `<script setup>` syntax
- Reactive state with `ref()` and `reactive()`
- Computed properties for derived state
- Lifecycle hooks for side effects

### Styling

- Use TailwindCSS utility classes
- Define custom styles in `assets/styles/`
- Component-scoped styles with `<style scoped>`

### API Calls

- Use `$fetch()` for client-to-server
- Composables for data management
- Error handling with try/catch

See `CLAUDE.md` for full development standards.

## Deployment

### Vercel (Production)

```bash
# Build is automatic on push to main branch
# Repository: https://github.com/candrikanich/recruiting-compass-web
# Build command: npm run build
# Framework: Nuxt 3 (auto-detected)
# Nitro preset: vercel (serverless functions)
```

1. **Automatic Deploy:** Push to `main` → Vercel builds and deploys
2. **Environment Variables:** Set in Vercel project dashboard (Settings → Environment Variables)
3. **Preview Deploys:** Push to feature branch → Vercel creates preview URL
4. **Live URL:** https://recruiting-compass-web-a9wx.vercel.app

**Key Configuration:**

- Nitro preset: `vercel` (generates serverless functions for `/api/**` routes)
- Build output: `.vercel/output/` (contains static assets and serverless functions)
- Runtime: Node.js (server-side API routes)

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

For full test strategy, see `/documentation/testing/`.

## Troubleshooting

### Port 3000 Already in Use

```bash
# Use a different port
npm run dev -- --port 3001
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check types
npm run type-check

# Fix common issues
npm run lint:fix
```

### Supabase Connection Failed

- Verify `.env.local` has correct `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project is active (not paused)
- Ensure RLS policies allow public access (if not authenticated)

## Documentation Links

- **Parent Directory:** [`../README.md`](../README.md)
- **Project Guide:** [`../CLAUDE.md`](../CLAUDE.md)
- **Database Schema:** `/documentation/reference/database-schema.md`
- **API Endpoints:** `/documentation/reference/api-endpoints.md`
- **Component Guide:** `/documentation/guide/component-structure.md`

## Getting Help

- Check error messages in browser console (F12)
- Review type errors: `npm run type-check`
- Search documentation: `/documentation/`
- Review planning docs: `/planning/`

---

**Last Updated:** 2026-02-01
**App Version:** 1.0 (Nuxt 3)
**Deployment:** Vercel
**Repository:** GitHub (https://github.com/candrikanich/recruiting-compass-web)
