### Story 1.3: Parent Invites Secondary User

**As a** parent  
**I want to** invite my spouse to view my family's account  
**So that** we can both stay informed about my athlete's recruiting

```gherkin
Feature: Secondary User Access
  Scenario: Parent invites spouse via email
    Given I am logged in to my account
    When I navigate to Account Settings
    And I click "Invite Secondary User"
    And I enter my spouse's email address
    And I click "Send Invitation"
    Then an invitation email is sent to my spouse
    And I see a message "Invitation sent"

  Scenario: Secondary user accepts invitation
    Given I receive an invitation email from my spouse
    When I click the "Accept Invitation" link in the email
    And the app opens with an acceptance page
    And I set up a password for my account
    And I click "Accept"
    Then I am added as a secondary user
    And I can log in with my own credentials

  Scenario: Secondary user has read-only access
    Given I am logged in as a secondary user
    When I view the dashboard
    Then I can see all schools and interactions
    But I cannot edit any information
    And I see a "Read-Only Access" indicator

  Scenario: Primary user can remove secondary user
    Given a secondary user is linked to my account
    When I navigate to Account Settings
    And I click "Remove User" next to the secondary user
    And I confirm the removal
    Then the secondary user can no longer access the account
    And they see a message "Access revoked"

  Acceptance Criteria:
    ✓ Can invite up to 5 secondary users per account
    ✓ Secondary users receive email invitation within 1 minute
    ✓ Secondary users can only view, not edit
    ✓ Primary user can revoke access at any time
    ✓ Secondary user is clearly labeled in the UI
```

---
