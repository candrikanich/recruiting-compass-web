# Week 3 Kickoff: Video Tutorials & Developer Documentation

**Status:** Ready to start
**Deliverables:** 8 major components
**Estimated Time:** 25-30 hours

---

## Week 3 Overview

Transform Week 1-2 documentation into interactive video tutorials, in-app help system, and technical diagrams. This week focuses on:

1. **Video Tutorials** (8-10 Loom videos, 2-5 min each)
2. **In-App Help System** (tooltip + help icon components)
3. **Architecture Diagrams** (4 system diagrams)
4. **Feature Flow Diagrams** (5 algorithm/logic diagrams)
5. **Contributing Guide** (developer onboarding)
6. **Social Media Content** (launch week posts)
7. **Blog Post Templates** (3 article templates)

---

## Deliverables Checklist

### 1. Video Tutorials ✅ Ready to Create

**Location:** `/documentation/user/videos/`

**8-10 Videos (2-5 minutes each)**

| #   | Title                         | Duration | Topic                               | Script Ready?  |
| --- | ----------------------------- | -------- | ----------------------------------- | -------------- |
| 1   | Getting Started               | 3 min    | Sign up, profile, first school      | ⏳ Need script |
| 2   | Adding Your First School      | 2 min    | Search, add, set tier               | ⏳ Need script |
| 3   | Logging Coach Interactions    | 3 min    | Add coach, log interaction          | ⏳ Need script |
| 4   | Understanding Your Timeline   | 4 min    | Phases, tasks, progress             | ⏳ Need script |
| 5   | Using Email Templates         | 2 min    | Create, customize, send email       | ⏳ Need script |
| 6   | Parent View & Account Linking | 3 min    | Invite parent, parent dashboard     | ⏳ Need script |
| 7   | Tracking Performance Metrics  | 2 min    | Add stats, view trends              | ⏳ Need script |
| 8   | Understanding Fit Scores      | 4 min    | What are fit scores, how calculated | ⏳ Need script |
| 9   | Event Management              | 2 min    | Create event, log attendance        | ⏳ Need script |
| 10  | Using AI Suggestions          | 3 min    | View suggestions, take action       | ⏳ Need script |

**Process:**

- [ ] Create script for each video
- [ ] Record using Loom (screen + webcam)
- [ ] Upload to YouTube (unlisted or public)
- [ ] Embed in app or docs site
- [ ] Add to User Manual references

**Tool:** Loom
**Format:** Screen recording + webcam in corner
**Style:** Natural, conversational, no scripted feel
**Output:** YouTube link for each video

---

### 2. In-App Help System ✅ Ready to Design

**Location:** `/components/Help/`

**Components to Create:**

```vue
components/Help/ ├── HelpIcon.vue # "?" icon with tooltip trigger ├──
TooltipGuide.vue # Hover tooltip with explanation ├── HelpModal.vue # Full help
modal for deep dives └── helpDefinitions.ts # Centralized help content
```

**Help Content to Add:**

| Page/Feature         | Tooltip Needed | Help Text                         |
| -------------------- | -------------- | --------------------------------- |
| Timeline Phases      | ✅ 4 tooltips  | Current phase + next steps        |
| Fit Scores           | ✅ 2 tooltips  | What is fit score, how calculated |
| Interest Calibration | ✅ 1 tooltip   | 6-question rubric explanation     |
| Task Dependencies    | ✅ 1 tooltip   | Why tasks are locked              |
| Dashboard Widgets    | ✅ 3 tooltips  | What each metric means            |
| Responsiveness Score | ✅ 1 tooltip   | Coach engagement metric           |
| Recovery Plan        | ✅ 1 tooltip   | Re-engagement strategy            |
| Priority Tiers       | ✅ 1 tooltip   | Reach/Target/Safety explanation   |

**Implementation:**

- [ ] Create HelpIcon component
- [ ] Create TooltipGuide component
- [ ] Create helpDefinitions.ts with all content
- [ ] Add icons to key features
- [ ] Test tooltip positioning
- [ ] Link to User Manual sections

---

### 3. Architecture Diagrams ✅ Ready to Create

**Location:** `/documentation/technical/ARCHITECTURE_DIAGRAMS.md`

**4 System Diagrams (Mermaid.js)**

| #   | Diagram                 | Focus                  | Components                       |
| --- | ----------------------- | ---------------------- | -------------------------------- |
| 1   | **System Architecture** | Overall structure      | Client → API → DB                |
| 2   | **Data Flow**           | Request/response cycle | User action → DB → UI            |
| 3   | **Component Hierarchy** | Vue structure          | Pages → Components → Composables |
| 4   | **Authentication Flow** | User auth              | Login → JWT → Protected routes   |

**Diagram Details:**

**Diagram 1: System Architecture**

```
┌─────────────────┐
│   Web Client    │ (Nuxt 3 + Vue)
│  (recruitingcompass.com)
└────────┬────────┘
         │
    HTTP/HTTPS
         │
┌────────▼────────┐
│   Nitro API     │ (Backend)
│  (/api/*)       │
└────────┬────────┘
         │
    REST/JSON
         │
┌────────▼────────┐
│ Supabase        │ (Database)
│ (PostgreSQL +   │
│  Auth + Storage)│
└─────────────────┘
```

**Diagram 2: Data Flow**

```
User Action
    ↓
Composable (useXxx)
    ↓
Pinia Store (mutation)
    ↓
API Endpoint (/api/*)
    ↓
Database (CRUD)
    ↓
Response JSON
    ↓
Pinia Store (update)
    ↓
Component re-render
    ↓
UI Update
```

**Diagram 3: Component Hierarchy**

```
App (root)
  ├── Layout
  │   ├── Header
  │   ├── Navigation
  │   └── Footer
  └── Pages
      ├── Dashboard
      ├── Schools
      ├── Timeline
      └── Settings
```

**Diagram 4: Authentication Flow**

```
User → Login Page
  ↓
POST /auth/login
  ↓
Supabase Auth
  ↓
JWT Token Created
  ↓
Store in localStorage
  ↓
Add to Request Headers
  ↓
Protected API Calls
```

**Implementation:**

- [ ] Create ARCHITECTURE_DIAGRAMS.md
- [ ] Write 4 Mermaid diagrams
- [ ] Add explanatory text for each
- [ ] Include example code snippets

---

### 4. Feature Flow Diagrams ✅ Ready to Create

**Location:** `/documentation/technical/FEATURE_FLOW_DIAGRAMS.md`

**5 Algorithm/Process Diagrams (Mermaid.js)**

| #   | Diagram                        | Focus                   | Decision Points          |
| --- | ------------------------------ | ----------------------- | ------------------------ |
| 1   | **Timeline Phase Advancement** | How phases advance      | Conditions for unlock    |
| 2   | **Fit Score Calculation**      | Score algorithm         | 5 components, weights    |
| 3   | **AI Suggestion Engine**       | Recommendation logic    | Input factors, triggers  |
| 4   | **Interest Calibration**       | Survey → action mapping | 6 questions → next steps |
| 5   | **Recovery Plan Trigger**      | Silent coach detection  | 30-day threshold logic   |

**Diagram Details:**

**Diagram 1: Timeline Phase Advancement**

```
Current Phase: Freshman
    ↓
Check: All tasks complete?
  ├─ No → Stay in phase
  └─ Yes → Can advance
    ↓
User clicks "Advance Phase"
    ↓
New Phase: Sophomore
    ↓
Load new phase tasks
    ↓
Update UI + notify user
```

**Diagram 2: Fit Score Calculation**

```
User Profile Complete?
  ├─ No → Use available data
  └─ Yes → Full calculation
    ↓
Academic Fit (30%)
  ← GPA match + test scores + major
    ↓
Athletic Fit (30%)
  ← Stats match + position + performance
    ↓
Location Fit (15%)
  ← Distance + region preference
    ↓
Program Fit (15%)
  ← Reputation + coaching style
    ↓
Financial Fit (10%)
  ← Scholarship availability
    ↓
Weighted Average = Overall Score (1-10)
```

**Diagram 3: AI Suggestion Engine**

```
Suggestion Generation Trigger:
  ├─ Daily (scheduled)
  ├─ On interaction log
  └─ On profile update
    ↓
Analyze User Profile
    ↓
Check Interaction History
    ↓
Generate Candidate Suggestions:
  ├─ Follow-up (45+ days silent)
  ├─ School match (85%+ fit)
  ├─ Activity (phase-appropriate)
  └─ Milestone (ready to advance?)
    ↓
Rank by Priority
    ↓
Store in Database
    ↓
User sees "New Suggestions"
```

**Diagram 4: Interest Calibration**

```
After Coach Interaction:
    ↓
Show 6-Question Survey:
  1. How interested are you? (1-10)
  2. Would you visit campus?
  3. Fit for academics?
  4. Fit for athletics?
  5. Fit for location?
  6. Next action?
    ↓
Calculate Interest Score
    ↓
Store Response
    ↓
Trigger Suggestions:
  ├─ High interest → Schedule visit
  ├─ Medium → Log more interactions
  └─ Low → Consider removing school
```

**Diagram 5: Recovery Plan Trigger**

```
Daily Check: Coach Status
    ↓
Last Interaction Date < 30 days ago?
  ├─ No → No action
  └─ Yes → Check responsiveness
    ↓
Have you reached out recently?
  ├─ Yes → Wait
  └─ No → Generate recovery plan
    ↓
Suggest Action:
  ├─ New angle to approach
  ├─ Optimal timing
  └─ Sample message
    ↓
User decides to act
    ↓
Log new interaction
    ↓
Reset timer
```

**Implementation:**

- [ ] Create FEATURE_FLOW_DIAGRAMS.md
- [ ] Write 5 Mermaid diagrams
- [ ] Add explanatory text
- [ ] Include code references

---

### 5. Contributing Guide ✅ Ready to Create

**Location:** `/CONTRIBUTING.md` (in root)

**Content Sections:**

```markdown
# Contributing to Recruiting Compass

## Code of Conduct

- Respectful, inclusive community
- No harassment, discrimination
- Help each other succeed

## Getting Started

- Fork repo, create feature branch
- Setup development environment
- Run tests before committing

## Development Standards

- TypeScript only (no `any`)
- Composition API (Vue 3)
- Test coverage required
- Follow code style (ESLint)

## Commit Message Format

- Conventional commits
- Format: `type(scope): description`
- Examples: `feat(timeline): add phase advancement`, `fix(api): handle null response`

## Testing Requirements

- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)
- Coverage: >80% for new code

## PR Process

- Create PR against `main`
- Link to GitHub issue
- Describe changes clearly
- Get code review approval
- CI/CD must pass

## Code Review Checklist

- [ ] Follows code style
- [ ] Tests included
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Performance impact minimal
```

**Implementation:**

- [ ] Create `/CONTRIBUTING.md`
- [ ] Add all sections above
- [ ] Include setup instructions
- [ ] Add troubleshooting section

---

### 6. Social Media Content ✅ Ready to Create

**Location:** `/documentation/marketing/SOCIAL_MEDIA_CONTENT.md`

**Launch Week Content (3-5 posts/day for 5 days)**

**Platforms:**

- Twitter (X)
- Instagram
- Facebook
- LinkedIn (optional)

**Content Types:**

- Launch announcement
- Feature spotlight
- User testimonial
- Recruiting tip
- Behind-the-scenes

**Example Posts:**

**Twitter:**

```
🚀 We're live! Recruiting Compass helps student-athletes organize their college recruiting journey in one place. Schools, coaches, interactions, timeline—all organized.

Sign up free: recruitingcompass.com
No credit card required. #BaseballRecruiting #CollegeAthletics
```

**Instagram Story:**

```
[Video of app demo]
Tired of tracking recruiting in spreadsheets? 📊
Meet Recruiting Compass 🎓⚾

✅ Organize all your target schools
✅ Track coach interactions
✅ Follow a 4-year timeline
✅ Get AI-powered suggestions

Sign up free today!
```

**LinkedIn:**

```
Exciting news: We're launching Recruiting Compass, a free platform for student-athletes and families to navigate college baseball recruiting.

The recruiting process is overwhelming. Families track everything in spreadsheets, emails, and text threads. Recruiting Compass brings it all together...
```

**Implementation:**

- [ ] Create SOCIAL_MEDIA_CONTENT.md
- [ ] Write 15-20 posts for launch week
- [ ] Include hashtag strategy
- [ ] Plan posting schedule
- [ ] Add graphics/video ideas

---

### 7. Blog Post Templates ✅ Ready to Create

**Location:** `/documentation/marketing/BLOG_POST_TEMPLATES.md`

**3 Template Posts:**

| #   | Title             | Format              | Length          |
| --- | ----------------- | ------------------- | --------------- |
| 1   | Announcement Post | Press release style | 500-700 words   |
| 2   | How-To Post       | Tutorial style      | 800-1200 words  |
| 3   | Recruiting Advice | Educational style   | 1000-1500 words |

**Template Examples:**

**Post 1: Announcement**

```
Headline: "Announcing Recruiting Compass: Your Free College Recruiting Assistant"

Subheading: Family-first platform brings clarity to the recruiting chaos

Content:
- Problem: Recruiting is overwhelming, fragmented
- Solution: Recruiting Compass organizes everything
- Features: Timeline, fit scores, coach tracking, parent view
- Call to action: Sign up free
- Timeline: When launching

Length: ~600 words
Includes: 1-2 screenshots, CTA button
```

**Post 2: How-To**

```
Headline: "How to Organize Your Target School List in 10 Minutes"

Content:
- Intro: Why organization matters
- Step 1: Decide on divisions (D1/D2/D3/JUCO)
- Step 2: List 20 potential schools
- Step 3: Tier them (reach/target/safety)
- Step 4: Add to Recruiting Compass
- Step 5: Review fit scores
- Conclusion: Next steps

Length: ~1000 words
Includes: 5-10 screenshots, step-by-step
```

**Post 3: Recruiting Advice**

```
Headline: "5 Mistakes Parents Make in College Baseball Recruiting (And How to Avoid Them)"

Content:
- Intro: Recruiting is complex
- Mistake 1: Waiting for coaches to contact
  Solution: Be proactive
- Mistake 2: Not tracking interactions
  Solution: Keep detailed records
- Mistake 3: Ignoring fit
  Solution: Understand academic/athletic alignment
- Mistake 4: Not involving family
  Solution: Make it a collaborative process
- Mistake 5: Rushing decision
  Solution: Follow 4-year timeline

Length: ~1200 words
Includes: 2-3 screenshots, examples
```

**Implementation:**

- [ ] Create BLOG_POST_TEMPLATES.md
- [ ] Write 3 complete template posts
- [ ] Include formatting guidelines
- [ ] Add SEO checklist

---

## Your Tasks (Parallel Work)

While I create Week 3 deliverables, please complete:

### Week 1 Screenshots (Pending)

- [ ] 20 core app screenshots (Dashboard, Schools, Coaches, Timeline, Interactions, Settings)
- [ ] Use staged/demo data
- [ ] Store in `/documentation/user/screenshots/`
- [ ] Annotate with labels if possible
- **Estimated time:** 2-3 hours
- **Deadline:** Mid-Week 3

### One-Pager Design (Pending)

- [ ] Design in Canva (landscape format)
- [ ] Include: Logo, problem, solution, features, contact
- [ ] Use brand colors
- [ ] Export as PDF
- **Estimated time:** 1 hour
- **Deadline:** By Week 3 start if possible

### Pitch Deck (Pending)

- [ ] Build from PITCH_DECK_OUTLINE.md in Canva
- [ ] 20 slides total
- [ ] Add screenshots once captured
- [ ] Export as PDF
- **Estimated time:** 1-2 hours
- **Deadline:** By Week 3 end

### Video Script Callouts (Optional)

- [ ] For each video, note any specific screens/features to show
- [ ] Timing notes (where to slow down, pause, etc.)
- [ ] Examples of data to use in demo
- **Estimated time:** 1 hour
- **Deadline:** Before I record videos

---

## Week 3 Timeline

### Monday-Tuesday

- [ ] Create video scripts (all 10)
- [ ] Create HelpIcon and TooltipGuide components
- [ ] Begin recording videos

### Wednesday-Thursday

- [ ] Complete video recording
- [ ] Upload videos to YouTube
- [ ] Create ARCHITECTURE_DIAGRAMS.md
- [ ] Create FEATURE_FLOW_DIAGRAMS.md

### Friday

- [ ] Create CONTRIBUTING.md
- [ ] Create SOCIAL_MEDIA_CONTENT.md
- [ ] Create BLOG_POST_TEMPLATES.md
- [ ] Final review and polish

---

## Success Metrics (Week 3)

- ✅ 8-10 videos recorded and uploaded
- ✅ In-app help system components complete
- ✅ 4 architecture diagrams created
- ✅ 5 feature flow diagrams created
- ✅ Contributing guide published
- ✅ Social media content calendar created
- ✅ 3 blog post templates written
- ✅ 20-30 screenshots captured (your task)

---

## Files to Create (Week 3)

```
/documentation/
  /user/
    /videos/
      01-getting-started.md                (script)
      02-adding-first-school.md            (script)
      03-logging-interactions.md           (script)
      04-understanding-timeline.md         (script)
      05-email-templates.md                (script)
      06-parent-view.md                    (script)
      07-performance-metrics.md            (script)
      08-understanding-fitscores.md        (script)
      09-event-management.md               (script)
      10-ai-suggestions.md                 (script)
  /technical/
    ARCHITECTURE_DIAGRAMS.md               (4 diagrams)
    FEATURE_FLOW_DIAGRAMS.md               (5 diagrams)
  /marketing/
    SOCIAL_MEDIA_CONTENT.md                (15-20 posts)
    BLOG_POST_TEMPLATES.md                 (3 templates)

/components/Help/
  HelpIcon.vue
  TooltipGuide.vue
  HelpModal.vue
  helpDefinitions.ts

/CONTRIBUTING.md (in root)
```

---

## Week 3 Estimated Effort

| Task                  | Hours        | Status   |
| --------------------- | ------------ | -------- |
| Video Scripts         | 3            | ⏳ To do |
| Video Recording       | 4            | ⏳ To do |
| Help Components       | 3            | ⏳ To do |
| Architecture Diagrams | 2            | ⏳ To do |
| Feature Flow Diagrams | 2            | ⏳ To do |
| Contributing Guide    | 2            | ⏳ To do |
| Social Content        | 2            | ⏳ To do |
| Blog Templates        | 2            | ⏳ To do |
| **Total**             | **20 hours** | ⏳ To do |

---

## Week 4 Preview (After Week 3)

**Remaining Deliverables:**

- [ ] Documentation website (optional, Docusaurus/VitePress)
- [ ] SEO optimization
- [ ] Product directory submissions
- [ ] Press kit preparation
- [ ] Final review and polish
- [ ] Screenshots integration

**Launch Checklist:**

- [ ] All documentation complete
- [ ] Screenshots captured
- [ ] Videos uploaded
- [ ] Landing page live
- [ ] Email sequences ready
- [ ] Social media scheduled

---

**Week 3 Kickoff Version:** 1.0
**Status:** Ready to start
**Created:** 2026-01-26
**Next Review:** When Week 3 begins
