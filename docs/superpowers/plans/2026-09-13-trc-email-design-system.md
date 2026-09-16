# TRC Email Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad hoc inline HTML in all 6 app-sent (Resend) emails with one shared branded layout, voiced consistently, so every TRC email looks and reads like the same product.

**Architecture:** A single pure function, `wrapEmailLayout(bodyHtml, opts)` in `server/utils/emailTemplates.ts`, produces the branded chrome (logo header, card body slot, legal/social footer, optional unsubscribe line, dark-mode CSS). Each of the 6 existing renderers is migrated to call it instead of building full inline HTML. No renderer's exported signature or call sites change — only what's inside them.

**Tech Stack:** Nuxt 3 / TypeScript (Nitro server utils), Vitest, Resend (unchanged), existing `sendEmail`/`sendViaResend` plumbing (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-13-trc-email-design-system-design.md`

## Global Constraints

- Table-based HTML layout, inline styles only — no external stylesheets (email clients strip `<style>` blocks inconsistently; the one `<style>` block used here is only for the `prefers-color-scheme` dark-mode override, which degrades gracefully to the light styles if stripped).
- Logo source: `${PUBLIC_BASE_URL}/assets/logos/recruiting-compass-horizontal.svg` (falls back to `https://myrecruitingcompass.com` like every other base-URL usage in this codebase). **Known limitation:** Outlook desktop's Word rendering engine does not reliably render SVG `<img>` sources — this is a Phase-4 (manual QA) finding to confirm, not a code-level fix; alt text (`alt="The Recruiting Compass"`) covers the fallback case.
- Legal footer address: `process.env.EMAIL_LEGAL_ADDRESS`, falling back to the string `"The Recruiting Compass"` when unset. **The real address is not yet available** (Chris is getting a PO box) — do not hardcode a street address anywhere in this plan.
- Footer social links (fixed, not env-driven): Instagram `https://www.instagram.com/therecruitingcompass`, X `https://x.com/recruitCompass`, Facebook `https://www.facebook.com/TheRecruitingCompass/`.
- Brand hex values for inline styles (from `assets/css/main.css`, since email HTML can't reference Tailwind/CSS-variable tokens): blue `#2563eb`, slate text `#1e293b`, slate muted `#64748b` / `#94a3b8`, red (deadline/urgent) `#dc2626`, border `#e2e8f0`, page bg `#f1f5f9`.
- Voice: encouraging coach, not corporate. Second person, name the specific next action, no throat-clearing, no vague CTAs. Full guide in Task 1.
- Existing tests assert on substrings (`toContain`), not full-HTML snapshots — every migration task must preserve every currently-asserted substring (exact dynamic values, `href="..."`, the word "unsubscribe" where present/absent). Task steps below call out the exact strings each existing test file checks.
- Out of scope, do not touch: `server/utils/unsubscribeToken.ts`, `server/utils/emailOptouts.ts`, `server/utils/recurringEmail.ts`'s suppression/token logic, notification-preference gating, cron trigger logic. Only the HTML construction inside renderers changes.

---

## Task 1: Voice guide

**Files:**
- Create: `docs/design/email-voice-guide.md`

**Interfaces:**
- Produces: no code — a reference doc later tasks' copy must match.

- [ ] **Step 1: Write the voice guide**

```markdown
# TRC Email Voice Guide

**Tone:** encouraging coach, not corporate. Every email speaks to one recruit, not a mailing list.

## Do
- Use "you" — second person, direct.
- Lead with the specific next action, not a summary of the product.
- Keep sentences short and scannable; one idea per line.
- Use recruiting vocabulary naturally: "coach outreach," "recruiting profile," "school matches," "deadline" — not generic SaaS terms like "dashboard" or "portal" alone.
- Name real values (a coach's name, a school, a count) wherever the data is available — specificity reads as attention, not automation.

## Don't
- Corporate throat-clearing ("We hope this email finds you well," "As per our records").
- Vague CTAs ("Learn more," "Click here") — name the actual action ("View your matches," "Message Coach Lee").
- Alarmist urgency for routine items — reserve urgency for actual deadlines.
- Passive voice for actions the user should take ("Steps can be completed" → "Complete these steps").

## Examples

| Bad | Good |
|---|---|
| "This is an automated notification regarding your account activity." | "Coach Martinez viewed your profile this week." |
| "Please be advised that a deadline is approaching." | "Your offer from Ohio State expires in 3 days." |
| "We hope this email finds you well! We wanted to reach out..." | "You're 2 of 8 steps into setting up your profile." |
| "Click here to learn more about your invitation." | "Join Alex's recruiting profile" |
```

- [ ] **Step 2: Commit**

```bash
git add docs/design/email-voice-guide.md
git commit -m "docs: add TRC email voice guide"
```

---

## Task 2: Shared email layout (`emailTemplates.ts`)

**Files:**
- Create: `server/utils/emailTemplates.ts`
- Test: `tests/unit/server/utils/emailTemplates.spec.ts`

**Interfaces:**
- Produces: `export interface EmailLayoutOptions { preheader?: string; unsubscribeUrl?: string }` and `export function wrapEmailLayout(bodyHtml: string, opts?: EmailLayoutOptions): string`. Every later task's renderer calls this with its own `bodyHtml` and, where relevant, `unsubscribeUrl` (never `unsubscribeUrl` for Family Invite or the Feedback email — those stay transactional/no-unsubscribe, matching current behavior).
- Consumes: nothing (pure function, no imports beyond `process.env`).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

describe("wrapEmailLayout", () => {
  afterEach(() => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.EMAIL_LEGAL_ADDRESS;
  });

  it("wraps body HTML in the branded shell", () => {
    const html = wrapEmailLayout("<p>Hello there</p>");
    expect(html).toContain("<p>Hello there</p>");
    expect(html).toContain('alt="The Recruiting Compass"');
  });

  it("uses PUBLIC_BASE_URL for the logo when set", () => {
    process.env.PUBLIC_BASE_URL = "https://staging.example.com";
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain(
      "https://staging.example.com/assets/logos/recruiting-compass-horizontal.svg",
    );
  });

  it("falls back to the production domain for the logo when unset", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain(
      "https://myrecruitingcompass.com/assets/logos/recruiting-compass-horizontal.svg",
    );
  });

  it("includes a hidden preheader when provided", () => {
    const html = wrapEmailLayout("<p>x</p>", { preheader: "Your weekly recap is here" });
    expect(html).toContain("Your weekly recap is here");
    expect(html).toContain("display:none");
  });

  it("omits the unsubscribe line when no unsubscribeUrl is given", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html.toLowerCase()).not.toContain("unsubscribe");
  });

  it("includes an unsubscribe link when unsubscribeUrl is given", () => {
    const html = wrapEmailLayout("<p>x</p>", {
      unsubscribeUrl: "https://app.example.com/unsub?token=abc",
    });
    expect(html).toContain('href="https://app.example.com/unsub?token=abc"');
    expect(html.toLowerCase()).toContain("unsubscribe");
  });

  it("includes all three social links", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("https://www.instagram.com/therecruitingcompass");
    expect(html).toContain("https://x.com/recruitCompass");
    expect(html).toContain("https://www.facebook.com/TheRecruitingCompass/");
  });

  it("falls back to a safe legal-address placeholder when EMAIL_LEGAL_ADDRESS is unset", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("The Recruiting Compass");
  });

  it("uses EMAIL_LEGAL_ADDRESS when set", () => {
    process.env.EMAIL_LEGAL_ADDRESS = "123 Test St, Test City, OH 44000";
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("123 Test St, Test City, OH 44000");
  });

  it("includes a dark-mode media query", () => {
    const html = wrapEmailLayout("<p>x</p>");
    expect(html).toContain("prefers-color-scheme: dark");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/server/utils/emailTemplates.spec.ts`
Expected: FAIL — `Cannot find module '~/server/utils/emailTemplates'`

- [ ] **Step 3: Implement `wrapEmailLayout`**

```typescript
/**
 * Shared branded HTML shell for every app-sent (Resend) email. Table-based,
 * inline-style layout for cross-client compatibility — Gmail/Outlook/Apple
 * Mail all strip external stylesheets, and Outlook (Word engine) ignores
 * most CSS outside inline `style` attributes.
 *
 * Pure function: no I/O, no Supabase/Resend imports. Each renderer supplies
 * its own body HTML and gets the logo header, card body slot, and
 * legal/social footer for free.
 */

export interface EmailLayoutOptions {
  /** Hidden preview text shown in the inbox list, before the body renders. */
  preheader?: string;
  /** Presence adds a "why you're receiving this" + Unsubscribe line to the footer. Omit for transactional emails (invites, feedback acks). */
  unsubscribeUrl?: string;
}

const SOCIAL_LINKS: ReadonlyArray<{ label: string; url: string }> = [
  { label: "Instagram", url: "https://www.instagram.com/therecruitingcompass" },
  { label: "X", url: "https://x.com/recruitCompass" },
  { label: "Facebook", url: "https://www.facebook.com/TheRecruitingCompass/" },
];

function baseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
}

function logoUrl(): string {
  return `${baseUrl()}/assets/logos/recruiting-compass-horizontal.svg`;
}

function legalAddress(): string {
  return process.env.EMAIL_LEGAL_ADDRESS ?? "The Recruiting Compass";
}

function socialLinksHtml(): string {
  return SOCIAL_LINKS.map(
    (s) =>
      `<a href="${s.url}" style="color:#64748b;text-decoration:underline;margin:0 6px;font-size:12px;">${s.label}</a>`,
  ).join("");
}

function footerHtml(unsubscribeUrl?: string): string {
  const unsubscribeLine = unsubscribeUrl
    ? `You're receiving this because you have a Recruiting Compass account. <a href="${unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>.`
    : "";
  return `
    <tr>
      <td style="padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 8px 0;">${socialLinksHtml()}</p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
          The Recruiting Compass &middot; ${legalAddress()}
        </p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">${unsubscribeLine}</p>
      </td>
    </tr>`;
}

export function wrapEmailLayout(
  bodyHtml: string,
  opts: EmailLayoutOptions = {},
): string {
  const preheaderHtml = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>
      @media (prefers-color-scheme: dark) {
        .trc-email-bg { background:#0f172a !important; }
        .trc-email-card { background:#1e293b !important; }
        .trc-email-text { color:#e2e8f0 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    ${preheaderHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="trc-email-bg" style="background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="trc-email-card" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px 0 32px;text-align:left;">
                <img src="${logoUrl()}" alt="The Recruiting Compass" height="28" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td class="trc-email-text" style="padding:24px 32px 32px 32px;color:#1e293b;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            ${footerHtml(opts.unsubscribeUrl)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/emailTemplates.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailTemplates.ts tests/unit/server/utils/emailTemplates.spec.ts
git commit -m "feat: add shared branded email layout (emailTemplates.ts)"
```

---

## Task 3: Migrate Family Invite email

**Files:**
- Modify: `server/utils/emailService.ts` (`sendInviteEmail`)
- Test: `tests/unit/server/utils/emailService.spec.ts` (existing file — add assertions, don't remove existing ones)

**Interfaces:**
- Consumes: `wrapEmailLayout(bodyHtml: string, opts?: EmailLayoutOptions): string` from Task 2.
- Produces: no change to `sendInviteEmail`'s exported signature (`SendInviteEmailOptions`, return type) — only its internal HTML construction changes.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/server/utils/emailService.spec.ts`, inside the existing `describe("sendInviteEmail"` block (find it near the existing `"invite-tok_xyz"` idempotency-key test):

```typescript
it("uses role-specific value-prop copy and preserves the join link", async () => {
  await sendInviteEmail({
    to: "player@example.com",
    inviterName: "Jordan",
    familyName: "Smith Family",
    role: "player",
    token: "tok_abc",
  });
  const [, options] = sendMock.mock.calls[0];
  expect(options.html).toContain("Jordan");
  expect(options.html).toContain("Smith Family");
  expect(options.html).toContain("Track your recruiting progress");
  expect(options.html).toContain("/join?token=tok_abc");
  expect(options.html.toLowerCase()).not.toContain("unsubscribe");
});

it("uses parent value-prop copy for the parent role", async () => {
  await sendInviteEmail({
    to: "parent@example.com",
    inviterName: "Jordan",
    familyName: "Smith Family",
    role: "parent",
    token: "tok_def",
  });
  const [, options] = sendMock.mock.calls[0];
  expect(options.html).toContain("Follow along on the recruiting journey");
});
```

Note: `sendMock` is called as `getResend().emails.send(payload, idempotencyOpts)`, so `sendMock.mock.calls[0]` is `[payload, idempotencyOpts]` — `payload.html` is what to assert on. Check the existing tests in this file for the exact destructuring pattern already in use and match it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts -t "value-prop"`
Expected: FAIL — copy doesn't exist yet ("Track your recruiting progress" not found)

- [ ] **Step 3: Implement — migrate `sendInviteEmail`**

Replace the body of `sendInviteEmail` in `server/utils/emailService.ts`. Keep the function signature, `joinUrl`/`baseUrl` construction, and the final `sendEmail(...)` call exactly as they are — only replace the `htmlContent` construction:

```typescript
const ROLE_VALUE_PROPS: Record<"player" | "parent", string> = {
  player:
    "Track your recruiting progress, message coaches, and manage deadlines — all in one place.",
  parent:
    "Follow along on the recruiting journey, help manage deadlines, and stay in the loop with coaches.",
};

export const sendInviteEmail = async (
  options: SendInviteEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const { to, inviterName, familyName, role, token, context } = options;
  const baseUrl =
    process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
  const joinUrl = `${baseUrl}/join?token=${encodeURIComponent(token)}`;
  const roleLabel = role === "player" ? "player" : "parent";

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#1e293b;">
      ${escapeHtml(inviterName)} invited you to join ${escapeHtml(familyName)}'s recruiting journey
    </h1>
    <p style="margin:0 0 20px 0;color:#475569;">
      ${ROLE_VALUE_PROPS[role]}
    </p>
    <a href="${sanitizeUrl(joinUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">
      Join ${escapeHtml(familyName)}
    </a>
    <p style="margin-top:20px;font-size:13px;color:#94a3b8;">
      This invite link expires in 7 days.
    </p>
  `;

  const htmlContent = wrapEmailLayout(bodyHtml, {
    preheader: `${inviterName} invited you to join ${familyName}'s recruiting profile`,
  });

  return sendEmail({
    to,
    subject: `${familyName}'s recruiting journey awaits — you're invited!`,
    html: htmlContent,
    idempotencyKey: `invite-${token}`,
    context,
  });
};
```

Add the import at the top of `server/utils/emailService.ts`:

```typescript
import { wrapEmailLayout } from "~/server/utils/emailTemplates";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts`
Expected: PASS — including the pre-existing `"invite-tok_xyz"` idempotency test and both new tests

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailService.ts tests/unit/server/utils/emailService.spec.ts
git commit -m "feat: migrate Family Invite email to shared branded layout"
```

---

## Task 4: Migrate Onboarding Nudge email

**Files:**
- Modify: `server/utils/onboardingEmail.ts` (`renderOnboardingNudgeEmail`)
- Test: `tests/unit/server/onboarding-email.spec.ts` (existing file)

**Interfaces:**
- Consumes: `wrapEmailLayout` from Task 2.
- Produces: no change to `renderOnboardingNudgeEmail`'s signature (`OnboardingNudgeEmailData` in, `string` out).

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/server/onboarding-email.spec.ts`:

```typescript
it("wraps the body in the shared branded layout", async () => {
  const { renderOnboardingNudgeEmail } =
    await import("~/server/utils/onboardingEmail");
  const html = renderOnboardingNudgeEmail({
    userName: "Chris",
    completedCount: 2,
    totalCount: 8,
    topIncompleteItems: [
      { label: "Explore recommended schools", link: "https://app.example.com/schools" },
    ],
    dashboardUrl: "https://app.example.com/dashboard",
  });
  expect(html).toContain('alt="The Recruiting Compass"');
  expect(html).toContain("https://www.instagram.com/therecruitingcompass");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/onboarding-email.spec.ts -t "shared branded layout"`
Expected: FAIL — `alt="The Recruiting Compass"` not present in current markup

- [ ] **Step 3: Implement — migrate `renderOnboardingNudgeEmail`**

Replace the function body in `server/utils/onboardingEmail.ts`, keeping `escapeHtml` and the exported interfaces as-is:

```typescript
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

export function renderOnboardingNudgeEmail(
  data: OnboardingNudgeEmailData,
): string {
  const safeUserName = escapeHtml(data.userName);
  const itemsHtml = data.topIncompleteItems
    .map(
      (item) =>
        `<li style="margin-bottom:8px;"><a href="${escapeHtml(item.link)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(item.label)}</a></li>`,
    )
    .join("");

  const bodyHtml = `
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px 0;">
      Hey ${safeUserName}, your recruiting profile is waiting 👋
    </h2>
    <p style="color:#475569;margin:0 0 16px 0;">
      You've completed <strong>${data.completedCount} of ${data.totalCount}</strong> getting-started steps.
      A few quick actions will unlock personalized school matches and coach outreach tools:
    </p>
    <ul style="color:#475569;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
      ${itemsHtml}
    </ul>
    <a href="${data.dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
      Continue where you left off →
    </a>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: `You've completed ${data.completedCount} of ${data.totalCount} steps`,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/onboarding-email.spec.ts`
Expected: PASS — both the pre-existing content test and the new one

- [ ] **Step 5: Commit**

```bash
git add server/utils/onboardingEmail.ts tests/unit/server/onboarding-email.spec.ts
git commit -m "feat: migrate Onboarding Nudge email to shared branded layout"
```

---

## Task 5: Migrate Weekly Digest email

**Files:**
- Modify: `server/utils/emailService.ts` (`renderWeeklyDigestEmail`)
- Test: `tests/unit/server/utils/emailService.spec.ts` (existing file)

**Interfaces:**
- Consumes: `wrapEmailLayout` from Task 2.
- Produces: no change to `renderWeeklyDigestEmail`'s signature — it already takes `(data, unsubscribeUrl?)`.

- [ ] **Step 1: Write the failing test**

Add near the existing `renderWeeklyDigestEmail` tests in `tests/unit/server/utils/emailService.spec.ts`:

```typescript
it("wraps the digest body in the shared branded layout", () => {
  const html = renderWeeklyDigestEmail({
    lines: ["3 new school matches"],
    upcomingDeadlines: [],
  });
  expect(html).toContain('alt="The Recruiting Compass"');
  expect(html).toContain("Your Weekly Recruiting Recap");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts -t "digest body in the shared"`
Expected: FAIL — `alt="The Recruiting Compass"` not present

- [ ] **Step 3: Implement — migrate `renderWeeklyDigestEmail`**

Replace the function body (keep the existing `lineItems`/`deadlineItems` construction and the exact existing test strings: `href="${url}"` for the unsubscribe link, and "unsubscribe" absent when no URL is given):

```typescript
export function renderWeeklyDigestEmail(
  data: {
    lines: string[];
    upcomingDeadlines: Array<{ label: string; deadline_date: string }>;
  },
  unsubscribeUrl?: string,
): string {
  const lineItems = data.lines
    .map((l) => `<li style="margin:4px 0">${escapeHtml(l)}</li>`)
    .join("");
  const deadlineItems = data.upcomingDeadlines.length
    ? data.upcomingDeadlines
        .map(
          (d) =>
            `<li>${escapeHtml(d.label)} — ${escapeHtml(d.deadline_date)}</li>`,
        )
        .join("")
    : "<li>No upcoming deadlines</li>";

  const bodyHtml = `
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 12px 0;">Your Weekly Recruiting Recap</h2>
    <ul style="padding-left:20px;margin:0 0 20px 0;color:#475569;">${lineItems}</ul>
    <h3 style="color:#1e293b;font-size:15px;margin:0 0 8px 0;">Upcoming Deadlines</h3>
    <ul style="padding-left:20px;margin:0;color:#475569;">${deadlineItems}</ul>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: "Your weekly recruiting recap is here",
    unsubscribeUrl,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts`
Expected: PASS — including the pre-existing digest tests (`href="${url}"` present/absent, "unsubscribe" present/absent)

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailService.ts tests/unit/server/utils/emailService.spec.ts
git commit -m "feat: migrate Weekly Digest email to shared branded layout"
```

---

## Task 6: Migrate Deadline Alert email

**Files:**
- Modify: `server/utils/emailService.ts` (`renderDeadlineAlertEmail`)
- Test: `tests/unit/server/utils/emailService.spec.ts` (existing file)

**Interfaces:**
- Consumes: `wrapEmailLayout` from Task 2.
- Produces: no change to `renderDeadlineAlertEmail`'s signature.

- [ ] **Step 1: Write the failing test**

```typescript
it("wraps the deadline alert body in the shared branded layout", () => {
  const html = renderDeadlineAlertEmail({
    label: "Offer from Ohio State",
    daysUntil: 3,
    deadline_date: "2026-10-01",
  });
  expect(html).toContain('alt="The Recruiting Compass"');
  expect(html).toContain("#dc2626");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts -t "deadline alert body"`
Expected: FAIL — `alt="The Recruiting Compass"` not present

- [ ] **Step 3: Implement — migrate `renderDeadlineAlertEmail`**

Keep the existing `urgency` computation and the test-asserted `href="${url}"` behavior:

```typescript
export function renderDeadlineAlertEmail(
  data: {
    label: string;
    daysUntil: number;
    deadline_date: string;
  },
  unsubscribeUrl?: string,
): string {
  const urgency =
    data.daysUntil === 0
      ? "TODAY"
      : `in ${data.daysUntil} day${data.daysUntil !== 1 ? "s" : ""}`;

  const bodyHtml = `
    <h2 style="color:#dc2626;font-size:18px;margin:0 0 12px 0;">Deadline ${urgency}</h2>
    <p style="color:#475569;margin:0;">
      <strong style="color:#1e293b;">${escapeHtml(data.label)}</strong> is due ${urgency} (${escapeHtml(data.deadline_date)}).
    </p>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: `Deadline ${urgency}: ${data.label}`,
    unsubscribeUrl,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailService.ts tests/unit/server/utils/emailService.spec.ts
git commit -m "feat: migrate Deadline Alert email to shared branded layout"
```

---

## Task 7: Migrate generic Notification email

**Files:**
- Modify: `server/utils/emailService.ts` (`sendNotificationEmail`)
- Test: `tests/unit/server/utils/emailService.spec.ts` (existing file)

**Interfaces:**
- Consumes: `wrapEmailLayout` from Task 2.
- Produces: no change to `SendNotificationEmailOptions` or `sendNotificationEmail`'s signature.

- [ ] **Step 1: Write the failing test**

Add near the existing `sendNotificationEmail` tests (which assert `idempotencyKey: "notif-99"`):

```typescript
it("wraps the notification body in the shared branded layout and preserves title/message/action", async () => {
  await sendNotificationEmail({
    to: "a@b.com",
    subject: "New coach view",
    title: "Coach Martinez viewed your profile",
    message: "They spent 3 minutes on your highlight reel.",
    actionUrl: "https://app.example.com/profile",
    priority: "high",
  });
  const [, options] = sendMock.mock.calls[0];
  expect(options.html).toContain('alt="The Recruiting Compass"');
  expect(options.html).toContain("Coach Martinez viewed your profile");
  expect(options.html).toContain("They spent 3 minutes on your highlight reel.");
  expect(options.html).toContain("https://app.example.com/profile");
  expect(options.html).toContain("HIGH PRIORITY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts -t "notification body"`
Expected: FAIL — `alt="The Recruiting Compass"` not present

- [ ] **Step 3: Implement — migrate `sendNotificationEmail`**

Replace the `htmlContent` construction, keeping `priorityBadge`/`actionButton` computation and the exact final `sendViaResend` call:

```typescript
export const sendNotificationEmail = async (
  options: SendNotificationEmailOptions,
): Promise<SendResult> => {
  const {
    to,
    subject,
    title,
    message,
    actionUrl,
    priority,
    idempotencyKey,
    listUnsubscribeUrl,
    context,
  } = options;

  const priorityBadge =
    priority === "high"
      ? '<span style="display:inline-block;background:#dc2626;color:#ffffff;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">HIGH PRIORITY</span>'
      : "";

  const actionButton = actionUrl
    ? `<a href="${sanitizeUrl(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:16px;">View Details</a>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;">
      ${escapeHtml(title)}
    </h1>
    ${priorityBadge}
    <p style="margin:12px 0 0 0;color:#475569;">
      ${escapeHtml(message)}
    </p>
    ${actionButton}
  `;

  const htmlContent = wrapEmailLayout(bodyHtml, {
    preheader: title,
    unsubscribeUrl: listUnsubscribeUrl,
  });

  return sendViaResend(
    { to, subject, html: htmlContent },
    { idempotencyKey, listUnsubscribeUrl, context },
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/emailService.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/emailService.ts tests/unit/server/utils/emailService.spec.ts
git commit -m "feat: migrate generic Notification email to shared branded layout"
```

---

## Task 8: Migrate Feedback acknowledgment email

**Files:**
- Modify: `server/api/feedback.post.ts`
- Test: `tests/unit/server/api/feedback.post.spec.ts` (create if it doesn't already exist — check first)

**Interfaces:**
- Consumes: `wrapEmailLayout` from Task 2.
- Produces: no change to the endpoint's request/response contract.

- [ ] **Step 1: Check for an existing test file**

Run: `find tests -iname "feedback.post*"`
If a file exists, read it and add the new test into its existing structure instead of creating a duplicate file, adapting the assertion in Step 2 to that file's existing mock names. If none exists, create `tests/unit/server/api/feedback.post.spec.ts` exactly as below — this mocks `h3` directly (the established pattern in this codebase, see `tests/unit/server/api/notifications/email.spec.ts`), so no per-event object construction is needed.

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  body: {
    name: "Test User",
    email: "test@example.com",
    feedbackType: "bug" as const,
    page: "/dashboard",
    message: "Something broke.",
  },
};

const sendEmailMock = vi.fn(async () => ({ success: true, messageId: "msg-1" }));
vi.mock("~/server/utils/emailService", () => ({ sendEmail: sendEmailMock }));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-1" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readBody: vi.fn(async () => mockState.body),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});

describe("feedback.post", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
  });

  it("wraps the feedback email body in the shared branded layout", async () => {
    const { default: handler } = await import("~/server/api/feedback.post");
    await handler({} as never);
    expect(sendEmailMock.mock.calls[0][0].html).toContain(
      'alt="The Recruiting Compass"',
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/feedback.post.spec.ts`
Expected: FAIL — `alt="The Recruiting Compass"` not present in current inline HTML

- [ ] **Step 4: Implement — migrate the feedback email body**

In `server/api/feedback.post.ts`, add the import and replace the `html` construction (this is internal/staff-facing per the issue — keep it plain, no voice-guide polish needed, just consistent chrome):

```typescript
import { wrapEmailLayout } from "~/server/utils/emailTemplates";
```

```typescript
const bodyHtml = `
  <h2 style="color:#1e40af;font-size:18px;margin:0 0 12px 0;">[Feedback] ${typeLabel}</h2>
  <p style="margin:0 0 4px 0;color:#475569;"><strong>From:</strong> ${escapeHtml(name ?? "")} (${escapeHtml(email ?? "")})</p>
  <p style="margin:0 0 4px 0;color:#475569;"><strong>User ID:</strong> ${user.id}</p>
  <p style="margin:0 0 12px 0;color:#475569;"><strong>Category:</strong> ${typeLabel}</p>
  ${pageInfo}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
  <p style="white-space:pre-wrap;color:#1e293b;margin:0;">${escapeHtml(message ?? "")}</p>
`;

const html = wrapEmailLayout(bodyHtml);
```

Remove the old `html` template literal (the one starting with `<!DOCTYPE html>...`) entirely — `wrapEmailLayout` now supplies the document shell.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/api/feedback.post.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/api/feedback.post.ts tests/unit/server/api/feedback.post.spec.ts
git commit -m "feat: migrate Feedback acknowledgment email to shared branded layout"
```

---

## Task 9: Admin email preview endpoint

**Files:**
- Create: `server/api/admin/email-preview.get.ts`
- Test: `tests/unit/server/api/admin/email-preview.spec.ts`

**Interfaces:**
- Consumes: `renderWeeklyDigestEmail`, `renderDeadlineAlertEmail` from `emailService.ts`; `renderOnboardingNudgeEmail` from `onboardingEmail.ts`; `requireAdmin` from `~/server/utils/auth` (see `server/api/admin/growth.get.ts` for the exact usage pattern already established in this codebase).
- Produces: `GET /api/admin/email-preview?template=<name>` returning `{ html: string }` for a valid `template`, or a 400 for an invalid one.

- [ ] **Step 1: Write the failing test**

This mirrors the exact `h3`-mocking convention already used in `tests/unit/server/api/admin/email-events.spec.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getQuery: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), {
        statusCode: opts.statusCode,
      }),
  };
});
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-1" }),
}));

import { getQuery } from "h3";

describe("GET /api/admin/email-preview", () => {
  it("returns rendered HTML for a valid template", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    const result = await handler({} as never);
    expect(result.html).toContain('alt="The Recruiting Compass"');
  });

  it("rejects an unknown template", async () => {
    vi.mocked(getQuery).mockReturnValue({ template: "nonsense" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    await expect(handler({} as never)).rejects.toThrow();
  });

  it("requires admin auth", async () => {
    const { requireAdmin } = await import("~/server/utils/auth");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("not admin"));
    vi.mocked(getQuery).mockReturnValue({ template: "invite" });
    const { default: handler } =
      await import("~/server/api/admin/email-preview.get");
    await expect(handler({} as never)).rejects.toThrow("not admin");
  });
});
```

Note: `vi.mock` calls are hoisted above imports by Vitest automatically — the `import { getQuery } from "h3"` line above the `describe` block is required so the mocked function can be referenced via `vi.mocked(getQuery)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/admin/email-preview.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the endpoint**

```typescript
/**
 * GET /api/admin/email-preview?template=invite|nudge|digest|deadline|notification|feedback
 * Renders one of the 6 app-sent email templates with fixture data, for
 * visual QA in dev/QA. No email is sent. Admin-gated, SELECT-free (no DB
 * reads — fixture data only).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
} from "~/server/utils/emailService";
import { renderOnboardingNudgeEmail } from "~/server/utils/onboardingEmail";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

const TEMPLATES = [
  "invite",
  "nudge",
  "digest",
  "deadline",
  "notification",
  "feedback",
] as const;
type TemplateName = (typeof TEMPLATES)[number];

function isTemplateName(v: unknown): v is TemplateName {
  return typeof v === "string" && (TEMPLATES as readonly string[]).includes(v);
}

function renderFixture(template: TemplateName): string {
  switch (template) {
    case "invite":
      return wrapEmailLayout(
        `<h1 style="margin:0 0 12px 0;font-size:20px;color:#1e293b;">Jordan invited you to join Smith Family's recruiting journey</h1>
         <p style="margin:0 0 20px 0;color:#475569;">Track your recruiting progress, message coaches, and manage deadlines — all in one place.</p>
         <a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Join Smith Family</a>`,
        { preheader: "Jordan invited you to join Smith Family's recruiting profile" },
      );
    case "nudge":
      return renderOnboardingNudgeEmail({
        userName: "Chris",
        completedCount: 2,
        totalCount: 8,
        topIncompleteItems: [
          { label: "Explore recommended schools", link: "#" },
          { label: "Complete your academics", link: "#" },
        ],
        dashboardUrl: "#",
      });
    case "digest":
      return renderWeeklyDigestEmail({
        lines: ["3 new school matches", "Coach Martinez viewed your profile"],
        upcomingDeadlines: [
          { label: "Offer from Ohio State", deadline_date: "2026-10-01" },
        ],
      });
    case "deadline":
      return renderDeadlineAlertEmail({
        label: "Offer from Ohio State",
        daysUntil: 3,
        deadline_date: "2026-10-01",
      });
    case "notification":
      return wrapEmailLayout(
        `<h1 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;">Coach Martinez viewed your profile</h1>
         <p style="margin:12px 0 0 0;color:#475569;">They spent 3 minutes on your highlight reel.</p>`,
        { preheader: "Coach Martinez viewed your profile" },
      );
    case "feedback":
      return wrapEmailLayout(
        `<h2 style="color:#1e40af;font-size:18px;margin:0 0 12px 0;">[Feedback] Bug Report</h2>
         <p style="margin:0;color:#475569;"><strong>From:</strong> Fixture User (fixture@example.com)</p>`,
      );
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const template = query.template;

  if (!isTemplateName(template)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid template. Expected one of: ${TEMPLATES.join(", ")}`,
    });
  }

  return { html: renderFixture(template) };
});
```

Note: the invite fixture mirrors `sendInviteEmail`'s body inline rather than calling it, since `sendInviteEmail` also sends and requires a token/join-URL — no import of it is needed here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/api/admin/email-preview.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite to confirm no regressions**

Run: `npm test`
Expected: PASS, same or higher total test count than before this plan started

- [ ] **Step 6: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add server/api/admin/email-preview.get.ts tests/unit/server/api/admin/email-preview.spec.ts
git commit -m "feat: add admin email preview endpoint for the 6 branded templates"
```

---

## Manual Verification (not a coded task — do after Task 9)

Per the spec's Phase 4:
- [ ] Render each of the 6 templates via `/api/admin/email-preview?template=<name>` locally.
- [ ] Cross-client check: Gmail (web + mobile), Outlook (desktop + web), Apple Mail, Yahoo. Confirm the Outlook-desktop SVG-logo limitation noted in Global Constraints — if the logo doesn't render there, decide then whether a PNG export is worth a follow-up task (out of scope for this plan).
- [ ] Dark-mode spot-check on Apple Mail + Gmail.
- [ ] Send a real Family Invite and a real Weekly Digest to a test account; confirm unsubscribe links still work post-migration (digest/deadline only — invite/feedback have none by design).

## Not Done By This Plan

- The 4 Supabase Auth emails (signup confirmation, resend verification, password reset, email change) — follow-up issue, per spec.
- Real `EMAIL_LEGAL_ADDRESS` value — set the env var once Chris has the PO box; no code change needed at that point.
