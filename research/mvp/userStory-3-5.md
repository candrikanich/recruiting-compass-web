### Story 3.5: Parent Views and Adds School Notes

**As a** parent
**I want to** add and view notes about each school
**So that** I remember key details about why we're interested

```gherkin
Feature: School Notes and Details
  Scenario: Parent adds notes about a school
    Given I view Arizona State's detail page
    When I click "Add Notes"
    And I type: "Great campus, strong athletic program, responsive coaches. Top choice."
    And I click "Save"
    Then the notes are saved
    And they display on the school detail page

  Scenario: Parent views coaching philosophy
    Given I view a school's detail page
    When I view the "Coaching Staff" section
    Then I see notes about:
      | Coaching Info |
      | Style (high-intensity, player development, etc.) |
      | Recruit preferences |
      | Communication style |
      | Success with similar athletes |

  Scenario: Parent edits school notes
    Given I have notes saved for a school
    When I click "Edit Notes"
    And I add additional information
    And I click "Save"
    Then the notes are updated
    And the updated date is recorded

  Acceptance Criteria:
    ✓ Notes field accepts up to 5,000 characters
    ✓ Notes save in under 2 seconds
    ✓ Notes display on school detail page
    ✓ Can edit notes any time
    ✓ Edit history recorded (shows when last updated)
```

---
