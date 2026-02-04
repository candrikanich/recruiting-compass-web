# Story 6.2: Parent Without Code Invites Player

**As a** parent without a Family Code
**I want to** invite my player to join the app
**So that** I can eventually link to their profile

## Scenarios

### Scenario: Parent taps "Don't have a code?"

- **Given** I am on the Family Code entry screen
- **When** I tap "Don't have a code? Invite your player to join"
- **Then** I am taken to the Invite Player screen

### Scenario: Parent enters player's email to invite

- **Given** I am on the Invite Player screen
- **When** I enter my player's email "athlete@example.com"
- **And** I tap "Send Invite"
- **Then** an invitation email is sent to the player
- **And** I see confirmation: "Invite sent to athlete@example.com"
- **And** I am directed to complete my account

### Scenario: Parent skips player invite

- **Given** I am on the Invite Player screen
- **When** I tap "Skip"
- **Then** I am directed to complete my account
- **And** after account creation, I enter Preview Mode

## Acceptance Criteria

- ✓ Email input validates format before sending
- ✓ Invitation email contains app download link
- ✓ Skip option always available
- ✓ Skipping leads to Preview Mode
