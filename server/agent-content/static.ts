// Markdown variants of public-facing pages, served via content negotiation
// (Accept: text/markdown). When a page's user-facing copy changes, update
// the matching markdown here.
//
// NOT YET COVERED — TODO: /legal/privacy, /legal/terms, /about (auth-gated, low value).

const HOMEPAGE = `# The Recruiting Compass

The Recruiting Compass is a recruiting management tool for high-school student athletes and their families. It helps you organize your college search, track schools and coaches, manage the phases of the recruiting process, and stay on top of every interaction along the way.

## What you can do

- **Track schools** — organize and manage your target colleges in one place.
- **Log interactions** — keep a record of every conversation with coaches.
- **Monitor progress** — visualize your recruiting journey with insights and fit signals.

## Get started

- [Sign in](https://myrecruitingcompass.com/login)
- [Create an account](https://myrecruitingcompass.com/signup)

## Learn more

- [Help Center](https://myrecruitingcompass.com/help)
- [Privacy Policy](https://myrecruitingcompass.com/legal/privacy)
- [Terms of Service](https://myrecruitingcompass.com/legal/terms)
`;

const HELP_INDEX = `# Help Center

Everything you need to use The Recruiting Compass.

## Sections

- [Getting Started](https://myrecruitingcompass.com/help/getting-started) — set up your profile and learn the basics of the recruiting dashboard.
- [Schools & Coaches](https://myrecruitingcompass.com/help/schools) — add schools, understand fit scores, and track coach interactions.
- [Phases & Letters](https://myrecruitingcompass.com/help/phases) — navigate recruiting phases and manage recommendation letter requests.
- [Account & Settings](https://myrecruitingcompass.com/help/account) — manage your family, notifications, profile, and account preferences.
`;

const HELP_GETTING_STARTED = `# Getting Started

*Last reviewed: February 2026*

## What is The Recruiting Compass?

The Recruiting Compass is a recruiting management tool built for student athletes and their families. It helps you organize your college search, track schools and coaches, manage the phases of the recruiting process, and stay on top of every interaction along the way.

> **Tip:** You're in charge of your recruiting journey. The Recruiting Compass keeps everything organized so you can focus on making the right connections.

## Creating your profile

Your athlete profile is the foundation of everything in the app. Complete it before adding schools or coaches.

1. **Navigate to Settings** — from the dashboard, go to Settings → Athlete Profile.
2. **Fill in your details** — enter your name, graduation year, sport, position(s), GPA, and test scores. All fields help generate accurate fit scores for schools.
3. **Save your profile** — tap **Save changes**. Your profile is now visible to coaches who view your recruiting page.

## Adding family members

Parents and guardians can be added as family members to view and collaborate on your recruiting journey.

1. **Go to Family settings** — Settings → Family.
2. **Invite a family member** — enter their email address and tap **Send invite**. They'll receive an email to create their account and join your family unit.

> **Note:** Family members can view your school list, phases, and interactions — but only the athlete can make changes to the profile.

## Understanding the dashboard

The dashboard gives you a snapshot of your recruiting progress at a glance.

- **Current Phase** — where you are in the recruiting process (Freshman through Senior).
- **School list** — your saved schools with fit scores and interaction counts.
- **Recent activity** — latest interactions and notifications.
- **Tasks** — action items specific to your current phase.

## Your first action

Once your profile is set up, the most impactful first step is building your school list.

1. **Search for schools** — go to [Search](https://myrecruitingcompass.com/search) and filter by division, sport, location, or size. Add any school that interests you.

> **Tip:** Start broad — you can always narrow your list later. Adding 20–30 schools gives the fit-score algorithm enough data to show meaningful patterns.
`;

const HELP_SCHOOLS = `# Schools & Coaches

*Last reviewed: February 2026*

## Adding a school to your list

Your school list is the core of your recruiting compass. Add every school you're considering, even ones you're unsure about — fit scores will help you prioritize.

1. **Go to Search** — use the filters to find schools by division, sport, state, or enrollment size.
2. **View the school profile** — click any school to see academic info, athletic program details, and location.
3. **Add to your list** — tap **Add to list**. The school now appears on your Schools page with fit signals based on your profile.

## School fit signals

Each school shows two independent fit signals — honest indicators based on what we actually know about you and the school.

- **Personal Fit** — compares your preferences (home state, campus size, cost sensitivity) against the school's profile. These are factors only you can weigh.
- **Academic Fit** — compares your SAT or ACT scores against that school's 25th–75th percentile range from the US College Scorecard. An in-range or above-range score means you have a realistic academic profile for admission.

> We do not show Athletic Fit or Opportunity Fit. We cannot reliably know what a coach is looking for or what roster spots are available — that information can only come from direct conversations with coaches.

> **Tip:** Fit signals update automatically when you update your profile. Keep your test scores and preferences current.

## Managing your school list

Your school list drives everything else in the app — phases, interactions, and recommendation letters are all tied to specific schools.

- **Sort** — by recent activity or date added.
- **Filter** — by division, state, or interaction status.
- **Remove** — tap the school and select **Remove from list**. This also removes associated interactions.

> **Warning:** Removing a school permanently deletes all coach interactions and notes tied to that school. Archive instead of removing if you want to keep the history.

## Logging a coach interaction

Every time you communicate with a coach — email, call, campus visit — log it as an interaction. This creates a timeline of your recruiting relationship with each school.

1. **Open a school** — go to your Schools page and tap the school you interacted with.
2. **Select a coach** — tap a coach on the school's page, or tap **Add coach** if they're not listed yet.
3. **Log the interaction** — tap **Log interaction**, choose the type, set the date, and add any notes. Tap **Save**.

## Interaction types

- **Email** — written correspondence with a coach.
- **Phone call** — direct conversation by phone.
- **Campus visit** — official or unofficial campus visit.
- **Social media** — DMs, follows, or replies on social platforms.
- **Other** — anything that doesn't fit the above.

> **Tip:** Log interactions on the same day they happen. Notes are easier to write while the details are fresh.
`;

const HELP_PHASES = `# Phases & Letters

*Last reviewed: February 2026*

## Overview of recruiting phases

The recruiting process is organized into four phases that map to your high school career. Each phase unlocks specific features and actions in the app.

## What each phase means

### Freshman (optional)

The awareness phase. Focus on building your athlete profile, exploring what divisions and programs exist, and adding initial schools to your list. NCAA contact rules are restrictive at this stage — coaches generally can't reach out to you yet.

### Sophomore

The research phase. Refine your school list, attend camps and showcases to get exposure, and begin logging early interactions. Start identifying target coaches at schools you're serious about.

### Junior (required)

The active phase. This is when most serious recruiting communication happens. Coaches can now initiate contact. Log every interaction, request recommendation letters, and begin scheduling official campus visits. NCAA signing periods begin in your junior year for some sports.

### Senior (required)

The decision phase. Narrow your list to schools that have extended offers or strong interest. Finalize rec letters, make official visits, and track deadlines. National Signing Day typically falls in your senior year.

## How to advance your phase

Phase advancement is a confirmed action — both you and a coach or family member must confirm the transition.

1. **Open Phase settings** — Settings → Recruiting Phase.
2. **Request advancement** — tap **Advance to [next phase]**. A confirmation request is sent to your family unit.
3. **Family confirms** — a family member confirms the advancement in their notification feed. Once confirmed, your phase updates and new features unlock.

> **Warning:** Phase advancement cannot be reversed. Make sure you're ready before requesting the change.

## Requesting a recommendation letter

Recommendation letters from coaches, teachers, or counselors strengthen your recruiting profile. Track all your requests in one place.

1. **Go to Documents** — select the **Recommendation Letters** tab.
2. **Add a new request** — tap **Request letter** and enter the recommender's name, relationship, and the school or program the letter is for.
3. **Set a deadline** — add the submission deadline so you receive a reminder before it's due.

> **Tip:** Ask for recommendation letters at least 4–6 weeks before the deadline. Give your recommenders plenty of context about the school and what makes you a strong candidate.

## Tracking letter status

Each letter request moves through these states:

- **Requested** — you've submitted the request. Waiting for the recommender to confirm.
- **In progress** — the recommender has confirmed they'll write it.
- **Received** — the letter has been submitted to the school or delivered to you.
`;

const HELP_ACCOUNT = `# Account & Settings

*Last reviewed: February 2026*

## Updating your athlete profile

Keep your profile current — fit scores and recommendations update automatically when your profile changes.

1. **Open Settings** — navigate to Settings and select **Athlete Profile**.
2. **Edit your details** — update any field: graduation year, sport, positions, GPA, SAT/ACT, height, or weight.
3. **Save changes** — tap **Save changes**. Fit scores for all your schools will recalculate within a few seconds.

## Managing family members

Family members (parents, guardians) can view your recruiting profile and help confirm phase advancements.

1. **Go to Family settings** — Settings → Family.
2. **Invite a member** — enter their email and tap **Send invite**. They'll receive an invitation to create a linked account.
3. **Manage access** — to remove a family member, tap the three-dot menu next to their name and select **Remove**.

> **Note:** A family member's account is linked to your athlete profile — they cannot log in as you or make changes on your behalf.

## Notification preferences

Control which notifications you receive and how you receive them. Go to **Settings → Notifications** to enable or disable notifications by category.

> **Tip:** Keep **Phase confirmations** and **Rec letter updates** notifications enabled — these are time-sensitive actions that require your attention.

## Notification types

**High priority**
- Phase advancement confirmation requests
- Recommendation letter deadline reminders (7 days out)
- New family member invitation

**Medium priority**
- Interaction logged by a family member
- Recommendation letter status change
- Phase advancement completed

**Low priority**
- Weekly recruiting activity summary
- School list milestone (e.g., 10 schools added)

## Changing your password

1. **Go to Account settings** — Settings → Account.
2. **Tap Change password** — enter your current password, then your new password twice to confirm.
3. **Save** — tap **Update password**. You'll be asked to log in again with your new credentials.

## Data and privacy

Your data is stored securely and never shared with third parties or college programs without your consent. The Recruiting Compass does not sell user data.

- **What we store** — your athlete profile, school list, coach interactions, and app activity.
- **Who can see it** — only you and family members you've invited.
- **To delete your account** — go to **Settings → Account → Delete account**. This permanently removes all your data.

> **Important:** Account deletion is permanent and cannot be undone. Export your data before deleting if you want to keep a record of your recruiting history.
`;

export const STATIC_MARKDOWN: Readonly<Record<string, string>> = Object.freeze({
  "/": HOMEPAGE,
  "/help": HELP_INDEX,
  "/help/getting-started": HELP_GETTING_STARTED,
  "/help/schools": HELP_SCHOOLS,
  "/help/phases": HELP_PHASES,
  "/help/account": HELP_ACCOUNT,
});
