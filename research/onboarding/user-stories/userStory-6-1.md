# Story 6.1: Parent Enters Family Code During Signup

**As a** parent with a Family Code
**I want to** enter my child's code during signup
**So that** I can immediately link to their profile

## Scenarios

### Scenario: Parent sees Family Code entry screen

- **Given** I have selected "I'm a Parent"
- **When** I am taken to the Family Code entry screen
- **Then** I see input field: "Enter your player's Family Code"
- **And** I see link: "Don't have a code? Invite your player to join"

### Scenario: Parent enters valid Family Code

- **Given** I am on the Family Code entry screen
- **When** I enter valid code "FAM-ABC123"
- **Then** I see validation state change to "Valid ✓"
- **And** I can proceed to account creation

### Scenario: Parent enters code without FAM- prefix

- **Given** I am on the Family Code entry screen
- **When** I enter "ABC123" (without prefix)
- **Then** the system auto-prepends "FAM-"
- **And** validates "FAM-ABC123"

### Scenario: Parent enters invalid Family Code

- **Given** I am on the Family Code entry screen
- **When** I enter invalid code "FAM-INVALID"
- **Then** I see validation state "Invalid ✗"
- **And** I see error: "That code doesn't match any player. Check with your player and try again."

### Scenario: Parent creates account after valid code

- **Given** I have entered a valid Family Code
- **When** I complete account creation (email/password or OAuth)
- **Then** my parent account is created
- **And** I am automatically linked to the player's profile
- **And** I am taken directly to the player's Dashboard

## Acceptance Criteria

- ✓ Large, clear input field for code entry
- ✓ Auto-format to uppercase
- ✓ Accept code with or without "FAM-" prefix
- ✓ Real-time validation feedback (checking... / valid / invalid)
- ✓ Family Link established upon account creation
