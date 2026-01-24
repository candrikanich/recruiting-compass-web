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
