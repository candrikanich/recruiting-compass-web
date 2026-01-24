### Story 1.2: Parent Logs In Securely

**As a** parent  
**I want to** log in with my email and password  
**So that** I can access my family's recruiting information securely

```gherkin
Feature: User Login
  Scenario: Parent logs in with correct credentials
    Given I have verified my email
    When I navigate to the login page
    And I enter my email address
    And I enter my correct password
    And I click "Log In"
    Then I am logged in successfully
    And I am redirected to the dashboard

  Scenario: Parent login fails with incorrect password
    Given I have an account with password "SecurePass123"
    When I enter my email
    And I enter an incorrect password
    And I click "Log In"
    Then I see an error message "Invalid email or password"
    And I remain on the login page

  Scenario: Parent uses "Remember Me" option
    Given I am on the login page
    And I check the "Remember me on this device" checkbox
    When I enter my credentials
    And I click "Log In"
    Then I am logged in
    And my session persists for 30 days without re-authentication

  Scenario: Session expires after inactivity
    Given I am logged in
    And I have not interacted with the app for 30 days
    When I attempt to access a protected page
    Then I am logged out
    And I am redirected to the login page

  Acceptance Criteria:
    ✓ Login succeeds with correct email and password
    ✓ Login fails with error message on incorrect credentials
    ✓ Sessions persist for up to 30 days with "Remember Me"
    ✓ Sessions expire after 30 days of inactivity
    ✓ HTTPS is enforced for all login traffic
    ✓ Failed login attempts do not reveal which part is incorrect (for security)
```

---
