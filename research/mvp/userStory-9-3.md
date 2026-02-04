### Story 9.3: Tasks Unlock Based on Completion

**As a** system
**I want to** unlock dependent tasks only when prerequisites are complete
**So that** the athlete focuses on the right order

```gherkin
Feature: Task Dependencies
  Scenario: Task unlocks only after prerequisite
    Given Task A is "Register with NCSA"
    And Task B is "Update NCSA profile with latest stats"
    When I haven't completed Task A
    Then Task B is locked/hidden
    And I see: "You'll unlock this task once you complete 'Register with NCSA'"

  Scenario: Locked task unlocks when prerequisite completes
    Given I just completed "Register with NCSA"
    When the task saves as complete
    Then Task B "Update NCSA profile" automatically unlocks
    And it appears in my task list

  Scenario: Task list respects logical order
    Given sophomore tasks in logical order:
      1. Upload highlight video (unlock others)
      2. Create school list (start research)
      3. Contact coaches (once list created)
    When I view my tasks
    Then they're organized in dependency order
    And I can't skip ahead

  Acceptance Criteria:
    ✓ Task dependencies defined in database
    ✓ Locked tasks don't appear until prerequisites complete
    ✓ Unlocked tasks appear automatically
    ✓ Unlocking is immediate (within 1 second)
    ✓ Athlete understands why task is locked
```

---
