# Supabase Security Advisor – Remediation Summary

This doc summarizes the **9 security advisor errors** (and related warnings) that were fixed and the one setting that must be changed in the Supabase dashboard.

## What Was Fixed (Migrations)

### 1. RLS on `family_units`

- **Issue:** Table had RLS policies but RLS was not enabled.
- **Fix:** `025_security_advisor_fixes.sql` – `ALTER TABLE public.family_units ENABLE ROW LEVEL SECURITY`.

### 2. RLS on `school_status_history`

- **Issue:** Table is in `public` but had no RLS.
- **Fix:** RLS enabled and policy added so users only see history for schools in their family.

### 3. RLS on backup tables (6 tables)

- **Issue:** Backup tables (`*_backup_pre_family`) were public with no RLS.
- **Fix:** RLS enabled on all six. No permissive policies, so only `service_role` (which bypasses RLS) can access.

### 4. Function `search_path` (22 functions)

- **Issue:** Functions had a mutable `search_path`, which can be abused for search_path injection.
- **Fix:** `ALTER FUNCTION ... SET search_path = public` for all listed functions in `025_security_advisor_fixes.sql`.

### 5. Overly permissive suggestion INSERT policy

- **Issue:** Policy “Service role can insert suggestions” used `WITH CHECK (true)`, allowing any role to insert.
- **Fix:** `026_suggestion_rls_tighten.sql` – policy replaced with `WITH CHECK ((auth.jwt() ->> 'role') = 'service_role')`. Server inserts still work because the service key bypasses RLS.

## What You Need to Do in the Dashboard

### Leaked password protection (Auth)

- **Advisor:** “Leaked Password Protection Disabled” (WARN).
- **What it is:** Supabase checks new/changed passwords against HaveIBeenPwned.org and rejects known-leaked passwords.
- **Availability:** Pro plan and above. On Free plan the warning remains until you upgrade.
- **Where:** [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers** → **Email** (or Auth **Settings**).
- **Action:** Enable **“Leaked password protection”** . In Email provider settings use **Prevent the use of leaked passwords**. See [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Optional: Backup tables “RLS enabled, no policy” (INFO)

The advisor may still report “RLS enabled but no policies” for the backup tables. That is intentional: RLS is on, and there are no policies, so only `service_role` (bypassing RLS) can read them. You can leave as-is or add explicit “service_role only” policies if you want to clear the INFO.

## References

- [Database Linter (Security / Performance Advisors)](https://supabase.com/docs/guides/database/database-linter)
- [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
