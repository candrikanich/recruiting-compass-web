# Product Requirements Document: Player Profile Onboarding & Family Linking

**Product:** The Recruiting Compass (Web & iOS)
**Author:** Chris (via Claude)
**Date:** February 3, 2026
**Version:** 1.0

---

## 1. Overview

### 1.1 Purpose

This PRD defines the account creation, player profile onboarding, and family linking flows for The Recruiting Compass. The goal is to establish a clean data ownership model where the player profile is the central entity, parents link to players via family codes, and all family members stay synchronized across web and iOS platforms.

### 1.2 Background

The Recruiting Compass helps high school athletes (ages 14+) and their parents navigate the college recruiting process. The app provides school tracking, coach relationship management, interaction logging, and a guidance system that adapts to the player's recruiting timeline.

Two user types exist:

- **Players:** Own their profile data, can use the app fully autonomously
- **Parents:** Link to one or more player profiles for transparency and to assist in the recruiting process

### 1.3 Core Principle

**The player owns the data.** Parents are granted access to view and contribute to a player's recruiting journey, but the player profile is the source of truth. This ensures consistency when multiple parents are involved and across web/iOS platforms.

---

## 2. User Types & Data Model

### 2.1 Entities

| Entity             | Description                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Player Profile** | Central data entity containing all recruiting-related information for one athlete. One profile per human athlete.                    |
| **Player Account** | User account that owns exactly one Player Profile. Has full read/write access.                                                       |
| **Parent Account** | User account linked to one or more Player Profiles. Has read access and limited write access (can add coaches, interactions, notes). |
| **Family Link**    | The relationship between a Parent Account and a Player Profile. Created via Family Code.                                             |

### 2.2 Relationships

```
Parent Account (1) ----links to----> (many) Player Profiles
Player Account (1) ----owns----> (1) Player Profile
Player Profile (1) ----has many----> Parent Accounts linked
```

### 2.3 Family Code

- A unique, regenerable code stored on the Player Profile
- Generated automatically at account creation
- Player can regenerate at any time (invalidates previous code)
- Used by parents to establish a Family Link
- Lives in: Settings > Family Management

---

## 3. Account Creation Flows

### 3.1 Flow A: Player Creates Account (Primary Path)

```
[App Launch]
    → [Sign Up Screen]
    → [User Type Selection: "I'm a Player" / "I'm a Parent"]
    → Player selects "I'm a Player"
    → [Account Creation: email, password OR OAuth]
    → [Player Profile Onboarding (see Section 4)]
    → [Family Invite Prompt (see Section 5)]
    → [Main App - Dashboard]
```

### 3.2 Flow B: Parent Creates Account

```
[App Launch]
    → [Sign Up Screen]
    → [User Type Selection: "I'm a Player" / "I'm a Parent"]
    → Parent selects "I'm a Parent"
    → [Family Code Entry Screen]
        - Input field: "Enter your player's Family Code"
        - Link: "Don't have a code? Invite your player to join"

    IF code entered:
        → [Account Creation: email, password OR OAuth]
        → [Family Link established]
        → [Main App - Player's Dashboard]

    IF "Invite your player" tapped:
        → [Invite Screen: Enter player's email]
        → [Email sent to player with app download/signup link]
        → [Parent enters Preview Mode (see Section 6)]
```

### 3.3 Flow C: Parent in Preview Mode Creates Link Later

```
[Parent in Preview Mode]
    → Taps "Enter Family Code" (persistent prompt)
    → [Family Code Entry Screen]
    → [Code validated]
    → [Preview data cleared, linked to real Player Profile]
    → [Main App - Player's Dashboard]
```

---

## 4. Player Profile Onboarding

### 4.1 Design Philosophy

- **Mandatory mini-onboarding:** Players must complete minimum profile before accessing main app
- **Progressive disclosure:** Collect essentials first, prompt for additional data contextually later
- **Gamification:** Profile completeness indicator encourages ongoing engagement

### 4.2 Onboarding Screens

#### Screen 1: Welcome

- Headline: "Let's set up your recruiting profile"
- Subtext: "This helps us personalize your recruiting journey"
- CTA: "Get Started"

#### Screen 2: Basic Info (Required)

- **Graduation Year** (dropdown: current year + 4 years forward)
- **Primary Sport** (dropdown, searchable)
- **Primary Position** (conditional display):
  - If sport has defined position list: dropdown, filtered by sport selection
  - If sport has no position list yet: free-text input with placeholder "Enter your position"
- **Secondary Position** (optional, same conditional logic as primary)

#### Screen 3: Location (Required)

- **Zip Code** (5-digit input with validation)
- Helper text: "Used to calculate distance to schools"

#### Screen 4: Academic Snapshot (Optional but Encouraged)

- **GPA** (numeric input, 0.0-5.0 scale)
- **SAT Score** (numeric input, optional)
- **ACT Score** (numeric input, optional)
- Skip link available: "I'll add this later"

#### Screen 5: Profile Complete

- Headline: "You're all set!"
- Show: Profile completeness indicator (e.g., "Profile 60% complete")
- CTA: "Invite a Parent" (primary) / "Skip for now" (secondary)

### 4.3 Minimum Viable Profile (Required Fields)

| Field            | Purpose                                     | Validation                                   |
| ---------------- | ------------------------------------------- | -------------------------------------------- |
| Graduation Year  | Timeline/guidance system                    | Must be current year or future, max +4 years |
| Primary Sport    | Sport-specific features, position filtering | Must select from list                        |
| Primary Position | Coach outreach, profile display             | Must select from sport-filtered list         |
| Zip Code         | Distance calculations to schools            | 5 digits, valid US zip                       |

### 4.4 Extended Profile Fields (Collected Later)

These fields enhance features but are not required for onboarding:

- High School (name, city, state)
- Secondary Sport (for mention in coach emails, not separate timeline)
- Home Address (more precise distance, optional upgrade from zip)
- GPA, SAT, ACT scores (academic fit scoring)
- Intended Major / Academic Interests (school matching)
- Athletic Stats (sport-specific, for profile sharing)
- Highlight Video URL (third-party hosted)
- Player Bio / Personal Statement
- Contact preferences

### 4.5 Profile Completeness System

**Display:** Progress bar + percentage in profile section

**Calculation:** Weight fields by importance to recruiting process

| Field                    | Weight |
| ------------------------ | ------ |
| Graduation Year          | 10%    |
| Primary Sport            | 10%    |
| Primary Position         | 10%    |
| Zip Code                 | 10%    |
| GPA                      | 15%    |
| Test Scores (SAT or ACT) | 10%    |
| Highlight Video          | 15%    |
| Athletic Stats           | 10%    |
| Contact Info Complete    | 10%    |

**Prompts:** Contextual prompts when user engages with features that would benefit from more data:

- "Your school fit scores will be more accurate if you add your GPA"
- "Coaches often filter by test scores — add yours to improve visibility"

---

## 5. Family Invite Flow

### 5.1 Post-Onboarding Prompt (Player)

After completing onboarding, player sees:

**Screen: Invite Your Parents**

- Headline: "Keep your parents in the loop"
- Subtext: "They can help track coaches, research schools, and stay updated on your progress"
- Input: "Parent's email address"
- CTA: "Send Invite"
- Secondary: "I'll do this later"

If player enters email:

- System sends email to parent containing:
  - Brief app explanation
  - Player's Family Code
  - Link to download app / sign up
- Confirmation shown to player: "Invite sent to [email]!"

### 5.2 Family Code Display (Settings)

Location: Settings > Family Management

**Elements:**

- Current Family Code (displayed, tap to copy)
- "Regenerate Code" button (with confirmation: "This will invalidate your current code")
- "Invite Parent" button → opens email input modal
- List of linked parents (if any) with option to remove link

### 5.3 Parent Invite Email Template

```
Subject: [Player Name] invited you to The Recruiting Compass

Hi,

[Player Name] is using The Recruiting Compass to navigate their college recruiting journey and wants you to be part of the process.

As a parent on The Recruiting Compass, you can:
• See which schools they're tracking
• Help research coaches and log interactions
• Stay aligned on their recruiting priorities
• Access guidance tailored to their timeline

Your Family Code: [CODE]

Get started: [App Store / Play Store / Web Link]

---
The Recruiting Compass
Guiding athletes to their next chapter
```

---

## 6. Parent Preview Mode

### 6.1 Purpose

Allow parents to explore app features before their player has created an account. Builds confidence in the product value without creating data ownership problems.

### 6.2 Preview Mode Characteristics

- **Seeded with demo data:** Sample schools, coaches, and interactions to demonstrate functionality
- **Persistent banner:** Red banner across top of all screens: "Preview Mode — Enter a Family Code to start your player's real journey"
- **Banner CTA:** Tapping banner opens Family Code entry screen
- **Full feature access:** Parent can interact with all features using demo data
- **No data persistence:** When parent links to real player, all preview data is discarded

### 6.3 Demo Data Set

Seed preview mode with static, realistic sample data. Data is baked into the app (no backend fetch required).

**Demo Player Profile:**

- Name: "Alex Demo"
- Graduation Year: Current year + 1 (Junior)
- Sport: Soccer (or most common sport in your initial rollout)
- Position: Midfielder
- Zip: 44138 (Olmsted Falls area, for realistic distance calcs)
- GPA: 3.5
- Profile completeness: 65%

**Sample Schools (4):**

| School                  | Division | Distance | Status      |
| ----------------------- | -------- | -------- | ----------- |
| Ohio State University   | D1       | 140 mi   | Following   |
| John Carroll University | D3       | 18 mi    | Researching |
| University of Akron     | D1       | 32 mi    | Following   |
| Oberlin College         | D3       | 25 mi    | Contacted   |

**Sample Coaches (3):**

| Name                 | School       | Title            | Email            | Phone          |
| -------------------- | ------------ | ---------------- | ---------------- | -------------- |
| Coach Jamie Smith    | Ohio State   | Head Coach       | demo@example.com | (555) 123-4567 |
| Coach Taylor Johnson | John Carroll | Assistant Coach  | demo@example.com | (555) 234-5678 |
| Coach Morgan Davis   | Oberlin      | Recruiting Coord | demo@example.com | (555) 345-6789 |

**Sample Interactions (5):**

| Date        | Type            | School              | Coach       | Notes                                 |
| ----------- | --------------- | ------------------- | ----------- | ------------------------------------- |
| 2 weeks ago | Email Sent      | Ohio State          | Coach Smith | Sent intro email with highlight video |
| 10 days ago | Email Received  | Ohio State          | Coach Smith | Coach requested academic info         |
| 1 week ago  | Camp Registered | John Carroll        | —           | Summer ID camp, June 15-17            |
| 5 days ago  | Call Scheduled  | Oberlin             | Coach Davis | Phone call set for next Tuesday       |
| 3 days ago  | Campus Visit    | University of Akron | —           | Unofficial visit, toured facilities   |

**Sample Guidance Items (Junior Timeline):**

- "Create your target school list" — Completed
- "Film highlight video (2-3 min)" — In Progress
- "Email 10 coaches this month" — High Priority, Due Soon
- "Register for summer camps" — High Priority
- "Request transcripts for coaches" — Upcoming
- "Take SAT/ACT" — Upcoming

This demo data demonstrates the core value props: school tracking, coach relationship management, interaction history, and timeline-based guidance.

### 6.4 Exiting Preview Mode

When parent enters valid Family Code:

1. Confirm: "This will replace preview data with [Player Name]'s real recruiting profile. Continue?"
2. If confirmed: Clear all preview data, establish Family Link, load player's actual data
3. If cancelled: Return to preview mode

---

## 7. Technical Considerations

### 7.1 Existing Infrastructure

| Component              | Status                              |
| ---------------------- | ----------------------------------- |
| User Authentication    | ✅ Complete                         |
| Profile Settings (Web) | ✅ Complete                         |
| Profile Settings (iOS) | 🔨 In Progress                      |
| Family Code System     | ✅ Complete                         |
| School Tracking        | ✅ Complete (College Scorecard API) |
| Guidance System        | ⚠️ Created, untested                |

### 7.2 New Components Required

| Component                                | Priority | Notes                                     |
| ---------------------------------------- | -------- | ----------------------------------------- |
| User Type Selection (signup flow)        | P0       | Gate to determine player vs parent flow   |
| Player Profile Onboarding (multi-screen) | P0       | 5 screens as specified                    |
| Family Code Entry Screen                 | P0       | For parent signup flow                    |
| Parent Invite Email System               | P1       | Transactional email with code             |
| Preview Mode Infrastructure              | P1       | Demo data seeding, banner, data isolation |
| Profile Completeness Calculator          | P2       | Weighted calculation, UI indicator        |
| Position-by-Sport Data Set               | P0       | Required for onboarding dropdown          |

### 7.3 Data Schema Additions

```
Player Profile (additions/confirmations):
- graduation_year: integer (required)
- primary_sport: string (required, FK to sports table)
- primary_position: string (nullable, FK to positions table OR null if custom)
- primary_position_custom: string (nullable, free-text for sports without position list)
- secondary_position: string (nullable)
- secondary_position_custom: string (nullable)
- secondary_sport: string (nullable)
- zip_code: string(5) (required)
- high_school_name: string (nullable)
- high_school_city: string (nullable)
- high_school_state: string(2) (nullable, US state abbreviation)
- gpa: decimal (nullable)
- sat_score: integer (nullable)
- act_score: integer (nullable)
- family_code: string (format: FAM-XXXXXX, auto-generated, unique)
- profile_completeness: integer (calculated, 0-100)

User Account (additions):
- user_type: enum ['player', 'parent']
- is_preview_mode: boolean (default false, parents only)
- onboarding_completed: boolean (default false)

Family Link (may already exist):
- parent_account_id: FK
- player_profile_id: FK
- linked_at: timestamp

Sports Table:
- id: primary key
- name: string
- has_position_list: boolean (default false, true when positions are defined)
- display_order: integer

Positions Table:
- id: primary key
- sport_id: FK to sports
- name: string
- display_order: integer
```

### 7.4 Email Service

Transactional emails (family invites) via **Resend** or **Supabase built-in email**.

Implementation note: Abstract email sending behind a service interface to allow provider switching without code changes.

### 7.4 Platform Parity

Both Web (Nuxt3) and iOS must implement:

- User type selection at signup
- Player onboarding flow
- Parent family code entry
- Parent preview mode
- Family management in settings
- Profile completeness indicator

Shared backend handles:

- Family code generation/validation
- Family link creation
- Profile completeness calculation
- Invite email sending

### 7.5 Edge Cases

| Scenario                                                          | Handling                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Player tries to sign up with email already used by parent account | Error: "This email is already registered. Please sign in or use a different email."                                                                                                                                                                                                                                |
| Parent enters invalid family code                                 | Error: "That code doesn't match any player. Check with your player and try again."                                                                                                                                                                                                                                 |
| Parent enters code for player they're already linked to           | Message: "You're already connected to [Player Name]'s profile."                                                                                                                                                                                                                                                    |
| Player regenerates code while parent is mid-signup                | Parent's code entry fails; they must request new code                                                                                                                                                                                                                                                              |
| Parent in preview mode force-closes app                           | Preview state persists; banner shows on next launch                                                                                                                                                                                                                                                                |
| Player skips family invite, parent can't find code                | Code always visible in Settings > Family Management                                                                                                                                                                                                                                                                |
| Player selects graduation year implying age under 14              | Block account creation. Message: "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support." Calculate by: if (graduation_year - current_year) > 4, likely under 14. More precise: assume June graduation, 18 years old at graduation, work backward. |
| Player selects sport without defined position list                | Show free-text input: "Enter your primary position" instead of dropdown. Store as custom_position field.                                                                                                                                                                                                           |
| Parent enters family code without "FAM-" prefix                   | Accept code, auto-prepend "FAM-" for validation. UI should be forgiving.                                                                                                                                                                                                                                           |

---

## 8. Success Metrics

| Metric                      | Target | Measurement                                                   |
| --------------------------- | ------ | ------------------------------------------------------------- |
| Onboarding completion rate  | >80%   | Players who start onboarding and complete all required fields |
| Family link rate            | >40%   | Players who have at least one parent linked within 7 days     |
| Profile completeness (avg)  | >60%   | Average completeness score across all players at 30 days      |
| Preview mode conversion     | >50%   | Parents in preview mode who eventually link to a player       |
| Time to first school follow | <5 min | From onboarding completion to first school tracked            |

---

## 9. Out of Scope (MVP)

- Multi-sport timelines (player can note secondary sport, but no separate guidance track)
- Parent-to-parent features (no parent chat, shared notes between parents)
- Coach/school verification system
- Premium features or paywall
- Push notification system (future enhancement)
- Profile sharing/public profile page

---

## 10. Open Questions (Resolved)

1. **Position data set:** ✅ RESOLVED — Sport → position mapping will be rolled out sport-by-sport. For sports without a defined position list, show a free-text input field with placeholder: "Enter your position(s)". This allows launch without complete data while building the structured list over time.

2. **Email service:** ✅ RESOLVED — Resend or Supabase (built-in email). Implementation should abstract the provider for easy switching.

3. **Preview mode data refresh:** ✅ RESOLVED — Static demo data baked into the app. No refresh mechanism needed for MVP.

4. **Family code format:** ✅ RESOLVED — Format is `FAM-XXXXXX` (prefix "FAM-" followed by 6 alphanumeric characters). Code entry UI should accept with or without the "FAM-" prefix for user convenience.

5. **Age verification:** ✅ RESOLVED — Implement soft age gate based on graduation year. If selected graduation year implies the player is under 14, block account creation with message (see Section 7.5 Edge Cases for implementation).

---

## 11. Appendix

### A. User Flow Diagrams

```
PLAYER SIGNUP FLOW
==================
[Launch App]
     │
     ▼
[Sign Up Screen]
     │
     ▼
[Select: "I'm a Player"]
     │
     ▼
[Create Account]
     │
     ▼
[Onboarding Screen 1: Welcome]
     │
     ▼
[Onboarding Screen 2: Sport/Position]
     │
     ▼
[Onboarding Screen 3: Location]
     │
     ▼
[Onboarding Screen 4: Academics (skippable)]
     │
     ▼
[Onboarding Screen 5: Complete + Invite Prompt]
     │
     ├──[Send Invite]──▶ [Email Sent] ──┐
     │                                   │
     └──[Skip]──────────────────────────┘
                                         │
                                         ▼
                                   [Main Dashboard]


PARENT SIGNUP FLOW
==================
[Launch App]
     │
     ▼
[Sign Up Screen]
     │
     ▼
[Select: "I'm a Parent"]
     │
     ▼
[Enter Family Code Screen]
     │
     ├──[Has Code]──▶ [Enter Code] ──▶ [Create Account] ──▶ [Dashboard]
     │
     └──[No Code]──▶ [Invite Player Screen]
                           │
                           ├──[Enter Player Email]──▶ [Send Invite] ──┐
                           │                                          │
                           └──[Skip]──────────────────────────────────┘
                                                                       │
                                                                       ▼
                                                              [Preview Mode]
                                                                       │
                                                              (Red Banner Persists)
                                                                       │
                                                              [Can Enter Code Anytime]
                                                                       │
                                                                       ▼
                                                              [Link to Real Player]
```

### B. Screen Mockup Notes

**Onboarding Screen 2 (Sport/Position):**

- Sport dropdown should be searchable for long list
- Position dropdown filters dynamically based on sport selection
- Secondary position only appears after primary is selected
- Consider sport icons for visual recognition

**Family Code Entry:**

- Large, clear input field
- Auto-format to uppercase
- Show validation state (checking... / valid ✓ / invalid ✗)
- "Invite your player" link below input

**Preview Mode Banner:**

- Full-width, fixed to top
- Background: Red (#DC2626 or similar warning color)
- Text: White, concise message
- Tap target: Entire banner opens code entry

### C. Notification Triggers (Future)

For future push notification implementation:

- Parent linked: Notify player "Your parent [name] joined your recruiting team"
- Profile incomplete reminder: "Complete your profile to unlock better school matches" (7 days after signup if <60%)
- Family code expiring: If implementing code expiration

---

_End of Document_
