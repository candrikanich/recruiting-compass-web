# Story 8.1: Parent Enters Preview Mode

**As a** parent who skipped entering a Family Code
**I want to** explore the app with demo data
**So that** I can understand the value before my player joins

## Scenarios

### Scenario: Parent enters Preview Mode after skipping code

- **Given** I completed parent signup without a Family Code
- **When** I am logged in
- **Then** I am in Preview Mode
- **And** I see demo data populated throughout the app
- **And** I see a persistent red banner at the top of all screens

### Scenario: Preview Mode banner displays correctly

- **Given** I am a parent in Preview Mode
- **When** I view any screen in the app
- **Then** I see red banner: "Preview Mode — Enter a Family Code to start your player's real journey"
- **And** the banner is fixed to the top
- **And** tapping the banner opens Family Code entry

## Acceptance Criteria

- ✓ Preview Mode automatically activates for parents without linked player
- ✓ Banner appears on ALL screens
- ✓ Banner is visually prominent (red background, white text)
- ✓ Banner is tappable and navigates to code entry
