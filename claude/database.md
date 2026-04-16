## Supabase & Database

**Client:** Use `useSupabase()` singleton — do NOT create new clients per request (wastes connections). Select specific columns, filter with `.eq()`.

**Schema:** Add columns as nullable, separate migration. Use CHECK constraints for enums (not PG enums).

**Types:** `npx supabase gen types typescript --local > types/database.ts` after migrations

## Common Patterns

- **State mutation**: Only in Pinia actions, never in components — keeps state changes auditable and devtools-visible
- **Error handling**: Always try/catch async operations, set error state explicitly — silent failures leave users on broken UI with no feedback
- **N+1 queries**: Use `.select()` with specific columns, batch fetch related data, cache in stores — unbounded queries on lists will kill performance at scale
- **Pagination on list endpoints**: Any Nitro list handler not naturally bounded by `user_id`/`family_unit_id` must accept `?limit=20&offset=0` and apply `.range(offset, offset + limit - 1)` — never return unbounded result sets
- **Index filter columns in migrations**: Every migration adding a column used in `.eq()`, `.order()`, or `.match()` must include a `CREATE INDEX` in the same migration file
- **Component auto-import**: No import needed for `/components/**`
- **Supabase connection**: Verify `.env.local`, check project isn't paused

## Cascade-Delete Pattern

1. Try simple delete (fast path) 2. Catch FK errors ("Cannot delete", "violates foreign key") 3. Fall back to `/api/[entity]/[id]/cascade-delete` (children first, `confirmDelete: true`) 4. Return `{ cascadeUsed: boolean }` for UX messaging 5. CSRF token required (ensure client uses `useAuthFetch` which auto-injects the token)

**Security:** Use `family_unit_id` for access control (not `user_id`)

**Entities:** schools, coaches, interactions
