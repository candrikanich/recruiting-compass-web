# Story 4.3: Contextual Completeness Prompts

**As a** player
**I want to** receive prompts to complete my profile when relevant
**So that** I understand why additional information helps

## Scenarios

### Scenario: Player without GPA views fit scores

- **Given** I have not entered my GPA
- **When** I view school fit scores
- **Then** I see prompt: "Your school fit scores will be more accurate if you add your GPA"
- **And** the prompt links to my profile edit screen

### Scenario: Player without test scores views academic matches

- **Given** I have not entered SAT or ACT scores
- **When** I view schools filtered by academic fit
- **Then** I see prompt: "Coaches often filter by test scores — add yours to improve visibility"

### Scenario: Player dismisses prompt

- **Given** I see a contextual completeness prompt
- **When** I tap "Dismiss" or "Not now"
- **Then** the prompt closes
- **And** the same prompt does not appear again for 7 days

## Acceptance Criteria

- ✓ Prompts appear in context where missing data matters
- ✓ Prompts are dismissible
- ✓ Dismissed prompts have cooldown period
- ✓ Prompts link to relevant profile section
