# Story 4.1: Player Sees Profile Completeness Score

**As a** player
**I want to** see how complete my profile is
**So that** I'm motivated to add more information

## Scenarios

### Scenario: Player sees completeness on profile screen

- **Given** I have completed onboarding with only required fields
- **When** I view my profile
- **Then** I see a progress bar showing my completeness percentage
- **And** the percentage reflects weighted field completion

### Scenario: Completeness increases when adding optional data

- **Given** my profile completeness is at 40%
- **When** I add my GPA to my profile
- **Then** my completeness increases by 15%
- **And** the progress bar updates immediately

## Acceptance Criteria

- ✓ Progress bar displays visually in profile section
- ✓ Percentage is shown numerically
- ✓ Updates in real-time as fields are added
