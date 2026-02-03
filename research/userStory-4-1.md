### Story 4.1: Parent Views Coaching Staff Information

**As a** parent
**I want to** see all the coaches at each school
**So that** I know who to contact and their communication preferences

```gherkin
Feature: Coach Information Display
  Scenario: Parent views coaches for a school
    Given I view Arizona State's detail page
    When I click on "Coaching Staff"
    Then I see a list of coaches:
      | Name | Role | Email | Phone |
      | [Head Coach] | Head Coach | email@asu.edu | (480)555-0100 |
      | [Asst Coach 1] | Assistant Coach | email@asu.edu | (480)555-0101 |
      | [Recruiting Coord] | Recruiting Coordinator | email@asu.edu | (480)555-0102 |

  Scenario: Coach information auto-populates from database
    Given I add a school to my list
    When the school loads
    Then coach names and contact info are automatically populated
    And no manual entry is required

  Scenario: Parent can manually add a coach
    Given I view a school's coaching staff
    When I click "Add Coach"
    And I enter:
      | Field | Value |
      | Coach Name | New Coach |
      | Role | Assistant Coach |
      | Email | newcoach@asu.edu |
      | Phone | (480)555-0103 |
    And I click "Save"
    Then the coach is added to the list
    And I can log interactions with this coach

  Scenario: Parent views coach communication history
    Given I click on a coach's name
    When the coach detail page opens
    Then I see:
      | Info | Details |
      | Last Contact | Date and time |
      | Interaction Count | Total emails, calls, etc. |
      | Communication History | Timeline of all interactions |
      | Notes | Previous conversation notes |

  Acceptance Criteria:
    ✓ Coach information auto-populates from database
    ✓ Can manually add coaches not in database
    ✓ Coach detail shows all contact information
    ✓ Interaction history visible from coach page
    ✓ Can edit coach information if database is outdated
```

---
