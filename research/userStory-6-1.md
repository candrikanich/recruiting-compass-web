### Story 6.1: Parent Views Recruiting Stage Guidance

**As a** parent  
**I want to** see what stage my athlete is in  
**So that** I know what to focus on right now and what not to worry about yet

```gherkin
Feature: Recruiting Timeline Screen
  Scenario: Parent views timeline for freshman
    Given my athlete is in 9th grade (graduation year 2027)
    When I navigate to "Timeline"
    Then I see:
      | Section | Content |
      | Current Stage | Foundation Stage (Freshman) |
      | Visual Timeline | 4-year progression with freshman highlighted |
      | Stage Description | "You're in the Foundation Stage. Right now, it's all about development, not recruitment..." |

  Scenario: Parent views what matters at each stage
    Given I view the freshman timeline
    When I scroll through the content
    Then I see:
      | Section | Content |
      | What Matters Now | Improve athletic skill, maintain GPA, build relationships with coaches |
      | Expected Activities | 3-5 bullet points (camps, highlight videos, academic focus, etc.) |
      | Common Worries | "Is it too early?", "Shouldn't we be getting recruited?", etc. |
      | What NOT to stress | "Don't worry about college offers yet..." |

  Scenario: Timeline adjusts based on grade
    Given I created a profile with grad year 2025
    When I view the timeline
    Then I see "Junior Stage" content (not freshman)
    And the guidance is specific to juniors

  Scenario: Parent views upcoming milestones
    Given I view the timeline
    When I scroll to "Upcoming Milestones"
    Then I see relevant dates:
      | Milestone | Date |
      | Next SAT test date | March 14, 2026 |
      | NCAA registration deadline | (date) |
      | Early decision deadline | November 1, 2026 |

  Acceptance Criteria:
    ✓ Stage is auto-detected based on grad year
    ✓ Stage guidance is specific and reassuring
    ✓ Upcoming milestones update based on current date and grad year
    ✓ "What not to stress" section is visible and prominent
    ✓ Timeline is conversational (not corporate jargon)
    ✓ Mobile responsive
    ✓ Loads in under 1 second
```

---
