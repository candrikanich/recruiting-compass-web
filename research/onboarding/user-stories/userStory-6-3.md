# Story 6.3: Parent Links to Player They're Already Connected To

**As a** parent
**I want to** see a helpful message if I try to link to a player I'm already connected to
**So that** I don't get confused

## Scenarios

### Scenario: Parent enters code for already-linked player

- **Given** I am logged in as a parent
- **And** I am already linked to player "Alex Demo"
- **When** I try to enter Alex's Family Code again
- **Then** I see message: "You're already connected to Alex Demo's profile."
- **And** no duplicate link is created

## Acceptance Criteria

- ✓ System checks existing links before creating new one
- ✓ Message includes player's name
- ✓ No duplicate entries in family_link table
