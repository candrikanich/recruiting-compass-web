# Recruiting Timeline Feature

The Recruiting Timeline is a 4-year roadmap that guides athletes through college baseball recruiting from freshman year through commitment. It combines task management, progress tracking, intelligent suggestions, and personalized guidance to help athletes stay on track.

## Overview

The timeline is organized into **four phases** corresponding to high school grades:

- **Freshman Year**: Foundation & Awareness (Ages 14-15)
- **Sophomore Year**: Building Your Brand (Ages 15-16)
- **Junior Year**: Active Recruiting (Ages 16-17)
- **Senior Year**: Finalization & Commitment (Ages 17-18)

Each phase contains **task milestones**, **status scoring**, and **personalized suggestions** to keep athletes focused on what matters most at each stage.

## Key Features

### 1. Task Management

**What it does:**
- Provides structured checklists for each year
- Tracks completion status of recruiting milestones
- Identifies prerequisite dependencies (e.g., "build video before outreach")
- Auto-completes tasks when related actions occur

**Example tasks:**
- "Create athlete profile with stats"
- "Upload highlight video"
- "Build initial college list"
- "Start coach outreach"
- "Schedule campus visits"
- "Register NCAA eligibility"

### 2. Phase Progression

**How it works:**
- Athletes automatically advance through phases as milestones are completed
- Current phase determines available tasks and expected recruiting stage
- Phase information informs personalized guidance and suggestions

**Example:**
Completing "create highlight video," "build college list," and "start outreach" automatically advances from Freshman to Sophomore phase.

### 3. Status Scoring

The system calculates a **composite status score** (0-100) that indicates how an athlete is tracking compared to recruiting benchmarks.

**Score breakdown:**
- Task completion: 35%
- Interaction frequency: 25%
- Coach interest indicators: 25%
- Academic standing: 15%

**Status labels:**
- **On Track** (75-100): Ahead of typical recruiting timeline
- **Slightly Behind** (50-74): Keeping pace with expectations
- **At Risk** (0-49): May need to accelerate efforts

### 4. Fit Score System

Evaluates how well each school matches the athlete's profile across four dimensions:

| Dimension | Weight | Evaluates |
|-----------|--------|-----------|
| **Athletic** | 40% | Position fit, performance tier, coach interest |
| **Academic** | 25% | GPA/test score alignment with school standards |
| **Opportunity** | 20% | Roster depth, playing time likelihood |
| **Personal** | 15% | Location, campus size, program culture |

**Fit Tiers:**
- **Match/Safety** (70-100): Good academic/athletic fit
- **Reach** (50-69): Challenging but achievable targets
- **Unlikely** (0-49): Limited fit on key dimensions

**Portfolio Health Warnings:**
The system alerts athletes if their school list is unbalanced (e.g., all reach schools, no safeties).

### 5. Smart Suggestions

An intelligent rule engine generates personalized recommendations:

| Rule | Trigger | Suggestion |
|------|---------|-----------|
| Interaction Gap | 21+ days without contact at A/B priority school | "Reach out to [Coach]" |
| Missing Video | Sophomore+ with no highlight video | "Create and upload highlight video" |
| Event Follow-up | Event attended, no follow-up in 7 days | "Send thank you to [Coach]" |
| Video Health | Video URL returns error | "Update broken video link" |
| Portfolio Gap | All schools in same fit tier | "Add reach/match/safety schools" |
| Priority Reminder | 14+ days without priority school contact | "Contact [Coach] at [School]" |

**Suggestion delivery:**
- Max 2-3 suggestions surfaced daily
- High urgency items shown first
- Athletes can dismiss or mark suggestions complete

### 6. Parent & Athlete Views

**For Athletes:**
- Full read/write access to recruiting data
- Can complete tasks, log interactions, update progress
- See their own timeline and status

**For Parents:**
- Read-only access to athlete's recruiting data
- Can view tasks, status, suggestions, and school list
- Receive contextual guidance about recruiting stage
- See view logs showing what they've checked on (symmetric visibility)
- Cannot edit or mutate data (read-only enforcement at database level)

### 7. Communication Tools

#### Email Templates

Pre-built templates for common recruiting communication:

1. **Introductory Email**: First contact with coach
   - Unlock: Profile complete + video ready + school list built

2. **Follow-up Email**: Re-engage after initial contact
   - Unlock: 10+ days since intro sent

3. **Camp Attendance Email**: Confirm attendance and get coach feedback
   - Unlock: Event attendance logged

4. **Question Email**: Specific program inquiries
   - Unlock: School list built

5. **Thank You Email**: Post-visit follow-up
   - Unlock: Campus visit logged

**How to use:**
1. Click "Use Template" on Timeline or School page
2. Template auto-populates with athlete and school details
3. System opens email client with pre-filled content
4. Send email manually
5. Return to confirm email was sent (marks interaction logged)

#### Interest Calibration Rubric

When logging an inbound message from a coach, the system asks 6 yes/no questions:
- Did they ask about your schedule?
- Did they mention a visit?
- Did they ask about academics?
- Did they provide direct contact info?
- Did they mention roster needs?
- Was it personalized (not form letter)?

**Scoring:**
- 4-6 yes = High interest
- 2-3 yes = Medium interest
- 0-1 yes = Low interest

This standardizes interest assessment across schools and coaches.

### 8. Recovery System

If an athlete falls behind on recruiting milestones, the system detects four recovery triggers:

| Trigger | Detected When | Recovery Plan |
|---------|-----------------|---|
| **Critical Task Missed** | Phase 1-2 critical tasks incomplete | 21-day catch-up plan |
| **No Coach Interest** | No positive interactions in 30+ days | 45-day outreach refresh |
| **Eligibility Incomplete** | NCAA registration not started | 30-day registration guide |
| **Fit Gap** | Unbalanced school list | 14-day diversification plan |

**Recovery flow:**
1. System detects trigger on Dashboard or Timeline
2. Recovery modal displays with plan details
3. Athlete reviews and acknowledges plan
4. Tasks tagged as "recovery" to prioritize completion
5. Weekly progress check to ensure plan completion

### 9. Late Joiner Assessment

For athletes joining mid-recruiting cycle (late sophomore/junior):

**5-question assessment:**
1. Have you created a highlight video?
2. Have you contacted any coaches?
3. Do you have a target school list?
4. Have you registered NCAA eligibility?
5. Have you taken SAT/ACT?

**Automatic actions:**
- Marks "yes" responses as task-complete
- Skips completed work from task list
- Generates catch-up plan for gaps
- Sets appropriate phase based on responses

## Using the Timeline

### Dashboard View

The main dashboard shows:
- **Current phase** at top with progress indicator
- **4 phase cards** (one per year) showing task progress
- Current phase expanded, others collapsible
- **Action Items** section with active suggestions
- **Portfolio Health** sidebar with school balance overview

### Timeline Page

Dedicated page at `/timeline` with:
- Phase navigation (click phase to expand/collapse)
- Task list with filters (by category, status)
- Task details including why it matters & failure risk
- Dependency warnings if prerequisites incomplete
- Recovery status if triggered

### School Detail Integration

On each school page:
- **Fit Score** section showing overall match score
- **Fit Breakdown** by dimension (Athletic/Academic/Opportunity/Personal)
- **Missing Data** indicators (e.g., "Add academic profile for better fit score")
- **Status Snippet** showing current phase and relevant next steps

### Interaction Logging

When logging an interaction:
1. Basic details (date, coach, type)
2. Sentiment selection (positive/neutral/negative)
3. **Interest Calibration** shows for inbound + positive (6 questions)
4. Interest level auto-calculated and saved
5. Task auto-completion checks (e.g., email task completed)

## Best Practices

### For Athletes

1. **Update tasks regularly** - Mark tasks complete as you progress
2. **Log interactions promptly** - Don't wait weeks to record coach contact
3. **Use email templates** - They're designed by recruiting experts
4. **Review suggestions** - Act on high-urgency items quickly
5. **Check fit scores** - Use them to validate school list balance
6. **Respond to recovery** - If recovery mode triggers, prioritize those tasks

### For Parents

1. **Review progress monthly** - Check status score and task completion
2. **Monitor interactions** - See coaching interest level indicators
3. **Support task completion** - Help athlete stay on timeline
4. **Attend important events** - Campus visits, showcases when possible
5. **Let athlete own the process** - Read-only view prevents over-control

## FAQ

**Q: Can I complete tasks out of order?**
A: Generally yes, but the system warns if dependencies aren't met. For example, you can attempt outreach before creating a video, but you'll see the warning.

**Q: How often should I update my status?**
A: Status recalculates automatically as you log interactions and complete tasks. No manual updates needed—the system tracks automatically.

**Q: Why is my fit score low?**
A: Fit scores require data across all four dimensions. Add academic profile, coach interest signals, and personal preferences to improve the score. Incomplete dimensions show in the UI.

**Q: Can parents help with recruiting?**
A: Yes! Parents get read-only access to all data. They can monitor progress, see suggestions, and provide support without taking over the athlete's ownership.

**Q: What happens if I'm behind schedule?**
A: The recovery system detects this and offers a catch-up plan. No judgment—just a structured 2-6 week plan to get back on track.

**Q: How accurate are the suggestions?**
A: Suggestions are triggered by specific events (21 days no contact, broken video link, etc). They're designed to be high-confidence, not low-confidence guesses. You can dismiss suggestions that don't apply.

**Q: Can I undo a task completion?**
A: Yes. Click the task and change status back to "in progress" or "not started."

## Technical Details

- Database: PostgreSQL (Supabase)
- Backend: Nuxt Server Routes (Nitro)
- Frontend: Vue 3 + Nuxt 3
- State: Pinia stores (for suggestions, timeline data)
- API: RESTful endpoints under `/api/` paths
- Real-time: Database queries (no WebSocket currently)

See [timeline-architecture.md](../technical/timeline-architecture.md) for implementation details.

## Support

**Questions?** Check the FAQ above or review the context-specific guidance that appears on each page of the timeline.

**Found a bug?** Report it with:
- What you were doing
- What you expected to happen
- What actually happened
- Screenshot if possible

**Want to suggest a feature?** We're always improving the timeline based on user feedback.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-10
**Feature Status:** Complete (Phases 1-8 implemented, Phase 9 tested)
