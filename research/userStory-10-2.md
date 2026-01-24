### Story 10.2: Parent Downloads or Emails Recruiting Packet

**As a** parent  
**I want to** download or email the recruiting packet  
**So that** I can archive it or share with coaches

```gherkin
Feature: Recruiting Packet Sharing
  Scenario: Parent downloads PDF
    Given I generated a recruiting packet
    When I click "Download PDF"
    Then the PDF downloads to my computer
    And the filename is "John_Smith_RecruitingPacket.pdf"

  Scenario: Parent emails PDF to coach
    Given I have a recruiting packet
    When I click "Email to Coach"
    Then an email form appears with:
      | Field | Default |
      | To | [Coach email from school list] |
      | Subject | John Smith - Recruiting Profile |
      | Body | [Default intro message] |
    And I can customize the email before sending

  Scenario: Parent can email to multiple coaches
    Given I want to send the packet to multiple coaches
    When I click "Email to Multiple Coaches"
    Then I can select coaches from my list
    And it prepares emails to each one

  Acceptance Criteria:
    ✓ Can download PDF as attachment
    ✓ Can email PDF directly to coaches
    ✓ Can send to multiple coaches
    ✓ PDF always reflects current data
    ✓ Email has professional template
    ✓ Can customize email before sending
```

---
