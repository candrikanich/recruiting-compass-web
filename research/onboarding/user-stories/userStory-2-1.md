# Story 2.1: Player Creates Account with Email

**As a** player
**I want to** create an account with my email and password
**So that** I can start tracking my recruiting journey

## Scenarios

### Scenario: Player creates account with valid credentials

- **Given** I have selected "I'm a Player"
- **When** I enter a valid email address
- **And** I enter a strong password (8+ characters)
- **And** I click "Create Account"
- **Then** my player account is created
- **And** a unique Family Code is generated for my profile
- **And** I am directed to the Player Profile Onboarding flow

### Scenario: Player creates account via OAuth

- **Given** I have selected "I'm a Player"
- **When** I tap "Continue with Google" (or other OAuth provider)
- **And** I complete the OAuth authentication
- **Then** my player account is created
- **And** a unique Family Code is generated for my profile
- **And** I am directed to the Player Profile Onboarding flow

### Scenario: Email already used by existing account

- **Given** an account exists with email "player@example.com"
- **When** I try to create a player account with "player@example.com"
- **Then** I see error: "This email is already registered. Please sign in or use a different email."
- **And** no account is created

## Acceptance Criteria

- ✓ Password must be at least 8 characters
- ✓ Email must be valid format
- ✓ Family Code is auto-generated (format: FAM-XXXXXX)
- ✓ Family Code is unique across all profiles
- ✓ Account creation completes in under 30 seconds
- ✓ OAuth options include Google (minimum), Apple (iOS)
