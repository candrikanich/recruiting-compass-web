### Story 7.2: Parent Can Dismiss and Complete Suggestions

**As a** parent
**I want to** dismiss suggestions I don't need and mark them complete
**So that** my suggestion list stays relevant

```gherkin
Feature: Suggestion Management
  Scenario: Parent dismisses a suggestion
    Given a suggestion says "Attend more showcases"
    When I click "Dismiss"
    Then the suggestion is hidden
    And it won't reappear unless the condition changes

  Scenario: Parent marks suggestion as completed
    Given a suggestion says "Upload highlight video"
    When I click "Mark as Done"
    Then the suggestion is marked complete
    And a new suggestion appears in its place

  Scenario: Dismissed suggestion reappears if condition changes
    Given I dismissed "Contact [Coach A]" 7 days ago
    When another 21 days pass with no contact
    Then the suggestion reappears
    Because the "no contact for 21 days" rule is triggered again

  Scenario: Suggestion frequency respects time limits
    Given a suggestion was shown and dismissed
    When I check back within 1 week
    Then the same suggestion does not reappear
    And I see different suggestions instead

  Acceptance Criteria:
    ✓ Can dismiss any suggestion
    ✓ Can mark suggestion as completed
    ✓ Same suggestion shown max once per week
    ✓ Dismissing does not delete the suggestion
    ✓ Suggestions reappear if conditions change
```

---

## Implementation Status

✅ **Completed** - User Story 7.2 has been fully implemented with comprehensive test coverage.

### Key Implementation Details

#### Database Schema (Migration 014)

- Added `condition_snapshot` (JSONB) - Stores rule-specific state at suggestion creation time
- Added `reappeared` (boolean, default false) - Marks re-evaluated suggestions
- Added `previous_suggestion_id` (UUID) - Links re-appeared suggestions to original dismissed ones
- Added indexes for efficient dismissed suggestion queries

#### Rule Engine Enhancements

- Extended `Rule` interface with optional methods:
  - `shouldReEvaluate()` - Determines if dismissed suggestion meets re-evaluation criteria
  - `createConditionSnapshot()` - Captures rule state for comparison during re-evaluation
- Updated `RuleEngine.generateSuggestions()` to:
  1. Fetch dismissed suggestions ≥14 days old
  2. Check re-evaluation criteria via rule-specific logic
  3. Create new suggestions with escalated urgency when criteria met
  4. Preserve historical data (dismissed suggestions remain in database)

#### interactionGapRule Implementation

- Implements condition snapshot with: `days_since_contact`, `school_priority`, `school_status`
- Re-evaluation logic:
  - Returns true if gap increased by ≥14 days
  - Returns true if school priority changed
  - Returns false if completed or gap only increased <14 days
- Escalates urgency: low→medium, medium→high, high→high

#### UI Component Updates

- SuggestionCard displays "Returned" badge when `reappeared: true`
- Badge has orange styling with descriptive title
- Positioned next to message for clear visibility

#### Helper Functions

- `shouldReEvaluateDismissedSuggestion()` - 14-day cooldown check
- `escalateUrgency()` - Maps urgency escalation

### Test Coverage

#### Unit Tests (67 tests, all passing)

- **ruleEngineHelpers.spec.ts** (11 tests) - Cooldown and urgency logic
- **index.spec.ts** (5 tests) - Rule interface optional methods
- **interactionGap.spec.ts** (18 tests) - Includes re-evaluation scenarios
- **ruleEngine.spec.ts** (13 tests) - Dismissed suggestion fetching and processing
- **SuggestionCard.spec.ts** (20 tests) - "Returned" badge display and styling

#### E2E Tests (suggestions-7-2.spec.ts)

- Dismiss and hide suggestion flow
- No re-appearance within 14-day window
- Re-appeared badge visibility and styling
- Action handling on re-appeared suggestions
- Data integrity (original dismissed, new suggestion created)
- Multiple re-appeared suggestions handling
- Show more button functionality
- Completed suggestions never reappear

### Validation Results

- ✅ `npm run type-check` - All types valid
- ✅ `npm run lint` - No linting errors
- ✅ `npm run test` - 2390 tests passing (67 new/updated for this feature)
- ✅ `npm run build` - Production build successful

### Design Decisions

1. **Manual Re-evaluation Only**: Implemented manual trigger via `/api/suggestions/evaluate`. Background jobs deferred to future story.

2. **14-Day Cooldown**: Dismissed suggestions eligible for re-evaluation only after 14 days, preventing suggestion spam.

3. **Condition Snapshots**: Store rule state at creation time for meaningful comparison. Allows rules to detect significant changes (vs. minor fluctuations).

4. **New Suggestion Creation**: Rather than "un-dismissing", creates new suggestion with:
   - `reappeared: true` flag
   - Escalated urgency (visual enhancement of re-evaluated threat)
   - `previous_suggestion_id` for historical tracing
   - New `condition_snapshot` for next re-evaluation cycle

5. **Graduated Escalation**: Increases urgency on re-appearance (low→medium, medium→high). Caps at high to avoid infinite escalation.

6. **interactionGapRule-Only**: Proves pattern for single rule. Extension to other rules follows same interface.

### Future Enhancements

- Automated background re-evaluation (scheduled job)
- Re-evaluation support for additional rules (priority-school-reminder, event-follow-up)
- User preferences for re-evaluation sensitivity
- Analytics dashboard for re-evaluation events
- "Snooze for X days" feature (alternative to dismiss)
