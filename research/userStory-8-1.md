### Story 8.1: Parent Views Dashboard Overview

**As a** parent  
**I want to** see the current state at a glance  
**So that** I don't have to dig around to see what matters now

```gherkin
Feature: Dashboard Home Screen
  Scenario: Parent views complete dashboard
    Given I log in to my account
    When I land on the dashboard
    Then I see sections for:
      | Section | Content |
      | Quick Stats | 15 schools tracked, 8 A-tier, 12 contacts this month |
      | Top Suggestions | 3 actionable items with priority |
      | Recruiting Timeline | Current stage and progress |
      | Contact Frequency | Schools contacted in last 7 days |
      | Recent Activity | Latest interactions (emails, calls, camps) |
      | Quick Actions | Add school, Log interaction, Review timeline |

  Scenario: Dashboard is mobile responsive
    Given I view the dashboard on a phone
    Then all sections are visible
    And content is readable without excessive scrolling
    And buttons are easy to tap

  Scenario: Dashboard loads quickly
    Given I click the Dashboard link
    When the page loads
    Then it appears in under 2 seconds
    And all data is visible

  Acceptance Criteria:
    ✓ Dashboard shows quick stats, suggestions, timeline, activity
    ✓ Dashboard loads in under 2 seconds
    ✓ Mobile responsive design
    ✓ All sections visible without excessive scrolling
    ✓ Quick action buttons prominent
    ✓ No console errors
```

---
