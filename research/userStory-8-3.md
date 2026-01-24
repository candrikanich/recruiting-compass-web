### Story 8.3: Parent Views Recent Activity Feed

**As a** parent  
**I want to** see recent interactions and changes  
**So that** I stay updated on what's happening

```gherkin
Feature: Recent Activity Feed
  Scenario: Parent views activity feed
    Given I am on the dashboard
    When I scroll to the "Recent Activity" section
    Then I see a feed of recent events:
      | Event | Date |
      | Logged interaction: Email to ASU | Jan 10 |
      | Profile updated: SAT score 1350 | Jan 8 |
      | Added school: Northern Colorado | Jan 7 |
      | Logged interaction: Camp at CU | Jan 5 |

  Scenario: Activity feed shows interactions
    Given an interaction was logged
    When it appears in the activity feed
    Then it shows:
      | Detail | Content |
      | Type | Email, Call, Camp, etc. |
      | School | Name of school |
      | Date | When it occurred |
      | Summary | First 50 characters of notes |

  Scenario: Activity feed shows profile updates
    Given a profile field was updated
    When it appears in the activity feed
    Then it shows:
      | Detail | Content |
      | Field changed | e.g., "SAT Score" |
      | Old value | 1200 |
      | New value | 1350 |
      | Date | When changed |

  Acceptance Criteria:
    ✓ Activity feed shows last 10 events
    ✓ Events timestamped accurately
    ✓ Feed updates in real-time
    ✓ Can click event to view details
```

---
