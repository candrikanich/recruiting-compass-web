# Baseball Recruiting Tracker MVP Documentation Plan

## Overview

Create comprehensive documentation for the Baseball Recruiting Tracker MVP to support:
- **Users** (families with student-athletes): Non-technical user guides and tutorials
- **Stakeholders** (investors, partners): Pitch materials and business case
- **Developers** (contributors): Enhanced technical documentation with visual diagrams
- **Marketing** (user acquisition): Landing page copy, social content, promotional materials

**Timeline:** 4 weeks aligned with 1-2 month MVP launch
**Target:** Free MVP to validate market with families navigating college baseball recruiting

---

## Current State

### Strengths
- Excellent developer onboarding (README.md, CLAUDE.md)
- Comprehensive testing documentation
- Feature-rich, production-ready application

### Critical Gaps
- **Zero user-facing documentation** (no guides, FAQ, help system)
- No stakeholder pitch materials
- No marketing copy or promotional content
- Missing visual diagrams (architecture, flows, journeys)

---

## Documentation Strategy by Audience

### 1. USER DOCUMENTATION (Highest Priority)

**Target:** Non-technical families (athletes ages 14-18 + parents)

#### Week 1 Deliverables

**Quick Start Guide** (`/documentation/user/QUICK_START_GUIDE.md`)
- Account creation walkthrough (athlete vs parent roles)
- First 15 minutes: Profile setup, add first school, add first coach
- Key concepts glossary (timeline phases, fit scores, interaction logging)
- Navigation overview with screenshots
- 5-10 pages, heavily annotated with screenshots

**Glossary** (`/documentation/user/GLOSSARY.md`)
- Alphabetical list of recruiting and app-specific terms
- Examples: Fit Score, Timeline Phase, Interest Calibration, Recovery Plan, Priority Tier
- Simple definitions with context

**Capture 20 Core Screenshots**
- Dashboard (athlete + parent views)
- School list, school detail
- Coach list, coach detail
- Add interaction modal
- Timeline view
- Settings pages

#### Week 2 Deliverables

**User Manual** (`/documentation/user/USER_MANUAL.md`)
- Comprehensive 30-40 page guide covering:
  1. Introduction & Account Management
  2. Core Features (dashboard, schools, coaches, interactions, timeline, events, performance, documents, offers)
  3. Advanced Features (fit scores, AI suggestions, templates, analytics)
  4. Best Practices (weekly routines, monthly reviews, staying organized)
  5. Troubleshooting & FAQ
- Annotated screenshots throughout
- Step-by-step workflows

**FAQ Document** (`/documentation/user/FAQ.md`)
- Sections: Getting Started, Account & Billing, Core Features, Scores & Metrics, Parent Collaboration, Privacy, Technical Issues, Feature Requests
- 30-40 common questions with clear answers

**Capture Remaining Screenshots** (20-30 more)
- All remaining pages and modals
- Total: 40-50 annotated screenshots

#### Week 3 Deliverables

**Video Tutorials** (`/documentation/user/videos/`)
- 8-10 videos, 2-5 minutes each
- Topics:
  1. Getting Started (3 min)
  2. Adding Your First School (2 min)
  3. Logging Coach Interactions (3 min)
  4. Understanding Your Timeline (4 min)
  5. Using Email Templates (2 min)
  6. Parent View & Account Linking (3 min)
  7. Tracking Performance Metrics (2 min)
  8. Understanding Fit Scores (4 min)
  9. Event Management (2 min)
  10. Using AI Suggestions (3 min)
- Tool: Loom for screen + webcam recording
- Host: YouTube (embed in app)

**In-App Help System**
- Create components: `/components/Help/TooltipGuide.vue`, `/components/Help/HelpIcon.vue`
- Add contextual tooltips to:
  - Timeline phases (explain current phase + next steps)
  - Fit scores (click to expand scoring breakdown)
  - Interest calibration (explain 6-question rubric)
  - Task dependencies (why tasks are locked)
  - Dashboard widgets (what each metric means)
- Implementation: Hover tooltips + "?" icon links to user manual sections

---

### 2. STAKEHOLDER DOCUMENTATION (Highest Priority)

**Target:** Investors, advisors, coaches, high school counselors

#### Week 1 Deliverables

**Pitch Deck** (`/documentation/stakeholder/PITCH_DECK.pptx` + `.pdf`)
- 15-20 slides covering:
  1. Cover (logo + tagline)
  2. Problem Statement (recruiting chaos for families)
  3. Market Size (college recruiting TAM, baseball segment)
  4. Solution Overview
  5. Product Demo (screenshot tour)
  6. Key Features (Timeline, Fit Score, AI, Parent View)
  7. User Personas
  8. Competitive Landscape
  9. Business Model (free MVP → freemium)
  10. Go-to-Market Strategy
  11. Roadmap (MVP → Year 1 → Year 2)
  12. Team & Advisors
  13. Traction (beta users, testimonials if available)
  14. Ask (investment, partnerships, pilot schools)
  15. Contact & Demo
- Tool: Canva or PowerPoint
- Export to PDF for sharing

**Product Brief** (`/documentation/stakeholder/PRODUCT_BRIEF.md`)
- 6-8 pages covering:
  - Executive Summary (1 page)
  - Problem & Opportunity
  - Solution Architecture
  - Feature Set Overview
  - User Workflow Examples
  - Technical Stack Highlights
  - Security & Privacy
  - Roadmap & Vision
  - Success Metrics

**One-Pager** (`/documentation/stakeholder/ONE_PAGER.pdf`)
- Single landscape page with:
  - Logo + tagline
  - Problem (3 bullets)
  - Solution (3 bullets)
  - Key features (icons + descriptions)
  - Target users
  - Business model
  - Contact + demo link
- Tool: Canva or Figma

---

### 3. DEVELOPER DOCUMENTATION (Medium Priority)

**Target:** Technical contributors, future hires, open-source community

#### Week 2 Deliverables

**Database Schema Documentation** (`/documentation/technical/DATABASE_SCHEMA.md`)
- Entity-Relationship Diagram (Mermaid.js or dbdiagram.io)
- Table definitions for:
  - users, schools, coaches, interactions
  - timeline_tasks, suggestions
  - events, performance_metrics, documents, offers
  - account_links (parent-player)
- Indexes, constraints, foreign keys
- Row-Level Security (RLS) policies

**API Reference** (`/documentation/technical/API_REFERENCE.md`)
- OpenAPI-style documentation for each endpoint:
  - `/api/schools` (GET, POST, PATCH, DELETE)
  - `/api/coaches` (GET, POST, PATCH, DELETE)
  - `/api/interactions` (GET, POST, PATCH, DELETE)
  - `/api/athlete/phase/advance` (POST)
  - `/api/suggestions` (GET)
  - `/api/schools/[id]/fit-score` (GET)
  - `/api/timeline/tasks` (GET, PATCH)
  - `/api/user/preferences` (GET, PATCH)
- For each: URL, method, description, request/response schemas, examples, error codes

**User Journey Maps** (`/documentation/technical/diagrams/`)
- 3 diagrams (Mermaid.js):
  1. New athlete onboarding journey
  2. Parent account linking flow
  3. School research to offer journey

#### Week 3 Deliverables

**Architecture Diagrams** (`/documentation/technical/ARCHITECTURE_OVERVIEW.md`)
- 4 diagrams (Mermaid.js):
  1. System Architecture (Client → Server → Supabase)
  2. Data Flow (User action → API → DB → UI update)
  3. Component Hierarchy (Pages → Composables → Stores)
  4. Authentication Flow (Login → JWT → Protected routes)

**Feature Flow Diagrams** (`/documentation/technical/DATA_FLOW_DIAGRAMS.md`)
- 5 diagrams (Mermaid.js):
  1. Timeline phase advancement logic
  2. Fit score calculation algorithm
  3. AI suggestion engine workflow
  4. Interest calibration process
  5. Recovery plan trigger conditions

**Contributing Guide** (`/CONTRIBUTING.md`)
- Code of Conduct
- Development setup
- Branch naming conventions
- Commit message format (conventional commits)
- Testing requirements (unit + E2E)
- PR process and code review checklist
- Issue templates

---

### 4. MARKETING DOCUMENTATION (High Priority)

**Target:** Prospective users, social media audiences, press

#### Week 1 Deliverables

**Landing Page Copy** (`/documentation/marketing/LANDING_PAGE_COPY.md`)
- Hero headline + subheadline
- Value propositions (3 bullets)
- Feature showcase (6 features with descriptions)
- Social proof (testimonials if available)
- CTA (Sign up for free)
- FAQ section
- Footer (privacy, terms, contact)

**Sample Copy:**
```
Headline: Navigate Your College Recruiting Journey with Confidence
Subheadline: The all-in-one platform for student-athletes and families to organize schools, track coach interactions, and stay on top of recruiting milestones.

Value Props:
- Stay Organized: Track schools, coaches, and interactions in one place
- Never Miss a Step: Follow a proven 4-year timeline with task reminders
- Make Smart Decisions: Understand school fit with data-driven insights
```

#### Week 2 Deliverables

**Feature Highlight Pages** (`/documentation/marketing/`)
- 4 feature pages:
  - `FEATURE_TIMELINE.md` (4-year recruiting roadmap)
  - `FEATURE_FIT_SCORE.md` (data-driven school matching)
  - `FEATURE_PARENT_VIEW.md` (family collaboration)
  - `FEATURE_AI_SUGGESTIONS.md` (smart recommendations)
- Each page:
  - Feature overview (2-3 sentences)
  - Key benefits (3 bullets)
  - How it works (step-by-step)
  - Screenshot or diagram
  - User testimonial (if available)
  - CTA

**Email Templates** (`/documentation/marketing/`)
- `EMAIL_WELCOME.md` - Immediate after signup
- `EMAIL_ONBOARDING_SERIES.md` - 5 emails over 2 weeks:
  1. Welcome + Quick Start (Day 0)
  2. Add Your First School (Day 2)
  3. Timeline System Overview (Day 4)
  4. Invite a Parent (Day 7)
  5. Pro Tips & Resources (Day 14)
- `EMAIL_TIPS_NEWSLETTER.md` - Weekly recruiting tips template

#### Week 3 Deliverables

**Blog Post Templates** (`/documentation/marketing/`)
- `BLOG_ANNOUNCEMENT_POST.md` - "Announcing Recruiting Compass: Your Free College Recruiting Assistant"
- `BLOG_HOW_TO_POST.md` - "How to Organize Your Target School List in 10 Minutes"
- `BLOG_RECRUITING_TIPS.md` - "5 Mistakes Parents Make in College Recruiting (And How to Avoid Them)"

**Social Media Content** (`/documentation/marketing/SOCIAL_MEDIA_CONTENT.md`)
- Content plan for Twitter, Instagram, Facebook, LinkedIn
- Types: Launch announcement, feature spotlights, user tips, testimonials, recruiting advice
- 3-5 posts per week for first month
- Hashtag strategy and posting schedule

---

## Implementation Roadmap

### Week 1: MVP Essentials (Critical for Launch)
- [ ] Quick Start Guide (user)
- [ ] Glossary (user)
- [ ] Pitch Deck (stakeholder)
- [ ] Product Brief (stakeholder)
- [ ] One-Pager (stakeholder)
- [ ] Landing Page Copy (marketing)
- [ ] Capture 20 core screenshots

**Deliverables:** 6 documents + pitch deck + 20 screenshots

### Week 2: Comprehensive User & Marketing Docs
- [ ] User Manual (30-40 pages)
- [ ] FAQ Document
- [ ] Email Templates (marketing)
- [ ] Feature Highlight Pages (4 pages)
- [ ] Database Schema Documentation
- [ ] API Reference (start)
- [ ] Capture remaining 20-30 screenshots
- [ ] Create 3 user journey maps

**Deliverables:** 10+ documents + 50 total screenshots + 3 diagrams

### Week 3: Videos & Developer Enhancements
- [ ] Record 8-10 video tutorials
- [ ] In-app help system (tooltips + help icons)
- [ ] Architecture diagrams (4 diagrams)
- [ ] Feature flow diagrams (5 diagrams)
- [ ] API Reference (complete)
- [ ] Contributing Guide
- [ ] Social Media Content Plan
- [ ] Blog Post Templates

**Deliverables:** 10 videos + in-app help + 9 diagrams + 5+ documents

### Week 4: Polish & Distribution (Optional)
- [ ] Review all documentation for consistency
- [ ] Add missing screenshots
- [ ] Table of contents for user manual
- [ ] Documentation website (Docusaurus/VitePress - optional)
- [ ] SEO optimization for landing page
- [ ] Submit to product directories (Product Hunt, BetaList)
- [ ] Prepare press kit

---

## Directory Structure

```
/documentation
  /user
    QUICK_START_GUIDE.md
    USER_MANUAL.md
    FAQ.md
    GLOSSARY.md
    /screenshots          # 40-50 annotated images
    /videos              # 8-10 tutorial videos
  /stakeholder
    PITCH_DECK.pptx      # Source file
    PITCH_DECK.pdf       # Export for sharing
    PRODUCT_BRIEF.md
    ONE_PAGER.pdf
  /technical
    ARCHITECTURE_OVERVIEW.md
    DATA_FLOW_DIAGRAMS.md
    DATABASE_SCHEMA.md
    API_REFERENCE.md
    /diagrams            # 10+ Mermaid.js diagrams
  /marketing
    LANDING_PAGE_COPY.md
    FEATURE_TIMELINE.md
    FEATURE_FIT_SCORE.md
    FEATURE_PARENT_VIEW.md
    FEATURE_AI_SUGGESTIONS.md
    EMAIL_WELCOME.md
    EMAIL_ONBOARDING_SERIES.md
    EMAIL_TIPS_NEWSLETTER.md
    SOCIAL_MEDIA_CONTENT.md
    BLOG_ANNOUNCEMENT_POST.md
    BLOG_HOW_TO_POST.md
    BLOG_RECRUITING_TIPS.md
```

---

## Recommended Tools

### Documentation Writing
- **Markdown Editor:** VS Code with Markdown Preview
- **Screenshot Tool:** macOS built-in (Cmd+Shift+4) or Cleanshot X
- **Annotation:** Preview (macOS), Snagit, or Figma
- **Video Recording:** Loom (screen + webcam)
- **Diagrams:** Mermaid.js (code-based, version-controlled)

### Design
- **Pitch Deck:** Canva (templates) or PowerPoint/Keynote
- **One-Pager:** Canva or Figma
- **Screenshot Editing:** Figma or Photoshop

### Hosting
- **Videos:** YouTube (public, free embedding)
- **Documentation Site (Optional):** Docusaurus or VitePress
- **Images:** Store in `/documentation/user/screenshots/` (Git LFS if large)

---

## Success Metrics

### User Documentation
- 80%+ of new users view Quick Start Guide
- 40% reduction in "how-to" support tickets
- 60%+ onboarding task completion rate
- 70%+ average video watch time

### Stakeholder Documentation
- 20+ demo requests from pitch deck in first month
- 5+ high school/club partnership conversations
- 3+ investor meetings from pitch materials

### Developer Documentation
- New developer productive in <4 hours
- Zero API-related GitHub issues in first month
- 2+ external contributions in first quarter

### Marketing Documentation
- 5%+ signup conversion rate from landing page
- 40%+ email open rate on welcome email
- 100+ social media engagements on launch week
- 500+ monthly blog visitors

---

## Verification & Testing

### Pre-Launch Checklist
- [ ] All Week 1-2 documentation complete
- [ ] Screenshots captured and annotated
- [ ] Pitch deck reviewed by advisor/mentor
- [ ] Landing page copy integrated into `/pages/index.vue`
- [ ] User manual proofread for clarity
- [ ] FAQ covers top 20 anticipated questions
- [ ] At least 5 videos recorded and uploaded

### Post-Launch Monitoring
- Track documentation page views (Google Analytics)
- Monitor support ticket themes (identify doc gaps)
- Collect user feedback on documentation clarity
- A/B test landing page copy variations
- Measure video engagement metrics

---

## Approved Assumptions

1. **Video Production**: DIY with Loom (faster iteration)
2. **Screenshot Data**: Use staged/demo data (privacy + consistency)
3. **Documentation Hosting**: Embed in app initially (single source of truth)
4. **Pitch Deck Format**: PDF export from Canva (no PPT source needed)
5. **Launch Priority**: User docs + marketing parallel (both needed for MVP launch)

---

**Plan Status:** APPROVED
**Estimated Effort:** 60-80 hours over 4 weeks
**Priority:** High (blocks MVP launch without user docs + marketing materials)
