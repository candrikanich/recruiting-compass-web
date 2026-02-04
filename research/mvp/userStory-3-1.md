## FEATURE 3: SCHOOL TRACKER (CRM-LITE)

### Story 3.1: Parent Adds Schools to Track List

**As a** parent
**I want to** add schools my athlete is interested in
**So that** I can track them all in one place

```gherkin
Feature: Add Schools to Tracking List
  Scenario: Parent adds school from database
    Given I am on the Schools page
    When I click "Add School"
    And I start typing "Arizona State"
    And the database shows matching schools
    And I click "Arizona State University"
    And I click "Add"
    Then ASU is added to my athlete's school list
    And school information is auto-populated (division, location, etc.)

  Scenario: Parent adds school not in database
    Given I am on the Schools page
    When I click "Add School"
    And I cannot find the school I'm looking for
    And I click "Add Custom School"
    And I enter:
      | Field | Value |
      | School Name | Small State College |
      | State | Colorado |
      | Division | NAIA |
    And I click "Add"
    Then the custom school is added to my list

  Scenario: School information auto-populates
    Given I add Arizona State University from the database
    When the school is added
    Then I automatically see:
      | Info | Details |
      | Division | D1 |
      | Conference | Pac-12 |
      | Location | Tempe, AZ |

  Scenario: Parent cannot add duplicate schools
    Given Arizona State is already on my list
    When I try to add Arizona State again
    Then I see a warning "Arizona State is already on your list"
    And the school is not duplicated

  Acceptance Criteria:
    ✓ Adding school takes under 30 seconds
    ✓ School info auto-populates from database
    ✓ Can add up to 50 schools per athlete
    ✓ UI warns when approaching 30 schools
    ✓ Cannot add duplicate schools

```

---

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

### Story 3.3: Parent Filters and Sorts Schools

**As a** parent
**I want to** filter schools by priority and status
**So that** I can focus on the most important ones

```gherkin
Feature: School Filtering and Sorting
  Scenario: Parent filters schools by priority tier
    Given I have 20 schools on my list
    When I click the Priority filter
    And I select "Tier A (Top Choices)"
    Then only my top-choice schools display (e.g., 5 schools)
    And other tiers are hidden

  Scenario: Parent filters schools by status
    Given I have schools in various stages
    When I filter by Status = "Recruited"
    Then only schools where coaches have shown interest display
    And schools I've only contacted don't show

  Scenario: Parent filters by fit score range
    Given I want to see only realistic fit schools
    When I use the Fit Score filter
    And I select "75-100"
    Then only schools with fit scores in that range display
    And schools below 75 are hidden

  Scenario: Parent sorts schools by distance
    Given I want to see nearby schools first
    When I sort by "Distance from Home"
    Then schools are ordered closest to farthest
    And distance in miles is displayed next to each

  Scenario: Parent applies multiple filters
    Given I want to find realistic schools in nearby states
    When I filter by:
      | Filter | Value |
      | Fit Score | 70+ |
      | Distance | <500 miles |
      | Division | D2 or D3 |
    Then schools matching ALL criteria display
    And results show 8 matching schools

  Acceptance Criteria:
    ✓ Filter by priority tier (A, B, C)
    ✓ Filter by status (Interested, Contacted, Recruited, etc.)
    ✓ Filter by fit score range
    ✓ Filter by distance (within X miles)
    ✓ Filter by division (D1, D2, D3, NAIA, JUCO)
    ✓ Filter by state
    ✓ Sort by distance, fit score, last contact date
    ✓ Multiple filters work together
    ✓ Filter results load in under 100ms
```

---

### Story 3.4: Parent Sets School Priority and Status

**As a** parent
**I want to** mark schools as priority tiers and track their status
**So that** I can focus on the most important schools

```gherkin
Feature: School Priority and Status Tracking
  Scenario: Parent sets school priority tier
    Given I view a school in my list
    When I click on the school
    And I select "Priority Tier"
    And I choose "A - Top Choice"
    And I click "Save"
    Then the school is marked as Priority A
    And it appears in my "Top Choices" list

  Scenario: Parent tracks school recruiting status
    Given I am viewing a school's detail page
    When I click "Update Status"
    And I select from:
      | Status |
      | Interested |
      | Contacted |
      | Camp Invite |
      | Recruited |
      | Official Visit Invited |
      | Official Visit Scheduled |
      | Offer Received |
      | Committed |
      | Not Pursuing |
    And I click "Save"
    Then the status is updated
    And other recruits can see this status context

  Scenario: Status change is timestamped
    Given I update a school's status to "Offer Received"
    When I save the change
    Then the status updates
    And the date of status change is recorded
    And I can view a history of status changes

  Acceptance Criteria:
    ✓ Can set priority tier independently of status
    ✓ Priority tiers: A (top choice), B (strong interest), C (fallback)
    ✓ Status values are predefined
    ✓ Status changes are timestamped
    ✓ Can view status history for each school
    ✓ Status changes visible in interaction timeline
```

---

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
