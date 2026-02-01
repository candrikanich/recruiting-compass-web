### Story 1.1: Parent Creates Account

**As a** parent  
**I want to** create an account with my email and password  
**So that** I can start organizing my athlete's recruiting

```gherkin
Feature: Account Creation
  Scenario: Parent signs up with valid email and password
    Given I am on the signup page
    When I enter a valid email address
    And I enter a strong password
    And I click "Create Account"
    Then my account is created
    And I receive a verification email
    And I am redirected to verify my email

  Scenario: Parent receives verification email
    Given I have submitted the signup form
    When I wait for the verification email
    Then I receive an email within 1 minute
    And the email contains a verification link
    And clicking the link activates my account

  Scenario: Parent cannot sign up with existing email
    Given an account already exists with email "test@example.com"
    When I try to sign up with "test@example.com"
    Then I see an error message "Email already in use"
    And my account is not created

  Scenario: Password validation on signup
    Given I am on the signup page
    When I enter a password that is less than 8 characters
    Then I see an error "Password must be at least 8 characters"
    And the signup button is disabled

  Acceptance Criteria:
    ✓ Signup flow completes in under 2 minutes
    ✓ Verification email arrives within 1 minute
    ✓ Password must be at least 8 characters
    ✓ Email must be valid format
    ✓ Cannot use duplicate email addresses
    ✓ Passwords are securely hashed before storage
```

---
