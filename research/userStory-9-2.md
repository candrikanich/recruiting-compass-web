### Story 9.2: Parent Sees Athlete's Task Progress

**As a** parent
**I want to** see what tasks my athlete should focus on
**So that** I can support and encourage them

```gherkin
Feature: Parent View of Athlete Tasks
  Scenario: Parent views athlete's tasks
    Given I am logged in as a parent
    When I click "John's Tasks"
    Then I see all of John's tasks for his current grade
    And I see his progress: "9/20 tasks completed"
    And I can see which tasks are overdue or urgent

  Scenario: Parent views not-started tasks
    Given I want to know what needs attention
    When I filter by "Not Started"
    Then I see only tasks John hasn't begun
    And these are grouped by priority

  Scenario: Parent sees task deadlines
    Given tasks have deadlines (e.g., "Register with NCAA by Oct 15")
    When I view the task list
    Then I see color-coded deadlines:
      | Days Until | Color |
      | Due today | Red |
      | Due within 7 days | Orange |
      | Due in 2+ weeks | Yellow |

  Acceptance Criteria:
    ✓ Parent can view athlete's tasks
    ✓ Parent sees completion progress
    ✓ Parent cannot edit athlete's tasks (athlete owns their progress)
    ✓ Parent sees deadlines and urgency
    ✓ Parent can see task details to provide support
```

---
