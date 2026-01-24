### Story 8.2: Parent Sees Contact Frequency Summary

**As a** parent  
**I want to** see contact frequency with schools  
**So that** I know which schools need more attention

```gherkin
Feature: Contact Frequency Analytics
  Scenario: Parent views contact summary
    Given I view the dashboard
    When I see the "Contact Frequency" section
    Then I see:
      | Metric | Value |
      | Total schools tracked | 15 |
      | Schools contacted in last 7 days | 8 |
      | Average contact frequency | 1.2 contacts per school per month |
      | Schools with no recent contact | 2 (links to follow-up) |

  Scenario: Parent sees schools needing attention
    Given schools in my list have varying contact frequency
    When I view the contact frequency section
    Then schools are color-coded:
      | Frequency | Color |
      | Regular contact (weekly+) | Green |
      | Some contact (monthly) | Yellow |
      | No recent contact (30+ days) | Red |

  Scenario: Parent clicks on school needing attention
    Given a school shows "No contact for 45 days"
    When I click on the school
    Then I am taken to that school's detail page
    And I see options to log an interaction or send an email

  Acceptance Criteria:
    ✓ Contact frequency accurately calculated
    ✓ Color-coded by recency
    ✓ Links to follow-up actions
    ✓ Updates in real-time
```

---
