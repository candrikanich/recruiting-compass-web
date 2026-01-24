### Story 6.2: Parent Sees Current Status Indicator

**As a** parent  
**I want to** see if my athlete is "on track" for their stage  
**So that** I can course-correct if needed

```gherkin
Feature: Recruiting Status Indicator
  Scenario: Status shows as "On Track"
    Given my athlete has completed 9 of 12 tasks for sophomore year
    And has contacted 8 schools
    And has a good GPA
    When I view the timeline
    Then I see:
      | Indicator | Status |
      | Overall Status | On Track (green) |
      | Task Progress | 9/12 tasks completed (75%) |
      | School Tracking | 8 schools tracked |
      | GPA Status | Solid (3.4 unweighted) |

  Scenario: Status shows as "Slightly Behind"
    Given my athlete has only completed 4 of 12 tasks
    And has contacted only 2 schools
    When I view the timeline
    Then I see:
      | Indicator | Status |
      | Overall Status | Slightly Behind (yellow) |
      | Task Progress | 4/12 tasks completed (33%) |
      | School Tracking | 2 schools tracked |
      | Next Steps | "Consider adding more schools and logging interactions" |

  Scenario: Status shows as "At Risk"
    Given my athlete is a junior
    And has not registered with NCAA eligibility center
    And has not uploaded highlight video
    And GPA is below program standards
    When I view the timeline
    Then I see:
      | Indicator | Status |
      | Overall Status | At Risk (red) |
      | Urgent Tasks | 3 critical tasks not started |
      | Action Items | Specific recommendations to get back on track |

  Acceptance Criteria:
    ✓ Status accurately reflects task completion
    ✓ Status is color-coded (green, yellow, red)
    ✓ Status updates based on profile changes
    ✓ Clear action items provided for "Behind" and "At Risk" statuses
```

---
