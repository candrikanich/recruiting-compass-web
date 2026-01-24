### Story 5.2: Parent Views Interaction Timeline

**As a** parent  
**I want to** see a timeline of all interactions with a school or coach  
**So that** I can see how often we're in contact and what was discussed

```gherkin
Feature: Interaction Timeline View
  Scenario: Parent views school-specific timeline
    Given I click on Arizona State
    When I click "Interaction History"
    Then I see all interactions with ASU in chronological order:
      | Date | Type | Direction | Summary |
      | Jan 10 | Email | Outbound | Sent highlight video |
      | Jan 5 | Camp | Inbound/Outbound | Attended camp, coach took video |
      | Dec 20 | Email | Inbound | Coach expressed interest |

  Scenario: Parent views coach-specific timeline
    Given I click on [Head Coach at ASU]
    When coach detail page opens
    Then I see all interactions with this specific coach:
      | Date | Type | Summary |
      | Jan 10 | Email | Sent highlight video |
      | Dec 20 | Email | Coach replied with interest |

  Scenario: Timeline shows interaction frequency
    Given I view the interaction timeline
    Then I see a summary showing:
      | Metric | Value |
      | Total interactions with school | 8 |
      | Last contact | 5 days ago |
      | Contact frequency (emails/month) | 1.5 |
      | Outbound vs Inbound | 3 outbound, 5 inbound |

  Scenario: Timeline filters by type
    Given I view the interaction timeline
    When I filter by "Email only"
    Then only email interactions display
    And camp visits, calls, etc. are hidden

  Acceptance Criteria:
    ✓ Timeline displays all interactions chronologically
    ✓ Timeline shows both school-level and coach-level views
    ✓ Can filter by interaction type
    ✓ Can filter by date range
    ✓ Interaction notes are visible in timeline
    ✓ Timeline loads in under 1 second
```

---
