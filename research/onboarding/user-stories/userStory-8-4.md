# Story 8.4: Preview Mode Persists Across Sessions

**As a** parent in Preview Mode
**I want** Preview Mode to persist if I close the app
**So that** I don't lose my exploration state

## Scenarios

### Scenario: Parent closes app in Preview Mode

- **Given** I am in Preview Mode
- **When** I force-close the app
- **And** I reopen the app later
- **Then** I am still in Preview Mode
- **And** the red banner is still visible
- **And** demo data is still displayed

## Acceptance Criteria

- ✓ is_preview_mode flag persists in database
- ✓ Preview state survives app closure
- ✓ Banner shows immediately on app reopen
