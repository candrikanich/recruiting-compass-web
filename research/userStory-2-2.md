### Story 2.2: Parent and Athlete Update Profile

**As a** parent or athlete  
**I want to** update profile information as stats and academics change  
**So that** the app always has current information

```gherkin
Feature: Profile Updates
  Scenario: Parent updates athlete profile
    Given I am viewing the athlete profile
    When I click "Edit Profile"
    And I update the SAT score to 1350
    And I click "Save"
    Then the SAT score is updated
    And the timeline recalculates based on new info
    And I see a message "Profile updated"

  Scenario: Athlete views their profile in read-only mode
    Given I am logged in as an athlete
    When I navigate to "My Profile"
    Then I see all my information
    But the edit buttons are hidden
    And I see a message "Ask your parent to edit"

  Scenario: Profile changes trigger timeline recalculation
    Given an athlete has a junior profile
    When the parent updates the GPA from 2.8 to 3.2
    And the profile saves
    Then the fit scores for all schools recalculate within 1 second
    And any rule-based suggestions update

  Scenario: Parent sees edit history
    Given I am viewing the athlete profile
    When I click "View History"
    Then I see when the profile was last updated
    And what was changed

  Acceptance Criteria:
    ✓ Profile edits save in under 2 seconds
    ✓ GPA/test score changes trigger recalculation
    ✓ Fit scores update within 1 second of profile change
    ✓ Secondary users cannot edit profile
    ✓ Edit history is logged with timestamps
```

---
