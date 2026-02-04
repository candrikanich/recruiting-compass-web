### Story 1.4: Parent Resets Forgotten Password

**As a** parent
**I want to** reset my password if I forget it
**So that** I can regain access to my account

```gherkin
Feature: Password Reset
  Scenario: Parent initiates password reset
    Given I am on the login page
    When I click "Forgot Password?"
    And I enter my email address
    And I click "Send Reset Link"
    Then I see a message "Check your email for reset instructions"
    And a password reset email is sent

  Scenario: Parent receives and uses reset link
    Given I requested a password reset
    When I receive the reset email within 5 minutes
    And I click the reset link
    And the link is valid (not expired)
    Then I am taken to a password reset page
    And I can enter a new password

  Scenario: Parent completes password reset
    Given I am on the password reset page
    When I enter a new password
    And I confirm the new password
    And I click "Reset Password"
    Then my password is updated
    And I am redirected to the login page
    And I can log in with my new password

  Scenario: Password reset link expires
    Given I received a password reset link
    And more than 24 hours have passed
    When I try to use the reset link
    Then I see an error "This reset link has expired"
    And I must request a new reset link

  Acceptance Criteria:
    ✓ Reset email sent within 5 minutes of request
    ✓ Reset link is valid for 24 hours only
    ✓ New password must meet same requirements as signup (8+ characters)
    ✓ Old password does not need to be entered to reset
    ✓ User can log in immediately with new password
```

---
