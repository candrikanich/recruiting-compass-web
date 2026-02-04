# Story 3.1: Player Sees Welcome Screen

**As a** new player
**I want to** understand the purpose of onboarding
**So that** I know why I'm providing this information

## Scenarios

### Scenario: Player sees welcome screen after account creation

- **Given** I have just created my player account
- **When** the onboarding flow begins
- **Then** I see headline: "Let's set up your recruiting profile"
- **And** I see subtext: "This helps us personalize your recruiting journey"
- **And** I see a "Get Started" button

### Scenario: Player proceeds from welcome screen

- **Given** I am on the welcome screen
- **When** I tap "Get Started"
- **Then** I am taken to the Basic Info screen (Screen 2)

## Acceptance Criteria

- ✓ Welcome screen is always first screen in onboarding
- ✓ Messaging is encouraging and explains the value
- ✓ Single CTA button prevents confusion
