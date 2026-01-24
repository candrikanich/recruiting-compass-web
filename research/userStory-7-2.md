### Story 7.2: Parent Can Dismiss and Complete Suggestions

**As a** parent  
**I want to** dismiss suggestions I don't need and mark them complete  
**So that** my suggestion list stays relevant

```gherkin
Feature: Suggestion Management
  Scenario: Parent dismisses a suggestion
    Given a suggestion says "Attend more showcases"
    When I click "Dismiss"
    Then the suggestion is hidden
    And it won't reappear unless the condition changes

  Scenario: Parent marks suggestion as completed
    Given a suggestion says "Upload highlight video"
    When I click "Mark as Done"
    Then the suggestion is marked complete
    And a new suggestion appears in its place

  Scenario: Dismissed suggestion reappears if condition changes
    Given I dismissed "Contact [Coach A]" 7 days ago
    When another 21 days pass with no contact
    Then the suggestion reappears
    Because the "no contact for 21 days" rule is triggered again

  Scenario: Suggestion frequency respects time limits
    Given a suggestion was shown and dismissed
    When I check back within 1 week
    Then the same suggestion does not reappear
    And I see different suggestions instead

  Acceptance Criteria:
    ✓ Can dismiss any suggestion
    ✓ Can mark suggestion as completed
    ✓ Same suggestion shown max once per week
    ✓ Dismissing does not delete the suggestion
    ✓ Suggestions reappear if conditions change
```

---
