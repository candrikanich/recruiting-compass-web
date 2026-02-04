# The Recruiting Compass - Onboarding & Family Linking User Stories

## BDD-Style Gherkin Format

**Document Version:** 1.0  
**Status:** MVP Feature Specification  
**Last Updated:** February 3, 2026  
**Format:** Behavior-Driven Development (BDD) - Gherkin Style  
**Related PRD:** Player Profile Onboarding & Family Linking PRD v1.0

---

## TABLE OF CONTENTS

1. [Feature 1: User Type Selection](#feature-1-user-type-selection)
2. [Feature 2: Player Account Creation](#feature-2-player-account-creation)
3. [Feature 3: Player Profile Onboarding](#feature-3-player-profile-onboarding)
4. [Feature 4: Profile Completeness System](#feature-4-profile-completeness-system)
5. [Feature 5: Family Code System](#feature-5-family-code-system)
6. [Feature 6: Parent Account Creation](#feature-6-parent-account-creation)
7. [Feature 7: Family Invite Flow](#feature-7-family-invite-flow)
8. [Feature 8: Parent Preview Mode](#feature-8-parent-preview-mode)
9. [Feature 9: Family Management Settings](#feature-9-family-management-settings)
10. [Feature 10: Age Verification](#feature-10-age-verification)

---

## FEATURE 1: USER TYPE SELECTION

### Story 1.1: New User Selects Account Type

**As a** new user  
**I want to** identify whether I am a player or parent during signup  
**So that** the app can provide the appropriate onboarding experience

```gherkin
Feature: User Type Selection
  Scenario: User sees account type options on signup
    Given I am on the signup page
    When the signup page loads
    Then I see two clear options: "I'm a Player" and "I'm a Parent"
    And both options are equally prominent
    And I cannot proceed without selecting one

  Scenario: User selects "I'm a Player"
    Given I am on the signup page
    When I tap "I'm a Player"
    Then I am directed to the player account creation flow
    And my account type is set to "player"

  Scenario: User selects "I'm a Parent"
    Given I am on the signup page
    When I tap "I'm a Parent"
    Then I am directed to the Family Code entry screen
    And my account type is set to "parent"

  Acceptance Criteria:
    ✓ User type selection is mandatory before account creation
    ✓ Both options are visually balanced (no bias toward either)
    ✓ Selection is persisted throughout signup flow
    ✓ User type cannot be changed after account creation
    ✓ Works identically on Web and iOS platforms
```

---

## FEATURE 2: PLAYER ACCOUNT CREATION

### Story 2.1: Player Creates Account with Email

**As a** player  
**I want to** create an account with my email and password  
**So that** I can start tracking my recruiting journey

```gherkin
Feature: Player Account Creation
  Scenario: Player creates account with valid credentials
    Given I have selected "I'm a Player"
    When I enter a valid email address
    And I enter a strong password (8+ characters)
    And I click "Create Account"
    Then my player account is created
    And a unique Family Code is generated for my profile
    And I am directed to the Player Profile Onboarding flow

  Scenario: Player creates account via OAuth
    Given I have selected "I'm a Player"
    When I tap "Continue with Google" (or other OAuth provider)
    And I complete the OAuth authentication
    Then my player account is created
    And a unique Family Code is generated for my profile
    And I am directed to the Player Profile Onboarding flow

  Scenario: Email already used by existing account
    Given an account exists with email "player@example.com"
    When I try to create a player account with "player@example.com"
    Then I see error: "This email is already registered. Please sign in or use a different email."
    And no account is created

  Acceptance Criteria:
    ✓ Password must be at least 8 characters
    ✓ Email must be valid format
    ✓ Family Code is auto-generated (format: FAM-XXXXXX)
    ✓ Family Code is unique across all profiles
    ✓ Account creation completes in under 30 seconds
    ✓ OAuth options include Google (minimum), Apple (iOS)
```

---

## FEATURE 3: PLAYER PROFILE ONBOARDING

### Story 3.1: Player Sees Welcome Screen

**As a** new player  
**I want to** understand the purpose of onboarding  
**So that** I know why I'm providing this information

```gherkin
Feature: Onboarding Welcome Screen
  Scenario: Player sees welcome screen after account creation
    Given I have just created my player account
    When the onboarding flow begins
    Then I see headline: "Let's set up your recruiting profile"
    And I see subtext: "This helps us personalize your recruiting journey"
    And I see a "Get Started" button

  Scenario: Player proceeds from welcome screen
    Given I am on the welcome screen
    When I tap "Get Started"
    Then I am taken to the Basic Info screen (Screen 2)

  Acceptance Criteria:
    ✓ Welcome screen is always first screen in onboarding
    ✓ Messaging is encouraging and explains the value
    ✓ Single CTA button prevents confusion
```

---

### Story 3.2: Player Enters Basic Info (Required)

**As a** player  
**I want to** enter my graduation year, sport, and position  
**So that** the app can personalize my recruiting timeline

```gherkin
Feature: Basic Info Collection
  Scenario: Player enters graduation year
    Given I am on the Basic Info screen
    When I tap the Graduation Year dropdown
    Then I see options for current year through current year + 4
    And I can select my expected graduation year

  Scenario: Player selects primary sport
    Given I am on the Basic Info screen
    When I tap the Primary Sport dropdown
    Then I see a searchable list of sports
    And I can search by typing sport name
    And I select my primary sport

  Scenario: Player selects position for sport with defined positions
    Given I am on the Basic Info screen
    And I have selected a sport with a defined position list (e.g., Soccer)
    When I tap the Primary Position dropdown
    Then I see positions filtered to my selected sport
    And I can select my primary position

  Scenario: Player enters position for sport without defined positions
    Given I am on the Basic Info screen
    And I have selected a sport without a defined position list
    When I look at the Primary Position field
    Then I see a free-text input with placeholder "Enter your position"
    And I can type my position manually

  Scenario: Player adds optional secondary position
    Given I have selected my primary position
    When I tap "Add Secondary Position" (optional)
    Then I can select or enter a secondary position
    And this field can be left empty

  Scenario: Player cannot proceed without required fields
    Given I am on the Basic Info screen
    When I try to proceed without selecting Graduation Year
    Then I see validation error on Graduation Year field
    And I cannot advance to the next screen

  Acceptance Criteria:
    ✓ Graduation Year is required
    ✓ Primary Sport is required
    ✓ Primary Position is required
    ✓ Secondary Position is optional
    ✓ Position dropdown filters by selected sport
    ✓ Free-text fallback for sports without position list
    ✓ Sport dropdown is searchable for long lists
    ✓ All fields validate before allowing next screen
```

---

### Story 3.3: Player Enters Location (Required)

**As a** player  
**I want to** enter my zip code  
**So that** the app can calculate distances to schools

```gherkin
Feature: Location Collection
  Scenario: Player enters valid zip code
    Given I am on the Location screen
    When I enter a valid 5-digit US zip code "44138"
    Then the input is accepted
    And I can proceed to the next screen

  Scenario: Player enters invalid zip code
    Given I am on the Location screen
    When I enter an invalid zip code "1234" (4 digits)
    Then I see error: "Please enter a valid 5-digit zip code"
    And I cannot proceed until corrected

  Scenario: Player enters non-numeric zip code
    Given I am on the Location screen
    When I enter "ABCDE"
    Then the input only accepts numeric characters
    And non-numeric characters are not displayed

  Acceptance Criteria:
    ✓ Zip code must be exactly 5 digits
    ✓ Only numeric input accepted
    ✓ Helper text explains purpose: "Used to calculate distance to schools"
    ✓ Validation occurs before advancing
```

---

### Story 3.4: Player Enters Academic Info (Optional)

**As a** player  
**I want to** optionally enter my GPA and test scores  
**So that** the app can provide more accurate school fit scores

```gherkin
Feature: Academic Info Collection
  Scenario: Player enters GPA
    Given I am on the Academic Snapshot screen
    When I enter my GPA "3.75"
    Then the input is accepted
    And the value is stored

  Scenario: Player enters GPA outside valid range
    Given I am on the Academic Snapshot screen
    When I enter GPA "5.5" (exceeds 5.0 scale)
    Then I see error: "GPA must be between 0.0 and 5.0"

  Scenario: Player enters SAT score
    Given I am on the Academic Snapshot screen
    When I enter SAT score "1280"
    Then the input is accepted
    And the value is stored

  Scenario: Player enters ACT score
    Given I am on the Academic Snapshot screen
    When I enter ACT score "28"
    Then the input is accepted
    And the value is stored

  Scenario: Player skips academic info
    Given I am on the Academic Snapshot screen
    When I tap "I'll add this later" link
    Then I proceed to the Profile Complete screen
    And no academic data is saved
    And my profile completeness reflects missing academic data

  Acceptance Criteria:
    ✓ GPA accepts values 0.0 - 5.0
    ✓ SAT score accepts valid range (400-1600)
    ✓ ACT score accepts valid range (1-36)
    ✓ All fields are optional
    ✓ Skip link is clearly visible
    ✓ Skipping does not prevent onboarding completion
```

---

### Story 3.5: Player Completes Onboarding

**As a** player  
**I want to** see confirmation that my profile is set up  
**So that** I know I can start using the app

```gherkin
Feature: Onboarding Completion
  Scenario: Player sees completion screen
    Given I have completed all required onboarding fields
    When I reach the Profile Complete screen
    Then I see headline: "You're all set!"
    And I see my profile completeness percentage (e.g., "Profile 60% complete")
    And I see primary CTA: "Invite a Parent"
    And I see secondary option: "Skip for now"

  Scenario: Player chooses to invite parent
    Given I am on the Profile Complete screen
    When I tap "Invite a Parent"
    Then I am taken to the Family Invite flow
    And after completing invite, I reach the main Dashboard

  Scenario: Player skips parent invite
    Given I am on the Profile Complete screen
    When I tap "Skip for now"
    Then I am taken directly to the main Dashboard
    And my profile is marked as onboarding_completed = true

  Acceptance Criteria:
    ✓ Onboarding completion is recorded in database
    ✓ Profile completeness percentage is calculated and displayed
    ✓ Both invite and skip paths lead to Dashboard
    ✓ Player can access parent invite later via Settings
```

---

## FEATURE 4: PROFILE COMPLETENESS SYSTEM

### Story 4.1: Player Sees Profile Completeness Score

**As a** player  
**I want to** see how complete my profile is  
**So that** I'm motivated to add more information

```gherkin
Feature: Profile Completeness Display
  Scenario: Player sees completeness on profile screen
    Given I have completed onboarding with only required fields
    When I view my profile
    Then I see a progress bar showing my completeness percentage
    And the percentage reflects weighted field completion

  Scenario: Completeness increases when adding optional data
    Given my profile completeness is at 40%
    When I add my GPA to my profile
    Then my completeness increases by 15%
    And the progress bar updates immediately

  Acceptance Criteria:
    ✓ Progress bar displays visually in profile section
    ✓ Percentage is shown numerically
    ✓ Updates in real-time as fields are added
```

---

### Story 4.2: Profile Completeness Calculation

**As the** system  
**I want to** calculate profile completeness using weighted fields  
**So that** more important fields carry more weight

```gherkin
Feature: Completeness Calculation
  Scenario: System calculates completeness correctly
    Given a player has completed:
      | Field            | Completed | Weight |
      | Graduation Year  | Yes       | 10%    |
      | Primary Sport    | Yes       | 10%    |
      | Primary Position | Yes       | 10%    |
      | Zip Code         | Yes       | 10%    |
      | GPA              | No        | 15%    |
      | Test Scores      | No        | 10%    |
      | Highlight Video  | No        | 15%    |
      | Athletic Stats   | No        | 10%    |
      | Contact Info     | No        | 10%    |
    When the system calculates profile completeness
    Then the result is 40%

  Acceptance Criteria:
    ✓ Weights sum to 100%
    ✓ GPA and Highlight Video are weighted highest (15% each)
    ✓ Minimum viable profile (required fields only) = 40%
    ✓ Calculation runs on profile save
```

---

### Story 4.3: Contextual Completeness Prompts

**As a** player  
**I want to** receive prompts to complete my profile when relevant  
**So that** I understand why additional information helps

```gherkin
Feature: Contextual Prompts
  Scenario: Player without GPA views fit scores
    Given I have not entered my GPA
    When I view school fit scores
    Then I see prompt: "Your school fit scores will be more accurate if you add your GPA"
    And the prompt links to my profile edit screen

  Scenario: Player without test scores views academic matches
    Given I have not entered SAT or ACT scores
    When I view schools filtered by academic fit
    Then I see prompt: "Coaches often filter by test scores — add yours to improve visibility"

  Scenario: Player dismisses prompt
    Given I see a contextual completeness prompt
    When I tap "Dismiss" or "Not now"
    Then the prompt closes
    And the same prompt does not appear again for 7 days

  Acceptance Criteria:
    ✓ Prompts appear in context where missing data matters
    ✓ Prompts are dismissible
    ✓ Dismissed prompts have cooldown period
    ✓ Prompts link to relevant profile section
```

---

## FEATURE 5: FAMILY CODE SYSTEM

### Story 5.1: Family Code Generation

**As the** system  
**I want to** generate a unique Family Code for each player  
**So that** parents can link to the correct player profile

```gherkin
Feature: Family Code Generation
  Scenario: Family Code is created at account setup
    Given a new player account is being created
    When the player profile is initialized
    Then a Family Code is automatically generated
    And the format is "FAM-" followed by 6 alphanumeric characters
    And the code is unique across all profiles

  Scenario: Family Code format validation
    Given a Family Code "FAM-ABC123"
    When the system validates the format
    Then it confirms the code matches pattern: FAM-[A-Z0-9]{6}

  Acceptance Criteria:
    ✓ Format: FAM-XXXXXX (6 alphanumeric characters)
    ✓ Automatically generated at account creation
    ✓ Guaranteed unique across all player profiles
    ✓ Characters are uppercase for consistency
```

---

### Story 5.2: Player Views Family Code

**As a** player  
**I want to** view my Family Code in settings  
**So that** I can share it with my parents

```gherkin
Feature: Family Code Display
  Scenario: Player navigates to Family Code
    Given I am logged in as a player
    When I go to Settings > Family Management
    Then I see my current Family Code displayed prominently
    And I see a "Copy" button next to the code

  Scenario: Player copies Family Code
    Given I am viewing my Family Code
    When I tap the "Copy" button
    Then the code is copied to my clipboard
    And I see confirmation: "Code copied!"

  Acceptance Criteria:
    ✓ Family Code always visible in Settings > Family Management
    ✓ One-tap copy to clipboard
    ✓ Visual confirmation when copied
```

---

### Story 5.3: Player Regenerates Family Code

**As a** player  
**I want to** regenerate my Family Code  
**So that** I can invalidate codes shared with the wrong person

```gherkin
Feature: Family Code Regeneration
  Scenario: Player requests code regeneration
    Given I am viewing my Family Code
    When I tap "Regenerate Code"
    Then I see confirmation dialog: "This will invalidate your current code. Any pending invites will no longer work."
    And I see options "Regenerate" and "Cancel"

  Scenario: Player confirms regeneration
    Given I see the regeneration confirmation dialog
    When I tap "Regenerate"
    Then a new Family Code is generated
    And the old code is invalidated
    And I see my new code displayed

  Scenario: Player cancels regeneration
    Given I see the regeneration confirmation dialog
    When I tap "Cancel"
    Then no changes are made
    And I return to Family Management screen

  Scenario: Parent attempts to use invalidated code
    Given a player has regenerated their Family Code
    And a parent has the old code
    When the parent tries to enter the old code
    Then they see error: "That code doesn't match any player. Check with your player and try again."

  Acceptance Criteria:
    ✓ Regeneration requires explicit confirmation
    ✓ Old code becomes immediately invalid
    ✓ New code follows same format (FAM-XXXXXX)
    ✓ Linked parents are NOT affected (only new links)
```

---

## FEATURE 6: PARENT ACCOUNT CREATION

### Story 6.1: Parent Enters Family Code During Signup

**As a** parent with a Family Code  
**I want to** enter my child's code during signup  
**So that** I can immediately link to their profile

```gherkin
Feature: Parent Signup with Code
  Scenario: Parent sees Family Code entry screen
    Given I have selected "I'm a Parent"
    When I am taken to the Family Code entry screen
    Then I see input field: "Enter your player's Family Code"
    And I see link: "Don't have a code? Invite your player to join"

  Scenario: Parent enters valid Family Code
    Given I am on the Family Code entry screen
    When I enter valid code "FAM-ABC123"
    Then I see validation state change to "Valid ✓"
    And I can proceed to account creation

  Scenario: Parent enters code without FAM- prefix
    Given I am on the Family Code entry screen
    When I enter "ABC123" (without prefix)
    Then the system auto-prepends "FAM-"
    And validates "FAM-ABC123"

  Scenario: Parent enters invalid Family Code
    Given I am on the Family Code entry screen
    When I enter invalid code "FAM-INVALID"
    Then I see validation state "Invalid ✗"
    And I see error: "That code doesn't match any player. Check with your player and try again."

  Scenario: Parent creates account after valid code
    Given I have entered a valid Family Code
    When I complete account creation (email/password or OAuth)
    Then my parent account is created
    And I am automatically linked to the player's profile
    And I am taken directly to the player's Dashboard

  Acceptance Criteria:
    ✓ Large, clear input field for code entry
    ✓ Auto-format to uppercase
    ✓ Accept code with or without "FAM-" prefix
    ✓ Real-time validation feedback (checking... / valid / invalid)
    ✓ Family Link established upon account creation
```

---

### Story 6.2: Parent Without Code Invites Player

**As a** parent without a Family Code  
**I want to** invite my player to join the app  
**So that** I can eventually link to their profile

```gherkin
Feature: Parent Invites Player
  Scenario: Parent taps "Don't have a code?"
    Given I am on the Family Code entry screen
    When I tap "Don't have a code? Invite your player to join"
    Then I am taken to the Invite Player screen

  Scenario: Parent enters player's email to invite
    Given I am on the Invite Player screen
    When I enter my player's email "athlete@example.com"
    And I tap "Send Invite"
    Then an invitation email is sent to the player
    And I see confirmation: "Invite sent to athlete@example.com"
    And I am directed to complete my account

  Scenario: Parent skips player invite
    Given I am on the Invite Player screen
    When I tap "Skip"
    Then I am directed to complete my account
    And after account creation, I enter Preview Mode

  Acceptance Criteria:
    ✓ Email input validates format before sending
    ✓ Invitation email contains app download link
    ✓ Skip option always available
    ✓ Skipping leads to Preview Mode
```

---

### Story 6.3: Parent Links to Player They're Already Connected To

**As a** parent  
**I want to** see a helpful message if I try to link to a player I'm already connected to  
**So that** I don't get confused

```gherkin
Feature: Duplicate Link Prevention
  Scenario: Parent enters code for already-linked player
    Given I am logged in as a parent
    And I am already linked to player "Alex Demo"
    When I try to enter Alex's Family Code again
    Then I see message: "You're already connected to Alex Demo's profile."
    And no duplicate link is created

  Acceptance Criteria:
    ✓ System checks existing links before creating new one
    ✓ Message includes player's name
    ✓ No duplicate entries in family_link table
```

---

## FEATURE 7: FAMILY INVITE FLOW

### Story 7.1: Player Invites Parent via Email

**As a** player  
**I want to** invite my parent by email  
**So that** they can track my recruiting with me

```gherkin
Feature: Player Sends Parent Invite
  Scenario: Player enters parent email during onboarding
    Given I am on the "Invite Your Parents" screen after onboarding
    When I enter my parent's email "parent@example.com"
    And I tap "Send Invite"
    Then an invitation email is sent to "parent@example.com"
    And I see confirmation: "Invite sent to parent@example.com!"

  Scenario: Player invites parent from Settings
    Given I am logged in as a player
    When I go to Settings > Family Management
    And I tap "Invite Parent"
    And I enter email "parent@example.com"
    And I tap "Send"
    Then an invitation email is sent
    And I see confirmation message

  Acceptance Criteria:
    ✓ Email input validates format
    ✓ Invite can be sent during onboarding OR from Settings
    ✓ Confirmation shown after successful send
```

---

### Story 7.2: Parent Receives Invitation Email

**As a** parent who received an invite  
**I want to** understand what the app does and how to join  
**So that** I can decide to sign up

```gherkin
Feature: Parent Invitation Email
  Scenario: Parent receives well-formatted invite
    Given player "Alex Demo" has invited parent@example.com
    When the parent checks their email
    Then they see email with subject: "Alex Demo invited you to The Recruiting Compass"
    And the email explains the app's benefits
    And the email contains the Family Code prominently
    And the email contains links to download/sign up

  Email Content Requirements:
    ✓ Subject includes player name
    ✓ Body explains parent capabilities (view schools, log interactions, etc.)
    ✓ Family Code is clearly displayed
    ✓ Download/signup links for App Store, Play Store, and Web
    ✓ Professional, branded template

  Acceptance Criteria:
    ✓ Email sends within 1 minute of invite
    ✓ Family Code is copy-able from email
    ✓ Links work correctly across platforms
```

---

## FEATURE 8: PARENT PREVIEW MODE

### Story 8.1: Parent Enters Preview Mode

**As a** parent who skipped entering a Family Code  
**I want to** explore the app with demo data  
**So that** I can understand the value before my player joins

```gherkin
Feature: Preview Mode Entry
  Scenario: Parent enters Preview Mode after skipping code
    Given I completed parent signup without a Family Code
    When I am logged in
    Then I am in Preview Mode
    And I see demo data populated throughout the app
    And I see a persistent red banner at the top of all screens

  Scenario: Preview Mode banner displays correctly
    Given I am a parent in Preview Mode
    When I view any screen in the app
    Then I see red banner: "Preview Mode — Enter a Family Code to start your player's real journey"
    And the banner is fixed to the top
    And tapping the banner opens Family Code entry

  Acceptance Criteria:
    ✓ Preview Mode automatically activates for parents without linked player
    ✓ Banner appears on ALL screens
    ✓ Banner is visually prominent (red background, white text)
    ✓ Banner is tappable and navigates to code entry
```

---

### Story 8.2: Parent Explores Demo Data

**As a** parent in Preview Mode  
**I want to** see realistic sample data  
**So that** I understand how the app works

```gherkin
Feature: Demo Data Display
  Scenario: Parent sees demo player profile
    Given I am in Preview Mode
    When I view the dashboard
    Then I see demo player "Alex Demo"
    And graduation year is current year + 1 (Junior)
    And sport is Soccer, position is Midfielder
    And profile completeness shows 65%

  Scenario: Parent sees sample schools
    Given I am in Preview Mode
    When I view the schools list
    Then I see 4 sample schools with realistic data:
      | School                   | Division | Status      |
      | Ohio State University    | D1       | Following   |
      | John Carroll University  | D3       | Researching |
      | University of Akron      | D1       | Following   |
      | Oberlin College          | D3       | Contacted   |

  Scenario: Parent sees sample interactions
    Given I am in Preview Mode
    When I view interaction history
    Then I see 5 sample interactions
    And they span different types (email, camp, call, visit)
    And they have realistic dates and notes

  Scenario: Parent sees sample guidance items
    Given I am in Preview Mode
    When I view the guidance/timeline section
    Then I see sample tasks for a Junior:
      - "Create your target school list" — Completed
      - "Film highlight video (2-3 min)" — In Progress
      - "Email 10 coaches this month" — High Priority
      - And more relevant tasks

  Acceptance Criteria:
    ✓ Demo data is static (baked into app, no backend fetch)
    ✓ Demo data is realistic and demonstrates value props
    ✓ Parent can interact with all features using demo data
    ✓ Demo player zip code matches user's area (44138 for Olmsted Falls)
```

---

### Story 8.3: Parent Exits Preview Mode

**As a** parent in Preview Mode  
**I want to** connect to my real player's profile  
**So that** I can see their actual recruiting data

```gherkin
Feature: Exit Preview Mode
  Scenario: Parent enters valid Family Code from Preview Mode
    Given I am in Preview Mode
    When I tap the red banner
    Then I am taken to the Family Code entry screen
    And I can enter my player's code

  Scenario: Parent confirms switching to real profile
    Given I am in Preview Mode
    And I have entered a valid Family Code for "Alex Real"
    When the system validates the code
    Then I see confirmation: "This will replace preview data with Alex Real's real recruiting profile. Continue?"
    And I see options "Continue" and "Cancel"

  Scenario: Parent confirms and links to real player
    Given I see the confirmation dialog
    When I tap "Continue"
    Then all preview data is cleared
    And I am linked to the real player's profile
    And I see Alex Real's actual recruiting data
    And the red banner is removed
    And is_preview_mode is set to false

  Scenario: Parent cancels and stays in Preview Mode
    Given I see the confirmation dialog
    When I tap "Cancel"
    Then I return to Preview Mode
    And demo data remains intact

  Acceptance Criteria:
    ✓ Preview data is completely removed when linking
    ✓ Real player data loads immediately
    ✓ No data contamination between preview and real
    ✓ Confirmation prevents accidental data loss
```

---

### Story 8.4: Preview Mode Persists Across Sessions

**As a** parent in Preview Mode  
**I want** Preview Mode to persist if I close the app  
**So that** I don't lose my exploration state

```gherkin
Feature: Preview Mode Persistence
  Scenario: Parent closes app in Preview Mode
    Given I am in Preview Mode
    When I force-close the app
    And I reopen the app later
    Then I am still in Preview Mode
    And the red banner is still visible
    And demo data is still displayed

  Acceptance Criteria:
    ✓ is_preview_mode flag persists in database
    ✓ Preview state survives app closure
    ✓ Banner shows immediately on app reopen
```

---

## FEATURE 9: FAMILY MANAGEMENT SETTINGS

### Story 9.1: Player Views Linked Parents

**As a** player  
**I want to** see which parents are linked to my profile  
**So that** I know who has access to my recruiting data

```gherkin
Feature: View Linked Parents
  Scenario: Player with linked parents views list
    Given I am logged in as a player
    And I have 2 parents linked to my profile
    When I go to Settings > Family Management
    Then I see a list of linked parents with their names/emails
    And I see option to remove each parent link

  Scenario: Player with no linked parents
    Given I am logged in as a player
    And I have no parents linked
    When I go to Settings > Family Management
    Then I see message: "No parents linked yet"
    And I see prominent "Invite Parent" button

  Acceptance Criteria:
    ✓ List shows all currently linked parents
    ✓ Each parent shows identifiable info (name/email)
    ✓ Remove option available for each link
```

---

### Story 9.2: Player Removes Parent Link

**As a** player  
**I want to** remove a parent's access to my profile  
**So that** I can control who sees my recruiting data

```gherkin
Feature: Remove Parent Link
  Scenario: Player removes parent link
    Given I am viewing linked parents in Family Management
    When I tap "Remove" next to a parent's name
    Then I see confirmation: "Remove [Parent Name]'s access to your profile?"
    And I see options "Remove" and "Cancel"

  Scenario: Player confirms removal
    Given I see the removal confirmation
    When I tap "Remove"
    Then the parent is unlinked from my profile
    And they no longer appear in my linked parents list
    And they can no longer see my recruiting data

  Acceptance Criteria:
    ✓ Removal requires confirmation
    ✓ Unlinked parent sees error when trying to access profile
    ✓ Parent can re-link using a new Family Code if player chooses
```

---

### Story 9.3: Parent Views Linked Players

**As a** parent  
**I want to** see which players I'm linked to  
**So that** I can switch between multiple children's profiles

```gherkin
Feature: Parent Views Linked Players
  Scenario: Parent with multiple players
    Given I am logged in as a parent
    And I am linked to 2 players: "Alex" and "Jordan"
    When I go to Settings > Family Management
    Then I see both players listed
    And I can tap to switch active profile

  Scenario: Parent switches between players
    Given I am viewing "Alex's" dashboard
    When I tap on "Jordan" in Family Management
    Then the dashboard switches to show Jordan's recruiting data
    And all features now operate on Jordan's profile

  Acceptance Criteria:
    ✓ Parent can link to multiple player profiles
    ✓ Easy switching between linked players
    ✓ Active player clearly indicated in UI
```

---

## FEATURE 10: AGE VERIFICATION

### Story 10.1: System Validates Player Age

**As the** system  
**I want to** prevent users under 14 from creating accounts  
**So that** we comply with child safety requirements

```gherkin
Feature: Age Verification Gate
  Scenario: Player selects graduation year implying age 14+
    Given I am a new player entering graduation year
    When I select a graduation year that implies I am 14 or older
    Then I can proceed with account creation normally

  Scenario: Player selects graduation year implying age under 14
    Given I am a new player entering graduation year
    When I select a graduation year more than 4 years in the future
    Then I see error: "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support."
    And I cannot proceed with account creation

  Calculation Logic:
    - Assume June graduation
    - Assume age 18 at graduation
    - If (graduation_year - current_year) > 4, likely under 14

  Acceptance Criteria:
    ✓ Soft age gate based on graduation year calculation
    ✓ Friendly error message with support contact
    ✓ Blocks account creation for users under 14
    ✓ Allows edge cases to contact support
```

---

## NON-FUNCTIONAL REQUIREMENTS

### Performance

- Onboarding flow completes in under 3 minutes total
- Each screen transition < 300ms
- Family Code validation < 2 seconds

### Accessibility

- All screens meet WCAG 2.1 AA standards
- Proper keyboard navigation
- Screen reader compatible labels

### Platform Parity

- Identical flows on Web (Nuxt3) and iOS
- Shared backend handles all business logic
- Consistent data model across platforms

### Security

- Passwords hashed before storage
- Family Codes are cryptographically random
- Rate limiting on code validation (prevent brute force)
- OAuth tokens stored securely

---

## SUCCESS METRICS

| Metric                         | Target   | Notes                                       |
| ------------------------------ | -------- | ------------------------------------------- |
| Onboarding completion rate     | >80%     | Players who start and finish onboarding     |
| Family link rate (7 days)      | >40%     | Players with 1+ parent linked within a week |
| Profile completeness (30 days) | >60% avg | Average score across all players            |
| Preview mode conversion        | >50%     | Preview parents who link to real player     |
| Time to first school follow    | <5 min   | From onboarding to first tracked school     |

---

**Document End**  
**Related Documents:**

- Player Profile Onboarding & Family Linking PRD v1.0
- The Recruiting Compass PRD v1.0
- Original User Stories Document v1.0
