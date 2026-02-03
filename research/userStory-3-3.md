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
