### Story 7.1: Parent Receives Actionable Suggestions

**As a** parent
**I want to** receive suggestions about what to do next
**So that** I don't have to figure out the recruiting process on my own

```gherkin
Feature: Rule-Based Suggestions
  Scenario: Top 3 suggestions appear on dashboard
    Given I log into my account
    When I view the dashboard
    Then I see a "Suggestions" section with top 3 items:
      | Suggestion | Priority | Action |
      | Upload highlight video | High | Click to learn how |
      | You haven't contacted [School] in 3 weeks | Medium | Click to log interaction |
      | Register with NCAA eligibility center | High | Click for info |

  Scenario: Suggestions are stage-appropriate
    Given my athlete is a sophomore
    When I view suggestions
    Then I see suggestions like:
      - "Build your school list to 20-30 targets"
      - "Attend summer showcases"
      - NOT "Schedule official visits" (that's junior year)

  Scenario: Suggestions for juniors are different
    Given my athlete is a junior
    When I view suggestions
    Then I see:
      - "Register with NCAA eligibility center"
      - "Begin formal outreach to coaches"
      - "Complete professional highlight video"

  Scenario: Suggestion links to action
    Given I see a suggestion "Upload highlight video"
    When I click on it
    Then I am taken to a page explaining:
      - Why highlight videos matter
      - How to upload to Hudl
      - Acceptance criteria for videos

  Acceptance Criteria:
    ✓ Top 3 suggestions visible on dashboard
    ✓ Suggestions relevant to athlete's stage and current data
    ✓ Suggestions are actionable (not vague)
    ✓ Each suggestion has a primary action button
    ✓ Suggestions sorted by urgency/relevance
    ✓ Mobile friendly
```

---
