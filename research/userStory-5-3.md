### Story 5.3: Athlete Logs Own Interactions

**As an** athlete  
**I want to** log my own calls and emails with coaches  
**So that** my parent knows what I'm doing and communication stays organized

```gherkin
Feature: Athlete Interaction Logging
  Scenario: Athlete logs an email they sent
    Given I am logged in as an athlete
    When I click "Log Interaction"
    And I fill in:
      | Field | Value |
      | Type | Email |
      | Coach | [Coach at school] |
      | Date | Today |
      | What I said | Asked about campus visit dates |
    And I click "Save"
    Then the interaction is logged
    And my parent can see it in the timeline

  Scenario: Athlete logs a call they received
    Given a coach called me
    When I log an interaction:
      | Type | Phone Call |
      | Coach | [Coach name] |
      | Direction | Inbound (they called) |
      | Notes | Coach wants me to visit in spring |
    And I save
    Then my parent sees the interaction
    And the parent can follow up if needed

  Scenario: Athlete sees their communication history
    Given I log into my account as an athlete
    When I click "My Interactions"
    Then I see all calls, emails, and visits I've had with coaches
    And I can see my total contact frequency

  Acceptance Criteria:
    ✓ Athlete can log all interaction types
    ✓ Athlete's interactions visible to parent
    ✓ Athlete sees full interaction history
    ✓ Athlete interaction logging takes under 1 minute
```

---
