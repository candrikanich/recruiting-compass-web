# Story 10.1: System Validates Player Age

**As the** system
**I want to** prevent users under 14 from creating accounts
**So that** we comply with child safety requirements

## Scenarios

### Scenario: Player selects graduation year implying age 14+

- **Given** I am a new player entering graduation year
- **When** I select a graduation year that implies I am 14 or older
- **Then** I can proceed with account creation normally

### Scenario: Player selects graduation year implying age under 14

- **Given** I am a new player entering graduation year
- **When** I select a graduation year more than 4 years in the future
- **Then** I see error: "The Recruiting Compass is designed for athletes 14 and older. If you believe this is an error, please contact support."
- **And** I cannot proceed with account creation

## Calculation Logic

- Assume June graduation
- Assume age 18 at graduation
- If (graduation_year - current_year) > 4, likely under 14

## Acceptance Criteria

- ✓ Soft age gate based on graduation year calculation
- ✓ Friendly error message with support contact
- ✓ Blocks account creation for users under 14
- ✓ Allows edge cases to contact support
