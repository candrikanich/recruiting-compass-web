## Testing Philosophy

Never write tests that verify what the TypeScript type system already guarantees. Test runtime behavior, business logic, and edge cases — not type constraints.

## Bug-Driven TDD

Write failing test → Fix code (minimal) → Verify passes. Prevents regression, increases coverage.

**TDD red-phase:** Before implementing, confirm the test actually fails for the right reason (missing feature, not a typo). A test that passes immediately proves nothing.

**Convert manual findings:** If manual testing reveals a bug, write a failing test reproducing it before fixing it.

## Testing After Refactoring

Run full test suite immediately after extracting components. Fix broken element references.
