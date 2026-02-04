# Story 9.1: Player Views Linked Parents

**As a** player
**I want to** see which parents are linked to my profile
**So that** I know who has access to my recruiting data

## Scenarios

### Scenario: Player with linked parents views list

- **Given** I am logged in as a player
- **And** I have 2 parents linked to my profile
- **When** I go to Settings > Family Management
- **Then** I see a list of linked parents with their names/emails
- **And** I see option to remove each parent link

### Scenario: Player with no linked parents

- **Given** I am logged in as a player
- **And** I have no parents linked
- **When** I go to Settings > Family Management
- **Then** I see message: "No parents linked yet"
- **And** I see prominent "Invite Parent" button

## Acceptance Criteria

- ✓ List shows all currently linked parents
- ✓ Each parent shows identifiable info (name/email)
- ✓ Remove option available for each link
