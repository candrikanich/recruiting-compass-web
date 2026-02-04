# Story 3.3: Player Enters Location (Required)

**As a** player
**I want to** enter my zip code
**So that** the app can calculate distances to schools

## Scenarios

### Scenario: Player enters valid zip code

- **Given** I am on the Location screen
- **When** I enter a valid 5-digit US zip code "44138"
- **Then** the input is accepted
- **And** I can proceed to the next screen

### Scenario: Player enters invalid zip code

- **Given** I am on the Location screen
- **When** I enter an invalid zip code "1234" (4 digits)
- **Then** I see error: "Please enter a valid 5-digit zip code"
- **And** I cannot proceed until corrected

### Scenario: Player enters non-numeric zip code

- **Given** I am on the Location screen
- **When** I enter "ABCDE"
- **Then** the input only accepts numeric characters
- **And** non-numeric characters are not displayed

## Acceptance Criteria

- ✓ Zip code must be exactly 5 digits
- ✓ Only numeric input accepted
- ✓ Helper text explains purpose: "Used to calculate distance to schools"
- ✓ Validation occurs before advancing
