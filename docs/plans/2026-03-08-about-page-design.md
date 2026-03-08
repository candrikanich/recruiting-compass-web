# About Page Design

**Date:** 2026-03-08
**Status:** Approved

## Summary

Add an About page accessible to authenticated users from the Settings navigation. The page serves a utility-first purpose (structured feedback form) grounded by a mission statement and a direct email fallback.

## Mission Statement

> The Recruiting Compass helps high school student athletes and their families manage the college recruiting journey — tracking schools, coaches, interactions, and timelines in one place. We believe every athlete deserves clarity, control, and a fair shot. No professional service required.

## Page Structure

### Route
`pages/about.vue` — authenticated, no special guards beyond the default auth middleware.

### Navigation Placement
Added to the **Settings** section nav alongside Account, Notifications, etc. Label: "About".

### Sections

#### 1. Mission Statement
The mission text displayed prominently at the top. No section header — let the copy stand on its own with generous spacing.

#### 2. Feedback Form
The primary content of the page. Fields:

| Field | Type | Options |
|-------|------|---------|
| Subject | `<select>` | Bug Report, Feature Request, Question, General Feedback |
| Message | `<textarea>` | Open text, required |
| Submit | Button | — |

- Submits to `POST /api/feedback`
- Uses Resend (already in stack) to email the feedback to the app owner
- Shows inline success/error state — no page redirect
- Subject field enables server-side filtering/tagging of incoming messages

#### 3. Footer Fallback
A single line below the form:
> "You can also reach us directly at `[owner email]`" (mailto link)

## API Endpoint

**`POST /api/feedback`**

Request body:
```typescript
{
  subject: 'bug' | 'feature' | 'question' | 'general'
  message: string
}
```

- Auth required (user context available for sender info)
- Sends email via `sendEmail()` from `server/utils/emailService.ts`
- Returns `{ success: true }` or appropriate error
- No database storage required — email is the record

## Tech Stack Transparency

None — intentionally omitted. Not relevant to users.

## Out of Scope

- Public/pre-auth About page
- Tech stack disclosure
- Database storage of feedback messages
- User-facing feedback history
