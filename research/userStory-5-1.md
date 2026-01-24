### Story 5.1: Parent Logs Interactions with Coaches

**As a** parent  
**I want to** log every interaction with coaches  
**So that** I have a complete record of what's been discussed

```gherkin
Feature: Interaction Logging
  Scenario: Parent logs an email interaction
    Given I view a school or coach page
    When I click "Log Interaction"
    And I fill in:
      | Field | Value |
      | Type | Email |
      | Date | [Today's date] |
      | School | Arizona State |
      | Coach | [Head Coach] |
      | Direction | Outbound (we initiated) |
      | Notes | Sent highlight video and expressed interest |
    And I click "Save"
    Then the interaction is logged
    And it appears in the timeline

  Scenario: Parent logs a phone call
    Given I just finished a phone call with a coach
    When I click "Log Interaction"
    And I select Type = "Phone Call"
    And I enter the date, coach, and call notes
    And I click "Save"
    Then the call is logged
    And the "Last Contact" date updates to today

  Scenario: Parent logs a camp attendance
    Given my athlete attended a camp
    When I log an interaction:
      | Type | Camp |
      | Date | [Date of camp] |
      | School | Arizona State |
      | Notes | Great coaching, athlete got attention |
    And I click "Save"
    Then the camp visit is logged
    And counts toward "contact frequency" calculations

  Scenario: Parent sets a follow-up reminder during logging
    Given I am logging an interaction
    When I check "Set Follow-up Reminder"
    And I select a follow-up date (e.g., 2 weeks from now)
    And I save the interaction
    Then the interaction is logged
    And a reminder is set for the follow-up date

  Scenario: Quick interaction logging after an event
    Given my athlete just attended a showcase
    When I see a post-event prompt: "Did you have any interactions? Log them now"
    And I click "Yes, log an interaction"
    Then a quick logging form appears
    And I can log the interaction in under 30 seconds

  Acceptance Criteria:
    ✓ Interaction can be logged in under 1 minute
    ✓ Interaction types: Email, Phone Call, Text/DM, In-Person Meeting, Camp, Showcase, Game, Unofficial Visit, Official Visit, Other
    ✓ Can attach files (PDFs, images) up to 10MB
    ✓ Date selector is easy to use (calendar or dropdown)
    ✓ Notes field accepts 0-5,000 characters
    ✓ Follow-up reminder is optional
    ✓ Interactions are timestamped (not just dated)
    ✓ Last contact date auto-calculates from most recent interaction
```

---
