# Story 8.2: Parent Explores Demo Data

**As a** parent in Preview Mode
**I want to** see realistic sample data
**So that** I understand how the app works

## Scenarios

### Scenario: Parent sees demo player profile

- **Given** I am in Preview Mode
- **When** I view the dashboard
- **Then** I see demo player "Alex Demo"
- **And** graduation year is current year + 1 (Junior)
- **And** sport is Soccer, position is Midfielder
- **And** profile completeness shows 65%

### Scenario: Parent sees sample schools

- **Given** I am in Preview Mode
- **When** I view the schools list
- **Then** I see 4 sample schools with realistic data:
  | School | Division | Status |
  | Ohio State University | D1 | Following |
  | John Carroll University | D3 | Researching |
  | University of Akron | D1 | Following |
  | Oberlin College | D3 | Contacted |

### Scenario: Parent sees sample interactions

- **Given** I am in Preview Mode
- **When** I view interaction history
- **Then** I see 5 sample interactions
- **And** they span different types (email, camp, call, visit)
- **And** they have realistic dates and notes

### Scenario: Parent sees sample guidance items

- **Given** I am in Preview Mode
- **When** I view the guidance/timeline section
- **Then** I see sample tasks for a Junior:
  - "Create your target school list" — Completed
  - "Film highlight video (2-3 min)" — In Progress
  - "Email 10 coaches this month" — High Priority
  - And more relevant tasks

## Acceptance Criteria

- ✓ Demo data is static (baked into app, no backend fetch)
- ✓ Demo data is realistic and demonstrates value props
- ✓ Parent can interact with all features using demo data
- ✓ Demo player zip code matches user's area (44138 for Olmsted Falls)
