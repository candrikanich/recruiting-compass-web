### Story 2.1: Parent Creates Athlete Profile

**As a** parent  
**I want to** set up my athlete's profile with basic information  
**So that** the app can generate personalized timeline and suggestions

```gherkin
Feature: Athlete Profile Creation
  Scenario: Parent creates athlete profile with required fields
    Given I am logged in
    When I click "Add Athlete"
    And I fill in the required fields:
      | Field | Value |
      | Name | John Smith |
      | Grad Year | 2026 |
      | Position | Pitcher |
      | Height | 6'2" |
      | Weight | 190 lbs |
    And I click "Create Profile"
    Then an athlete profile is created for John Smith
    And I am redirected to the athlete dashboard

  Scenario: Parent fills in optional athletic information
    Given I am creating an athlete profile
    When I fill in optional fields:
      | Field | Value |
      | Secondary Position | Outfield |
      | Jersey Number | 14 |
      | NCSA Athlete ID | 12345 |
    And I save the profile
    Then the optional information is stored
    And I can edit it later

  Scenario: Parent adds academic information
    Given I am editing an athlete profile
    When I navigate to the "Academics" section
    And I enter:
      | Field | Value |
      | Unweighted GPA | 3.4 |
      | Weighted GPA | 3.7 |
      | SAT Score | 1250 |
      | ACT Score | 28 |
    And I save
    Then academic information is stored
    And the timeline adjusts based on GPA/test scores

  Scenario: Parent adds video links
    Given I am editing an athlete profile
    When I click "Add Video Links"
    And I enter a Hudl URL
    And I enter YouTube video URLs (up to 5)
    And I save
    Then video links are stored
    And they appear on the profile

  Scenario: Parent uploads athlete profile photo
    Given I am editing an athlete profile
    When I click "Upload Photo"
    And I select a JPEG image under 5MB
    And the image is uploaded
    Then a profile photo is displayed
    And the photo is compressed for storage

  Acceptance Criteria:
    ✓ Profile creation completes in under 5 minutes
    ✓ Required fields are clearly marked
    ✓ Academic information is optional but highlighted
    ✓ Video links accept Hudl and YouTube URLs
    ✓ Profile photo upload limited to 5MB
    ✓ Photos are automatically compressed
    ✓ Grade validation: must be 9-12 or "graduated"
    ✓ GPA validation: 0.0 - 4.0 range
    ✓ Test score validation: SAT 400-1600, ACT 1-36
```

---
