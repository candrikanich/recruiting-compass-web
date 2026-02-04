# Story 5.2: Player Views Family Code

**As a** player
**I want to** view my Family Code in settings
**So that** I can share it with my parents

## Scenarios

### Scenario: Player navigates to Family Code

- **Given** I am logged in as a player
- **When** I go to Settings > Family Management
- **Then** I see my current Family Code displayed prominently
- **And** I see a "Copy" button next to the code

### Scenario: Player copies Family Code

- **Given** I am viewing my Family Code
- **When** I tap the "Copy" button
- **Then** the code is copied to my clipboard
- **And** I see confirmation: "Code copied!"

## Acceptance Criteria

- ✓ Family Code always visible in Settings > Family Management
- ✓ One-tap copy to clipboard
- ✓ Visual confirmation when copied
