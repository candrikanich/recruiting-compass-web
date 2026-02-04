# Story 3.5: Player Completes Onboarding

**As a** player
**I want to** see confirmation that my profile is set up
**So that** I know I can start using the app

## Scenarios

### Scenario: Player sees completion screen

- **Given** I have completed all required onboarding fields
- **When** I reach the Profile Complete screen
- **Then** I see headline: "You're all set!"
- **And** I see my profile completeness percentage (e.g., "Profile 60% complete")
- **And** I see primary CTA: "Invite a Parent"
- **And** I see secondary option: "Skip for now"

### Scenario: Player chooses to invite parent

- **Given** I am on the Profile Complete screen
- **When** I tap "Invite a Parent"
- **Then** I am taken to the Family Invite flow
- **And** after completing invite, I reach the main Dashboard

### Scenario: Player skips parent invite

- **Given** I am on the Profile Complete screen
- **When** I tap "Skip for now"
- **Then** I am taken directly to the main Dashboard
- **And** my profile is marked as onboarding_completed = true

## Acceptance Criteria

- ✓ Onboarding completion is recorded in database
- ✓ Profile completeness percentage is calculated and displayed
- ✓ Both invite and skip paths lead to Dashboard
- ✓ Player can access parent invite later via Settings
