### Story 10.1: Athlete Generates Recruiting Packet

**As an** athlete
**I want to** generate a recruiting packet
**So that** I can send my info to coaches

```gherkin
Feature: PDF Recruiting Packet Export
  Scenario: Athlete generates PDF
    Given I view the dashboard
    When I click "Generate Recruiting Packet"
    Then a PDF is created in under 5 seconds
    And it's named "John_Smith_RecruitingPacket.pdf"

  Scenario: PDF includes athlete profile
    Given the PDF has been generated
    When I open the PDF
    Then I see:
      | Section | Content |
      | Photo | Athlete profile photo (if uploaded) |
      | Name & Position | John Smith, Pitcher |
      | Contact Info | Email, phone, high school |
      | Stats | Height, weight, jersey number |
      | Academics | GPA, test scores, core courses |
      | Video Links | Hudl, YouTube links |
      | Social Media | Instagram, Twitter handles |

  Scenario: PDF includes school list
    Given the PDF is generated
    When I scroll to the "Schools" section
    Then I see all tracked schools organized by priority:
      | School | Priority | Status | Fit Score |
      | Arizona State | A | Recruited | 82 |
      | Colorado | A | Contacted | 75 |
      | Northern Colorado | B | Interested | 91 |

  Scenario: PDF includes interaction summary
    Given the PDF is generated
    When I view the "Activity" section
    Then I see:
      | Metric | Value |
      | Total schools tracked | 15 |
      | Total interactions | 23 |
      | Most recent contact | 5 days ago |
      | Email interactions | 8 |
      | Camp visits | 3 |
      | Coach calls | 2 |

  Scenario: PDF is professional and readable
    Given the PDF is generated
    Then the PDF:
      - Uses professional fonts and layout
      - Is 5-15 pages depending on data size
      - Includes date generated
      - Is readable on phone and desktop
      - Is under 10MB in size

  Acceptance Criteria:
    ✓ PDF generates in under 5 seconds
    ✓ PDF is readable and professional
    ✓ All athlete info accurate and up-to-date
    ✓ School list complete and organized
    ✓ Interaction summary included
    ✓ PDF file size under 10MB
    ✓ Includes date generated
```

---
