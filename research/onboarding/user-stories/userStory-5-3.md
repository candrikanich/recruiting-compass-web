# Story 5.3: Player Regenerates Family Code

**As a** player
**I want to** regenerate my Family Code
**So that** I can invalidate codes shared with the wrong person

## Scenarios

### Scenario: Player requests code regeneration

- **Given** I am viewing my Family Code
- **When** I tap "Regenerate Code"
- **Then** I see confirmation dialog: "This will invalidate your current code. Any pending invites will no longer work."
- **And** I see options "Regenerate" and "Cancel"

### Scenario: Player confirms regeneration

- **Given** I see the regeneration confirmation dialog
- **When** I tap "Regenerate"
- **Then** a new Family Code is generated
- **And** the old code is invalidated
- **And** I see my new code displayed

### Scenario: Player cancels regeneration

- **Given** I see the regeneration confirmation dialog
- **When** I tap "Cancel"
- **Then** no changes are made
- **And** I return to Family Management screen

### Scenario: Parent attempts to use invalidated code

- **Given** a player has regenerated their Family Code
- **And** a parent has the old code
- **When** the parent tries to enter the old code
- **Then** they see error: "That code doesn't match any player. Check with your player and try again."

## Acceptance Criteria

- ✓ Regeneration requires explicit confirmation
- ✓ Old code becomes immediately invalid
- ✓ New code follows same format (FAM-XXXXXX)
- ✓ Linked parents are NOT affected (only new links)
