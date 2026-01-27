# Recruiting Compass: Product Brief

## Executive Summary

**Recruiting Compass** is a free web platform that helps student-athletes and families navigate the college baseball recruiting process. By organizing schools, coaches, and interactions in one place, combined with AI-powered suggestions and data-driven fit scores, it eliminates chaos from recruiting and helps families make informed decisions.

**Market Opportunity:** 50,000+ US families annually enter college baseball recruiting (ages 14-18). Current solutions are fragmented (spreadsheets, emails, text threads). Recruiting Compass captures this market with a free MVP, converting to a freemium model.

**Target Launch:** Q1/Q2 2026
**MVP Feature Set:** 8 core features (timeline, schools, coaches, interactions, fit scores, suggestions, parent view, performance tracking)
**Competitive Advantage:** AI suggestions + intuitive design for non-technical users (families)

---

## Problem & Opportunity

### The Problem

Families navigating college baseball recruiting face three critical challenges:

1. **Information Chaos**
   - Schools tracked in spreadsheets, emails, text threads, and notebooks
   - No centralized location for coach contact info, communication history, or deadlines
   - Easy to miss follow-ups or key recruiting deadlines
   - Parents and athletes operate in silos (miscommunication)

2. **Timeline Uncertainty**
   - Recruiting spans 4 years (freshman to senior); families don't know what to focus on when
   - No roadmap for phase-appropriate tasks
   - Missed recruiting windows (showcases, official visits, recruiting periods)
   - Families make reactive vs. proactive decisions

3. **Decision Complexity**
   - Overwhelming number of schools to evaluate (1,000+ colleges with baseball)
   - No systematic way to compare fit (academic, athletic, financial, personal)
   - Hidden signals in coach responsiveness, program quality, scholarship availability
   - High-stakes decision made with incomplete information

### The Opportunity

- **Market Size**: 50,000+ families annually enter college recruiting (ages 14-18, baseball segment of larger recruiting market)
- **TAM (Total Addressable Market)**: $25M+ (college recruiting SaaS for families)
- **Current Solution**: Fragmented (Spreadsheets, email, text) or spreadsheet-only platforms (ClassPlus, Hudl)—no integrated family-first solution
- **Willingness to Pay**: Families already pay $2-5K for showcase fees, camps, private coaching; willing to pay $5-20/month for recruiting organization tool

### Why Recruiting Compass Wins

1. **Family-Centric Design**: Built for non-technical families (athletes + parents), not just coaches or scouts
2. **AI-Powered Insights**: Suggestions, fit scores, recovery plans—not just data storage
3. **Free MVP**: Lower barrier to entry; faster user acquisition and viral growth
4. **Comprehensive Feature Set**: One tool replaces spreadsheets, email threads, and separate apps

---

## Solution Architecture

### Core User Workflow

```
Athlete Signs Up
    ↓
Creates Profile (academic, athletic, preferences)
    ↓
Adds Target Schools (10-20 schools across tiers)
    ↓
Tracks Coaches (contact, responsiveness, interactions)
    ↓
Logs Interactions (email, call, visit, event attendance)
    ↓
Reviews Timeline (phase-appropriate tasks and milestones)
    ↓
Invites Parent (optional, for collaboration)
    ↓
Gets AI Suggestions (next steps, follow-ups, new schools)
    ↓
Makes Informed Decisions (fit scores, coach responsiveness, program fit)
```

### Three-Layer Architecture

**Layer 1: Client (Vue 3 + Nuxt)**
- Responsive web app (desktop, tablet, mobile)
- Real-time updates
- Offline support (PWA)

**Layer 2: API (Nitro)**
- REST endpoints for schools, coaches, interactions, timeline
- AI suggestion engine (LLM-powered)
- Fit score calculation algorithm

**Layer 3: Backend (Supabase PostgreSQL)**
- User accounts (auth + RLS)
- Schools, coaches, interactions data
- Timeline tasks, events, documents
- Analytics and metrics

---

## Feature Set Overview

### MVP (8 Core Features)

| Feature | Benefit | User Type |
|---------|---------|-----------|
| **Schools Dashboard** | Track all target colleges in one place | Both |
| **Coach Management** | Organize contact info, responsiveness, history | Both |
| **Interaction Logging** | Record all communication with coaches | Athlete |
| **Timeline (4-Year Roadmap)** | Phase-appropriate tasks and milestones | Both |
| **Fit Score** | Data-driven school matching (1-10 scale) | Both |
| **AI Suggestions** | Smart next steps and recommendations | Athlete |
| **Parent Collaboration** | Link parent account, shared visibility | Both |
| **Performance Tracking** | Stats, metrics, analytics dashboard | Athlete |

### Future Releases (Post-MVP)

**Phase 2:**
- Email templates (pre-written recruiting emails)
- Document management (film, transcripts, recruiting surveys)
- Event calendar (showcases, tournaments, visits)
- Email integration (auto-log received emails from coaches)

**Phase 3:**
- Offer tracking (scholarship offers, terms, comparison)
- Video tutorials (in-app guides)
- School comparison tool (side-by-side evaluation)
- Advanced analytics (recruiting trends, coach movement)

---

## User Workflow Examples

### Example 1: New Athlete (Freshman)

1. **Signs up**, creates account, completes profile (5 min)
2. **Adds target schools** (10-15 schools, 20 min)
3. **Tracks coaches** at each school (30 min)
4. **Logs past interactions** (2-3 emails, showcases) (15 min)
5. **Reviews timeline** for freshman-year tasks: Skill development, getting on coaches' radars (5 min)
6. **Invites parent** for shared visibility (2 min)
7. **Gets AI suggestions**: "Attend 2+ summer showcases," "Email 3 coaches within 100 miles" (reading, 5 min)

**Total onboarding time: ~80 minutes for full setup**

### Example 2: Parent Supporting Athlete (Junior Year)

1. **Athlete sends invite** to parent email
2. **Parent clicks link**, verifies email, sees dashboard
3. **Parent can:**
   - View all schools, coaches, interactions (read-only)
   - See timeline progress (current phase, upcoming milestones)
   - Review performance metrics and fit scores
   - Get notifications on important updates
4. **Parent can comment** on athlete's interactions (optional family discussion)
5. **Parent cannot edit** athlete's data (athlete stays in control)

**Total parent setup time: ~5 minutes (just acceptance)**

### Example 3: Tracking Coach Responsiveness (Senior Year)

1. **Athlete logs interaction** with Coach Smith (sent email, got response in 2 days)
2. **System records** response time automatically
3. **Responsiveness score** for Coach Smith updates (High)
4. **AI suggests**: "Coach Smith is engaged. Plan campus visit this month."
5. **30 days later**, no follow-up from Coach Smith
6. **AI suggests recovery plan**: "Follow up with Coach Smith—mention specific interest in program" (timing, angle)

**Result:** Athlete maintains relationships, doesn't miss opportunities due to miscommunication.

---

## Technical Stack Highlights

### Why This Stack Works

| Component | Choice | Reason |
|-----------|--------|--------|
| **Frontend** | Vue 3 + Nuxt | Type-safe, fast, ideal for real-time apps |
| **Backend API** | Nitro | Lightweight, auto-routed, built for Nuxt |
| **Database** | Supabase PostgreSQL | Managed, RLS for security, real-time updates |
| **Auth** | Supabase Auth | JWT-based, secure, integrated with RLS |
| **AI/LLM** | OpenAI API | Suggestions, fit score explanations, templates |
| **Deployment** | Netlify (frontend), Supabase (backend) | Fast, free tier, automatic deploys |

### Security & Privacy

- **Row-Level Security (RLS)**: Athletes can only see their own data
- **Encrypted Passwords**: Supabase handles auth securely
- **No Coach Tracking**: We don't contact coaches on behalf of athletes
- **Data Ownership**: Athletes own their data; can export anytime
- **HIPAA/FERPA Ready**: No sensitive student records; recruiter data only

---

## Roadmap & Vision

### MVP (Q1/Q2 2026)
- 8 core features
- Free tier
- 1,000+ users (organic + early marketing)
- Mobile-responsive web app

### Version 1.1 (Q3 2026)
- Email templates
- Document management
- Event calendar
- Video tutorials
- 5,000+ users

### Version 2.0 (Q4 2026 - Q1 2027)
- Offer tracking
- Advanced analytics
- School comparison tool
- Freemium pricing ($5-10/month for premium features)
- 50,000+ users (target)

### Vision (Year 2+)
- Mobile apps (iOS/Android)
- Integration with Hudl, Nike SPARQ (athletic data sources)
- Coach outreach automation (optional: let athletes/families control messaging)
- College recruiting intelligence for coaches (B2B feature)
- International recruiting (Canada, Japan, etc.)

---

## Success Metrics

### User Acquisition
- Week 1: 100 signups (friends, family, launch network)
- Month 1: 1,000 signups (Product Hunt, social, referral)
- Month 3: 5,000 signups (organic + paid ads)

### Engagement
- 60%+ onboarding completion rate (athletes add 5+ schools, log interactions)
- 40%+ weekly active users (return to app at least once/week)
- 70%+ parent invitation rate (athletes invite parent)

### Revenue (Post-MVP)
- Freemium conversion: 5-10% of free users → paid tier
- $2,000/month MRR by end of year 1
- $20,000/month MRR by end of year 2

### Retention
- Month 1 retention: 40% (most users onboard then pause)
- Month 3 retention: 25% (active cohort for rest of season)
- Month 6 retention: 80% (seasonal pattern—busy in spring/summer)

---

## Business Model

### MVP (Free)
- 100% free access to all 8 core features
- Revenue: None (focus on user growth)
- Goal: 5,000-10,000 users by end of 2026

### Freemium (v1.1+)
- **Free Tier**: Schools, coaches, interactions, timeline, basic suggestions
- **Premium Tier** ($5-10/month):
  - Advanced AI suggestions
  - Email templates
  - Document storage (film, transcripts)
  - Priority support
  - Analytics dashboard
  - School comparison tool
  - Ad-free experience
- **Family Plan** ($12-15/month): Unlimited parent/guardian accounts linked

### Potential B2B Opportunities
- **Schools/Coaches**: Recruiting intelligence dashboard (future)
- **Club Programs**: Bulk accounts for teams
- **Advisors/Consultants**: Co-branded white-label version

---

## Go-to-Market Strategy (MVP)

### Phase 1: Organic Launch (Week 1-2)
- Product Hunt launch
- Social media (Twitter, Instagram, TikTok)
- Reddit communities (r/baseball, r/recruiting)
- Email newsletter signup
- Influencer outreach (YouTube baseball trainers)

### Phase 2: Referral & Community (Week 3-8)
- Athlete referral rewards (e.g., "Refer a friend, unlock premium feature")
- High school partnerships (coaches recommend to athletes)
- Showcase/tournament presence (booths at AAU events)
- Email drip campaign to signups

### Phase 3: Paid Acquisition (Month 2-3)
- Google Ads (keywords: "college recruiting tracker," "recruit tracker app")
- Facebook/Instagram ads (targeting parents of baseball players)
- YouTube ads (sports/recruiting content)

### Phase 4: B2B Partnerships (Month 3+)
- High school baseball programs (bulk signup for teams)
- Club organizations (AABC, PG, 2one8, etc.)
- Showcase organizers (team rosters, recruiting info)

---

## Competitive Landscape

### Current Competitors

| Competitor | Type | Strengths | Weaknesses |
|-----------|------|-----------|-----------|
| **Spreadsheet** | DIY | Free, flexible | Fragmented, hard to share |
| **ClassPlus** | Team platform | Coach tools, team rosters | Expensive, not family-first |
| **Hudl** | Sports platform | Film hosting, analytics | Expensive, not recruiting-focused |
| **Google Sheets** | Docs | Accessible, free | No intelligence, hard to maintain |

### Why Recruiting Compass Wins

1. **Free MVP** (lower barrier)
2. **Family-first** (designed for athletes + parents, not coaches)
3. **AI-powered** (suggestions, fit scores, insights)
4. **Integrated** (one tool, not multiple apps)
5. **Better UX** (non-technical families can use it)

---

## Ask

We're seeking support in three areas:

### 1. Investment/Funding
- Seed round: $50-100K for year 1 operations
- Use: Engineering (1 hire), marketing ($1-2K/month), server costs, tools
- Return: Growth to 50,000+ users, freemium conversion to $20K MRR

### 2. Strategic Partnerships
- **High School Partnerships**: Coaches recommend to student-athletes
- **Showcase Organizers**: Integrate with tournament rosters
- **Recruiting Influencers**: Testimonials, social endorsements

### 3. Expertise & Mentorship
- College recruiting domain knowledge
- B2B SaaS go-to-market strategy
- Athlete/parent feedback on feature roadmap

---

## Contact & Demo

**Product URL:** [recruitingcompass.com](https://recruitingcompass.com)
**Email:** chris@recruitingcompass.com
**Demo Video:** [YouTube Link - Coming Soon]
**Deck:** [PDF - Coming Soon]

**Interested in a personalized demo?** [Schedule 30-min call](https://calendly.com/chris-recruiting-compass)

---

## Appendix

### A. User Personas

**Persona 1: Sarah (14-Year-Old Athlete)**
- High school freshman, competitive baseball (travel team)
- GPA: 3.7, athletic ability: 85/100
- Tech-savvy, comfortable with apps
- Goal: Find D1/D2 schools that want her; get scholarship
- Pain: Overwhelmed by options; loses track of coach emails

**Persona 2: Maria (Parent of Athlete)**
- College-educated, works full-time
- Not tech-savvy; prefers phone calls/emails
- Goal: Support daughter in recruiting; ensure she doesn't miss opportunities
- Pain: Unclear timeline; can't keep up with recruiting process

**Persona 3: Coach Dave (College Coach)**
- Recruits 15-20 athletes annually
- Uses various tools (email, spreadsheets, CRM)
- Goal: Find good fits for his program
- Future: May use our intelligence dashboard (post-MVP)

### B. Key Product Decisions

**Why Free MVP?**
- Lower barrier to entry (more signups faster)
- Viral growth potential (athletes refer friends)
- Build user trust early
- Gather data for freemium conversion

**Why Freemium (not SaaS)?**
- College recruiting is seasonal (busy spring/summer, quiet fall/winter)
- Freemium captures seasonal users + converts engaged ones
- Lower churn risk than pure subscription

**Why Web (not Mobile First)?**
- MVP ships faster (Nuxt handles web + mobile-responsive)
- Desktop UX better for data entry and comparison
- Mobile app later (Phase 2) if demand justifies

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Ready for Stakeholder Review
