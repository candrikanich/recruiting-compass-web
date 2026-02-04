# Story 3.2: Player Enters Basic Info (Required)

**As a** player
**I want to** enter my graduation year, sport, and position
**So that** the app can personalize my recruiting timeline

## Scenarios

### Scenario: Player enters graduation year

- **Given** I am on the Basic Info screen
- **When** I tap the Graduation Year dropdown
- **Then** I see options for current year through current year + 4
- **And** I can select my expected graduation year

### Scenario: Player selects primary sport

- **Given** I am on the Basic Info screen
- **When** I tap the Primary Sport dropdown
- **Then** I see a searchable list of sports
- **And** I can search by typing sport name
- **And** I select my primary sport

### Scenario: Player selects position for sport with defined positions

- **Given** I am on the Basic Info screen
- **And** I have selected a sport with a defined position list (e.g., Soccer)
- **When** I tap the Primary Position dropdown
- **Then** I see positions filtered to my selected sport
- **And** I can select my primary position

### Scenario: Player enters position for sport without defined positions

- **Given** I am on the Basic Info screen
- **And** I have selected a sport without a defined position list
- **When** I look at the Primary Position field
- **Then** I see a free-text input with placeholder "Enter your position"
- **And** I can type my position manually

### Scenario: Player adds optional secondary position

- **Given** I have selected my primary position
- **When** I tap "Add Secondary Position" (optional)
- **Then** I can select or enter a secondary position
- **And** this field can be left empty

### Scenario: Player cannot proceed without required fields

- **Given** I am on the Basic Info screen
- **When** I try to proceed without selecting Graduation Year
- **Then** I see validation error on Graduation Year field
- **And** I cannot advance to the next screen

## Acceptance Criteria

- ✓ Graduation Year is required
- ✓ Primary Sport is required
- ✓ Primary Position is required
- ✓ Secondary Position is optional
- ✓ Position dropdown filters by selected sport
- ✓ Free-text fallback for sports without position list
- ✓ Sport dropdown is searchable for long lists
- ✓ All fields validate before allowing next screen
