# Story 7.1: Player Invites Parent via Email

**As a** player
**I want to** invite my parent by email
**So that** they can track my recruiting with me

## Scenarios

### Scenario: Player enters parent email during onboarding

- **Given** I am on the "Invite Your Parents" screen after onboarding
- **When** I enter my parent's email "parent@example.com"
- **And** I tap "Send Invite"
- **Then** an invitation email is sent to "parent@example.com"
- **And** I see confirmation: "Invite sent to parent@example.com!"

### Scenario: Player invites parent from Settings

- **Given** I am logged in as a player
- **When** I go to Settings > Family Management
- **And** I tap "Invite Parent"
- **And** I enter email "parent@example.com"
- **And** I tap "Send"
- **Then** an invitation email is sent
- **And** I see confirmation message

## Acceptance Criteria

- ✓ Email input validates format
- ✓ Invite can be sent during onboarding OR from Settings
- ✓ Confirmation shown after successful send
