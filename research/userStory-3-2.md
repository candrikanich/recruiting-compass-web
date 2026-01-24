### Story 3.2: Parent Views School List with Fit Scores

**As a** parent  
**I want to** see a fit score for each school  
**So that** I know where my athlete has the best realistic chance

```gherkin
Feature: School Fit Scoring
  Scenario: Fit score displays for each school
    Given I have added 5 schools to my list
    When I view the Schools page
    Then each school shows a fit score from 0-100:
      | School | Score |
      | Arizona State | 82 |
      | Colorado | 68 |
      | Northern Colorado | 91 |
      | New Mexico | 75 |
      | Cal State Bakersfield | 78 |

  Scenario: Fit score components are visible
    Given I click on a school with fit score 82
    When I click "View Fit Score Breakdown"
    Then I see:
      | Component | Score | Details |
      | Academic Fit | 85 | GPA above program average |
      | Athletic Fit | 80 | Stats solid for position |
      | Opportunity Fit | 78 | Coach expressed interest |
      | Personal Fit | 82 | Good school-life fit |

  Scenario: Fit score updates when profile changes
    Given ASU shows a fit score of 68 (low GPA)
    When I update the athlete's GPA to 3.4
    And the profile saves
    Then ASU's fit score recalculates to 82 within 1 second
    And I see a notification "Fit scores updated"

  Scenario: Fit score uses honest assessment
    Given an athlete has stats below D1 average
    When viewing D1 schools
    Then the fit score for each D1 school is below 60
    And the app suggests D2/D3 schools as better fits

  Acceptance Criteria:
    ✓ Fit score displays for all schools (0-100)
    ✓ Fit score updates within 1 second of profile change
    ✓ Score breakdown shows 4 components
    ✓ Honest assessment (not false hope)
    ✓ Algorithm documented and transparent
```

---
