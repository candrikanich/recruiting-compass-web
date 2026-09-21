# Supabase Auth email templates (branded)

Issue #792. TRC-brands the 3 Supabase-managed auth emails — dashboard-only
setting, no API/CLI deploy path for hosted projects, so these are pasted by
hand into each Supabase project's dashboard. `config.toml`'s
`[auth.email.template.*]` section only affects the local CLI stack, not
staging/prod.

Mirrors `server/utils/emailTemplates.ts`'s `wrapEmailLayout()` shell
(logo, colors, dark-mode block, footer) — hand-inlined here since Supabase's
template editor renders raw HTML + Go template vars, not our TS. Keep these
in sync if the shared layout changes.

## Where to paste

**Supabase Dashboard → Authentication → Emails → Templates.** Apply to
**both** projects — QA/dev (`xpxzhqghxecsjhvklsqg`) and prod
(`lrzsenidegcqhwzwncve`), see `docs/superpowers/plans/artifacts/2026-09-05-prod-auth-config.md`
for project identity. Each template has a separate Subject field and Body
field in the editor.

| File                  | Dashboard template   | Subject                                     |
| --------------------- | -------------------- | ------------------------------------------- |
| `confirm-signup.html` | Confirm signup       | `Confirm your Recruiting Compass email`     |
| `reset-password.html` | Reset password       | `Reset your Recruiting Compass password`    |
| `change-email.html`   | Change Email Address | `Confirm your new Recruiting Compass email` |

"Confirm signup" covers both the initial signup email and a user-triggered
resend — Supabase has no separate "resend verification" template.

## Verify after pasting

Per environment: trigger the real flow (signup, reset-password, change-email
from account settings) on a test account and confirm the branded email
lands — Supabase's dashboard "Send test email" doesn't substitute real
tokens, so click through the actual link once too.
