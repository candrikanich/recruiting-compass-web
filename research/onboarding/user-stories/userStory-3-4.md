# Story 3.4: Player Enters Academic Info (Optional)

**As a** player
**I want to** optionally enter my GPA and test scores
**So that** the app can provide more accurate school fit scores

## Scenarios

### Scenario: Player enters GPA

- **Given** I am on the Academic Snapshot screen
- **When** I enter my GPA "3.75"
- **Then** the input is accepted
- **And** the value is stored

### Scenario: Player enters GPA outside valid range

- **Given** I am on the Academic Snapshot screen
- **When** I enter GPA "5.5" (exceeds 5.0 scale)
- **Then** I see error: "GPA must be between 0.0 and 5.0"

### Scenario: Player enters SAT score

- **Given** I am on the Academic Snapshot screen
- **When** I enter SAT score "1280"
- **Then** the input is accepted
- **And** the value is stored

### Scenario: Player enters ACT score

- **Given** I am on the Academic Snapshot screen
- **When** I enter ACT score "28"
- **Then** the input is accepted
- **And** the value is stored

### Scenario: Player skips academic info

- **Given** I am on the Academic Snapshot screen
- **When** I tap "I'll add this later" link
- **Then** I proceed to the Profile Complete screen
- **And** no academic data is saved
- **And** my profile completeness reflects missing academic data

## Acceptance Criteria

- ✓ GPA accepts values 0.0 - 5.0
- ✓ SAT score accepts valid range (400-1600)
- ✓ ACT score accepts valid range (1-36)
- ✓ All fields are optional
- ✓ Skip link is clearly visible
- ✓ Skipping does not prevent onboarding completion
