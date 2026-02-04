# Story 7.2: Parent Receives Invitation Email

**As a** parent who received an invite
**I want to** understand what the app does and how to join
**So that** I can decide to sign up

## Scenarios

### Scenario: Parent receives well-formatted invite

- **Given** player "Alex Demo" has invited parent@example.com
- **When** the parent checks their email
- **Then** they see email with subject: "Alex Demo invited you to The Recruiting Compass"
- **And** the email explains the app's benefits
- **And** the email contains the Family Code prominently
- **And** the email contains links to download/sign up

## Email Content Requirements

- ✓ Subject includes player name
- ✓ Body explains parent capabilities (view schools, log interactions, etc.)
- ✓ Family Code is clearly displayed
- ✓ Download/signup links for App Store, Play Store, and Web
- ✓ Professional, branded template

## Acceptance Criteria

- ✓ Email sends within 1 minute of invite
- ✓ Family Code is copy-able from email
- ✓ Links work correctly across platforms
