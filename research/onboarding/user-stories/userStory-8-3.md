# Story 8.3: Parent Exits Preview Mode

**As a** parent in Preview Mode
**I want to** connect to my real player's profile
**So that** I can see their actual recruiting data

## Scenarios

### Scenario: Parent enters valid Family Code from Preview Mode

- **Given** I am in Preview Mode
- **When** I tap the red banner
- **Then** I am taken to the Family Code entry screen
- **And** I can enter my player's code

### Scenario: Parent confirms switching to real profile

- **Given** I am in Preview Mode
- **And** I have entered a valid Family Code for "Alex Real"
- **When** the system validates the code
- **Then** I see confirmation: "This will replace preview data with Alex Real's real recruiting profile. Continue?"
- **And** I see options "Continue" and "Cancel"

### Scenario: Parent confirms and links to real player

- **Given** I see the confirmation dialog
- **When** I tap "Continue"
- **Then** all preview data is cleared
- **And** I am linked to the real player's profile
- **And** I see Alex Real's actual recruiting data
- **And** the red banner is removed
- **And** is_preview_mode is set to false

### Scenario: Parent cancels and stays in Preview Mode

- **Given** I see the confirmation dialog
- **When** I tap "Cancel"
- **Then** I return to Preview Mode
- **And** demo data remains intact

## Acceptance Criteria

- ✓ Preview data is completely removed when linking
- ✓ Real player data loads immediately
- ✓ No data contamination between preview and real
- ✓ Confirmation prevents accidental data loss
