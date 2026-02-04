# Story 5.1: Family Code Generation

**As the** system
**I want to** generate a unique Family Code for each player
**So that** parents can link to the correct player profile

## Scenarios

### Scenario: Family Code is created at account setup

- **Given** a new player account is being created
- **When** the player profile is initialized
- **Then** a Family Code is automatically generated
- **And** the format is "FAM-" followed by 6 alphanumeric characters
- **And** the code is unique across all profiles

### Scenario: Family Code format validation

- **Given** a Family Code "FAM-ABC123"
- **When** the system validates the format
- **Then** it confirms the code matches pattern: FAM-[A-Z0-9]{6}

## Acceptance Criteria

- ✓ Format: FAM-XXXXXX (6 alphanumeric characters)
- ✓ Automatically generated at account creation
- ✓ Guaranteed unique across all player profiles
- ✓ Characters are uppercase for consistency
