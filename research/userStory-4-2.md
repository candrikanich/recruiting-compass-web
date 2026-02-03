### Story 4.2: Parent Receives Follow-Up Reminders

**As a** parent
**I want to** be reminded when it's been too long since contacting a coach
**So that** I don't let momentum die and we stay on their radar

```gherkin
Feature: Coach Contact Reminders
  Scenario: Reminder appears after no contact
    Given I have not contacted Coach A for 21 days
    When I view the dashboard or coach page
    Then I see a suggestion: "You haven't contacted [Coach A] at [Arizona State] for 21 days. Consider a follow-up email."
    And the suggestion has high priority (orange/red)

  Scenario: Reminder is actionable
    Given a follow-up reminder is displayed
    When I click on the reminder
    Then I am taken to a coach contact form
    And I can log an interaction or send a follow-up email

  Scenario: Reminder frequency is not spammy
    Given a follow-up reminder was dismissed
    When I check the app again within 1 week
    Then the same reminder does not reappear
    But it reappears after 1 week if I still haven't contacted the coach

  Scenario: Reminder respects recruiting windows
    Given it's during a recruiting dead period
    When the system evaluates follow-up reminders
    Then reminders do not suggest contacting coaches during dead periods
    And I see a note "Dead period - no recruiting contact permitted"

  Acceptance Criteria:
    ✓ Reminder triggers after 21+ days of no contact
    ✓ Reminder is actionable (links to contact form)
    ✓ Same reminder shows max once per week
    ✓ Respects NCAA recruiting windows (no reminders during dead periods)
    ✓ Reminder severity corresponds to recency (21 days = yellow, 30 days = red)
```

---
