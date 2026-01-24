### Story 7.3: Suggestions Update Based on New Data

**As a** parent  
**I want to** have suggestions automatically update  
**So that** I always get relevant guidance

```gherkin
Feature: Dynamic Suggestion Updates
  Scenario: Suggestions update after profile change
    Given Arizona State shows fit score of 68
    When I update my athlete's GPA to 3.4
    And the profile saves
    Then within 1 second, suggestions update:
      | Old Suggestion | New Suggestion |
      | "Focus on D2/D3 schools" | "ASU is now in your realistic range" |

  Scenario: Suggestions update after interaction logging
    Given a suggestion says "You haven't contacted Coach A in 21 days"
    When I log an interaction with Coach A
    And the interaction saves
    Then the suggestion is marked complete
    And disappears from my list

  Scenario: Suggestions update daily
    Given no changes to athlete profile or interactions
    When the daily update runs
    Then suggestions refresh
    And new relevant suggestions may appear based on passing time

  Acceptance Criteria:
    ✓ Suggestions update within 1 second of profile/interaction changes
    ✓ Daily suggestion refresh occurs
    ✓ Users see notification when suggestions change
```

---
