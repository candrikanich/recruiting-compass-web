# Story 9.2: Player Removes Parent Link

**As a** player
**I want to** remove a parent's access to my profile
**So that** I can control who sees my recruiting data

## Scenarios

### Scenario: Player removes parent link

- **Given** I am viewing linked parents in Family Management
- **When** I tap "Remove" next to a parent's name
- **Then** I see confirmation: "Remove [Parent Name]'s access to your profile?"
- **And** I see options "Remove" and "Cancel"

### Scenario: Player confirms removal

- **Given** I see the removal confirmation
- **When** I tap "Remove"
- **Then** the parent is unlinked from my profile
- **And** they no longer appear in my linked parents list
- **And** they can no longer see my recruiting data

## Acceptance Criteria

- ✓ Removal requires confirmation
- ✓ Unlinked parent sees error when trying to access profile
- ✓ Parent can re-link using a new Family Code if player chooses
