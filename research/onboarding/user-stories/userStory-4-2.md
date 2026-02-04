# Story 4.2: Profile Completeness Calculation

**As the** system
**I want to** calculate profile completeness using weighted fields
**So that** more important fields carry more weight

## Scenarios

### Scenario: System calculates completeness correctly

- **Given** a player has completed:
  | Field | Completed | Weight |
  | Graduation Year | Yes | 10% |
  | Primary Sport | Yes | 10% |
  | Primary Position | Yes | 10% |
  | Zip Code | Yes | 10% |
  | GPA | No | 15% |
  | Test Scores | No | 10% |
  | Highlight Video | No | 15% |
  | Athletic Stats | No | 10% |
  | Contact Info | No | 10% |
- **When** the system calculates profile completeness
- **Then** the result is 40%

## Acceptance Criteria

- ✓ Weights sum to 100%
- ✓ GPA and Highlight Video are weighted highest (15% each)
- ✓ Minimum viable profile (required fields only) = 40%
- ✓ Calculation runs on profile save
