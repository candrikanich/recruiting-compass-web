# MVP Audit Workflow Design

**Date:** February 2, 2026
**Status:** Approved
**Scope:** Dashboard, Coaches, Schools, Interactions pages

## Overview

Comprehensive audit of performance, accessibility, SEO, and code quality across the 4 MVP pages. Balanced approach to identify MVP deficiencies across all categories.

## Architecture

### Phase 1: Baseline Capture Against Vercel Live Deployment

- **Environment:** https://recruiting-compass-web-a9wx.vercel.app (production)
- **Purpose:** Validate Vercel deployment + establish visual baseline
- **Pages:** Dashboard, Coaches, Schools, Interactions
- **Breakpoints:**
  - Desktop: 1920×1080
  - Tablet: 768×1024
  - Mobile: 375×667
- **Output:** `/planning/audits/baseline-YYYY-MM-DD/` with screenshots and metadata
- **Duration:** ~10 minutes

### Phase 2: Parallel Audits (4 Agents)

Run simultaneously against Vercel deployment:

**1. Performance Agent**

- Bundle size analysis
- Core Web Vitals (LCP, FID, CLS)
- Lighthouse performance score
- Build optimization opportunities
- Network waterfall analysis

**2. Accessibility Agent**

- WCAG 2.1 AA compliance scan
- Keyboard navigation testing
- Screen reader compatibility check
- Color contrast validation
- Form accessibility, ARIA labels

**3. SEO Agent**

- Meta tags (title, description, viewport)
- Open Graph / social sharing
- Structured data (Schema.org)
- Sitemap coverage
- Heading hierarchy
- Alt text for images

**4. Code Quality Agent**

- TypeScript strict mode errors
- ESLint rule violations
- Test coverage analysis
- Dead code detection
- Technical debt assessment
- Import/export organization

**5. Rebranding Task (Independent)**

- Remove all "baseball recruiting tracker" references
- Update to "The Recruiting Compass"
- Focus on: package.json, README, CLAUDE.md, component docs, comments
- Can run in parallel without blocking audits

### Phase 3: Visual Verification Post-Fixes

- Build and deploy fixes to Vercel
- Re-capture screenshots at same 3 breakpoints
- Side-by-side comparison with baselines
- Document any intentional visual changes
- Verify no regressions introduced

### Phase 4: Documentation & Skill Creation

**Documentation:**

- Update `/CLAUDE.md` with audit findings and fixes applied
- Create audit report: `/planning/audits/report-YYYY-MM-DD.md`
- Summary of improvements by category (perf, a11y, SEO, code quality)

**Skill Creation:**

- Create `/Users/chrisandrikanich/.claude/plugins/audit-workflow` skill
- Makes this entire workflow repeatable and standardized
- Includes: page selection, agent dispatch, baseline capture, comparison, reporting

## Success Criteria

- [ ] Baseline screenshots captured and stored
- [ ] All 4 audit agents complete without blockers
- [ ] Rebranding task completed
- [ ] Fixes deployed to Vercel
- [ ] Post-fix screenshots show no visual regressions
- [ ] CLAUDE.md updated with findings
- [ ] Audit report generated
- [ ] Reusable skill created and tested

## Dependencies

- Vercel deployment must be accessible
- Node.js dev environment for building/testing
- Browser automation for screenshots (Playwright)

## Timeline

- Phase 1 (Baseline): ~10 min
- Phase 2 (Parallel Audits): ~30-45 min (parallel = 1 agent @ ~45 min)
- Phase 3 (Verification): ~10-15 min
- Phase 4 (Documentation & Skill): ~20-30 min
- **Total: ~1.5-2 hours**
