# Story 9.3: Parent Views Linked Players

**As a** parent
**I want to** see which players I'm linked to
**So that** I can switch between multiple children's profiles

## Scenarios

### Scenario: Parent with multiple players

- **Given** I am logged in as a parent
- **And** I am linked to 2 players: "Alex" and "Jordan"
- **When** I go to Settings > Family Management
- **Then** I see both players listed
- **And** I can tap to switch active profile

### Scenario: Parent switches between players

- **Given** I am viewing "Alex's" dashboard
- **When** I tap on "Jordan" in Family Management
- **Then** the dashboard switches to show Jordan's recruiting data
- **And** all features now operate on Jordan's profile

## Acceptance Criteria

- ✓ Parent can link to multiple player profiles
- ✓ Easy switching between linked players
- ✓ Active player clearly indicated in UI
