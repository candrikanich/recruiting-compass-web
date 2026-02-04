# Story 1.1: New User Selects Account Type

**As a** new user
**I want to** identify whether I am a player or parent during signup
**So that** the app can provide the appropriate onboarding experience

## Scenarios

### Scenario: User sees account type options on signup

- **Given** I am on the signup page
- **When** the signup page loads
- **Then** I see two clear options: "I'm a Player" and "I'm a Parent"
- **And** both options are equally prominent
- **And** I cannot proceed without selecting one

### Scenario: User selects "I'm a Player"

- **Given** I am on the signup page
- **When** I tap "I'm a Player"
- **Then** I am directed to the player account creation flow
- **And** my account type is set to "player"

### Scenario: User selects "I'm a Parent"

- **Given** I am on the signup page
- **When** I tap "I'm a Parent"
- **Then** I am directed to the Family Code entry screen
- **And** my account type is set to "parent"

## Acceptance Criteria

- ✓ User type selection is mandatory before account creation
- ✓ Both options are visually balanced (no bias toward either)
- ✓ Selection is persisted throughout signup flow
- ✓ User type cannot be changed after account creation
- ✓ Works identically on Web and iOS platforms
