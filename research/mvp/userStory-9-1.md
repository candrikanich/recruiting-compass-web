### Story 9.1: Athlete Views Their Task List

**As an** athlete
**I want to** see what I should be doing right now
**So that** I can plan my efforts and feel progress

```gherkin
Feature: Athlete Task List
  Scenario: Athlete views tasks for their grade
    Given I am logged in as a sophomore athlete
    When I click "My Tasks"
    Then I see all tasks for sophomore year:
      | Task | Status | Deadline |
      | Upload highlight video | Not Started | - |
      | Create school list (30-50 schools) | In Progress | - |
      | Register with NCSA | Not Started | - |
      | Attend summer showcases | Not Started | June 30 |
      | Research SAT/ACT schedule | Completed | - |

  Scenario: Athlete sees progress
    Given I am viewing my task list
    When I look at the top of the list
    Then I see: "You've completed 4 of 20 tasks (20%)"
    And a progress bar shows my completion percentage

  Scenario: Athlete marks task complete
    Given I see the task "Upload highlight video"
    When I click the checkbox
    Then it's marked as complete
    And I see a "Great job!" message
    And my progress counter increases to 5/20

  Scenario: Athlete views task details
    Given I click on "Create school list"
    When the task detail opens
    Then I see:
      | Section | Content |
      | Task Name | Create school list (30-50 schools) |
      | Why It Matters | Schools need to know about you; you need options in winter |
      | What to Do | Start with 50, narrow to 20-30 by end of year |
      | Resources | Link to college search database, tips on school selection |
      | Deadline | End of school year |

  Acceptance Criteria:
    ✓ Tasks filtered correctly by grade
    ✓ Can mark task complete with checkbox
    ✓ Progress counter accurate
    ✓ Tasks cannot be deleted, only marked complete/incomplete
    ✓ Task details are clear and helpful
    ✓ Mobile view is clean and easy to navigate
```

---
