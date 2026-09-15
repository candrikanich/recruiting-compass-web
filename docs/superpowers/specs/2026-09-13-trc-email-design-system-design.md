# TRC Email Design System — Design Spec

**Issue:** #588 — feat: TRC-branded email content & design system for all product communications
**Status:** Approved, pending implementation plan
**Date:** 2026-09-13

## Problem

All 10 product emails use generic inline HTML or Supabase defaults. No consistent TRC branding, no design system, no content voice. Users receive emails that look like they come from different products.

## Scope

**In scope (this spec):** the 6 app-sent emails via Resend:
1. Family Invite (`sendInviteEmail()` in `emailService.ts`)
2. Onboarding Nudge (`renderOnboardingNudgeEmail()` in `onboardingEmail.ts`)
3. Weekly Digest (`renderWeeklyDigestEmail()` in `emailService.ts`)
4. Deadline Alert (`renderDeadlineAlertEmail()` in `emailService.ts`)
5. Notification Email (`sendNotificationEmail()` in `emailService.ts`)
6. Feedback acknowledgment (inline in `feedback.post.ts`)

**Out of scope (deferred to follow-up issue):** the 4 Supabase Auth-managed emails (signup confirmation, resend verification, password reset, email change) — different mechanism (dashboard-configured templates), raises a separate custom-SMTP-vs-built-in-mailer decision. Filed as a follow-up, not blocking this spec.

**Not touched:** unsubscribe system (RFC 8058 one-click + human-facing page), notification-preference gating, cron trigger logic. Content/chrome changes only — send paths and business logic stay as-is.

## Decisions (resolved from issue's open questions)

| Question | Decision |
|---|---|
| Figma vs code-first | **Figma-first.** Build header/footer/CTA/card/type-scale components in Figma using Chris's existing logo; use Figma MCP to pull design context, implement shared renderer to match. |
| Rollout scope | **Build system + migrate all 6 at once**, not a single-email pilot. |
| Auth emails (Supabase) | **Deferred** to a follow-up issue. |
| Copy ownership | **Claude drafts** voice guide + copy for all 6 emails; Chris reviews/edits before merge. |
| Legal footer address | **Registered business address**, Olmsted Township, OH 44138. City/state/zip alone doesn't satisfy CAN-SPAM's physical-address requirement — need a street address or PO box number. **Still open**, blocking, tracked below. |
| Social links | **Instagram, X/Twitter, Facebook.** URLs confirmed — see Footer Links below. |

## Architecture

```
Figma brand kit (header/footer/CTA/card/type-scale components)
        │
        ▼
server/utils/emailTemplates.ts
  wrapEmailLayout(bodyHtml, opts) — pure function, no I/O
        │
        ▼
Each renderer (emailService.ts, onboardingEmail.ts, feedback.post.ts)
  wraps its body content in wrapEmailLayout() instead of ad hoc inline HTML
        │
        ▼
Existing send path (Resend client, retry, logging) — UNCHANGED
```

## Components

### 1. Figma brand kit
Master components: shared header (TRC logo, top bar), shared footer (legal address, Instagram/X/Facebook links, unsubscribe, CAN-SPAM boilerplate), CTA button styles (primary blue, secondary outline), card/section layout primitives, typography scale (heading/body/caption), color tokens (brand blue, slate grays, alert red/amber/green — reuse `docs/design/tokens.md` values where they map). Built and iterated in Figma using Chris's logo asset; Figma MCP (`get_design_context`, `get_variable_defs`) pulls the finished spec into code.

### 2. Voice guide (1-pager, markdown)
Tone: encouraging coach, not corporate. Vocabulary: recruiting-specific terms (matches existing in-app copy conventions). Do/don't examples. Drafted by Claude, lives in `docs/` alongside this spec, reviewed by Chris before copy pass begins.

### 3. `server/utils/emailTemplates.ts`
`wrapEmailLayout(bodyHtml: string, opts: EmailLayoutOptions): string` — pure function. Table-based layout, inline styles only (no `<style>` blocks that clients strip), safe web-fonts with system fallback, image fallbacks (alt text, no image-only CTAs). Includes a `prefers-color-scheme: dark` media-query block per the design tokens' dark palette. No network calls, no Supabase/Resend imports — testable as pure input→output.

`EmailLayoutOptions` covers: preheader text, CTA button (optional), footer variant (unsubscribe link presence varies: transactional emails like invite/feedback don't need one, digest/nudge/deadline do — matches issue's existing "unsubscribable" column).

### 4. Copy pass
Draft copy for all 6 emails per the issue's per-email intent (warm/personal for invite, motivating for nudge, scannable for digest, urgent-not-alarming for deadline alert, concise for notification, clean for feedback ack). Delivered as review-ready text, not yet wired into renderers, so Chris can edit before code changes land.

### 5. Renderer migration
Each of the 6 renderers changes its body-construction to call `wrapEmailLayout()` instead of building full inline HTML. Function signatures and call sites (`sendInviteEmail()`, etc.) stay the same — only their internal HTML construction changes. No changes to how/when these functions are invoked.

### 6. Preview endpoint
`GET /api/admin/email-preview?template=invite|nudge|digest|deadline|notification|feedback` — admin-gated via `requireAdmin`, renders the chosen template with fixture data, returns HTML for browser viewing. Dev/QA tool only, no email actually sent.

## Error Handling

`wrapEmailLayout()` is a pure function — no error branches, just deterministic HTML string output from valid input. Existing renderers already validate their input data at their current call boundaries (fetching user/school data etc.); that validation is unchanged. The preview endpoint follows existing `requireAdmin` + Zod query-param validation conventions from other admin endpoints.

## Testing

- Unit tests on `wrapEmailLayout()`: snapshot per template variant, plus assertions for alt text presence, unsubscribe-link presence/absence per footer variant, dark-mode media query presence.
- Existing renderer tests (that assert on send behavior, not exact HTML) stay green — only markup shape changes, not the renderer's I/O contract.
- Manual cross-client QA per issue's Phase 4 checklist: Gmail (web + mobile), Outlook (desktop + web), Apple Mail, Yahoo; dark-mode spot-check on Apple Mail + Gmail; verify unsubscribe links still work post-migration.

## Footer Links

- Instagram: `https://www.instagram.com/therecruitingcompass`
- X/Twitter: `https://x.com/recruitCompass`
- Facebook: `https://www.facebook.com/TheRecruitingCompass/`

## Open Items

- **BLOCKING:** `EMAIL_LEGAL_ADDRESS` env var value. `9866 Ethan Circle, Olmsted Township, OH 44138` was proposed but rejected — reads as a home address, Chris is getting a PO box instead. Renderer migration (component 5) cannot ship to production without a real value here (CAN-SPAM requirement); implementation can proceed with a placeholder constant in the meantime, wired to the env var.
- Follow-up issue for the 4 Supabase Auth emails (content + custom-SMTP-vs-dashboard decision) — to be filed separately.
