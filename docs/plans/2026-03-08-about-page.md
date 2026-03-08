# About Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an authenticated About page with a mission statement and a structured feedback form that emails submissions via Resend.

**Architecture:** A new `pages/about.vue` page (default layout, auth middleware) submits to a new `POST /api/feedback` endpoint. The endpoint validates input with Zod, then sends an email via the existing `sendEmail()` utility in `server/utils/emailService.ts`. The About card is added to `pages/settings/index.vue`.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Zod, Resend (via existing `sendEmail()`), Vitest for unit tests.

---

### Task 1: API endpoint — `POST /api/feedback`

**Files:**
- Create: `server/api/feedback.post.ts`
- Create: `tests/unit/server/api/feedback.post.spec.ts`

**Step 1: Write the failing tests**

Create `tests/unit/server/api/feedback.post.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockState = {
  userId: "user-123",
  userEmail: "athlete@example.com",
  sendEmailResult: { success: true } as { success: boolean; error?: string },
}

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId, email: mockState.userEmail })),
}))

vi.mock("~/server/utils/emailService", () => ({
  sendEmail: vi.fn(async () => mockState.sendEmailResult),
}))

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}))

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3")
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  }
})

const { default: handler } = await import("~/server/api/feedback.post")

describe("POST /api/feedback", () => {
  beforeEach(() => {
    mockState.sendEmailResult = { success: true }
    mockState.userEmail = "athlete@example.com"
  })

  function makeEvent(body: unknown) {
    return { node: { req: {}, res: {} }, _body: body } as any
  }

  it("returns { success: true } for a valid bug report", async () => {
    const result = await handler(makeEvent({ subject: "bug", message: "The scores page crashes." }))
    expect(result).toEqual({ success: true })
  })

  it("returns { success: true } for a feature request", async () => {
    const result = await handler(makeEvent({ subject: "feature", message: "I want CSV export." }))
    expect(result).toEqual({ success: true })
  })

  it("throws 400 when subject is missing", async () => {
    await expect(handler(makeEvent({ message: "hello" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when subject is not a valid category", async () => {
    await expect(handler(makeEvent({ subject: "spam", message: "hello" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when message is empty", async () => {
    await expect(handler(makeEvent({ subject: "bug", message: "" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when message exceeds 5000 characters", async () => {
    await expect(
      handler(makeEvent({ subject: "general", message: "x".repeat(5001) }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 500 when sendEmail fails", async () => {
    mockState.sendEmailResult = { success: false, error: "Resend down" }
    await expect(
      handler(makeEvent({ subject: "question", message: "How do phases work?" }))
    ).rejects.toMatchObject({ statusCode: 500 })
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web
npm test -- tests/unit/server/api/feedback.post.spec.ts
```

Expected: FAIL — module `~/server/api/feedback.post` not found.

**Step 3: Implement the endpoint**

Create `server/api/feedback.post.ts`:

```typescript
import { defineEventHandler, readBody, createError } from "h3"
import { z } from "zod"
import { useLogger } from "~/server/utils/logger"
import { requireAuth } from "~/server/utils/auth"
import { sendEmail } from "~/server/utils/emailService"

const FEEDBACK_EMAIL = "info@therecruitingcompass.com"

const subjectLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  question: "Question",
  general: "General Feedback",
}

const feedbackSchema = z.object({
  subject: z.enum(["bug", "feature", "question", "general"]),
  message: z.string().min(1).max(5000),
})

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feedback")
  try {
    const user = await requireAuth(event)
    const body = await readBody(event)

    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      logger.warn("Validation failed for feedback submission", parsed.error.issues)
      throw createError({ statusCode: 400, statusMessage: "Invalid request" })
    }

    const { subject, message } = parsed.data
    const subjectLabel = subjectLabels[subject]
    const senderInfo = user.email ? ` from ${user.email}` : ""

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">[Feedback] ${subjectLabel}</h2>
          <p><strong>From:</strong> User ${user.id}${senderInfo}</p>
          <p><strong>Category:</strong> ${subjectLabel}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="white-space: pre-wrap;">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </body>
      </html>
    `

    const result = await sendEmail({
      to: FEEDBACK_EMAIL,
      subject: `[Feedback] ${subjectLabel}`,
      html,
    })

    if (!result.success) {
      logger.error("Failed to send feedback email", { error: result.error })
      throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
    }

    logger.info("Feedback submitted", { subject, userId: user.id })
    return { success: true }
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err
    logger.error("Unexpected error submitting feedback", err)
    throw createError({ statusCode: 500, statusMessage: "Failed to send feedback" })
  }
})
```

**Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/server/api/feedback.post.spec.ts
```

Expected: 7 tests PASS.

**Step 5: Commit**

```bash
git add server/api/feedback.post.ts tests/unit/server/api/feedback.post.spec.ts
git commit -m "feat: add POST /api/feedback endpoint"
```

---

### Task 2: About page — `pages/about.vue`

**Files:**
- Create: `pages/about.vue`

**Step 1: Create the page**

Create `pages/about.vue`:

```vue
<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100">
    <PageHeader title="About" description="Our mission and how to reach us" />

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <!-- Mission Statement -->
      <section>
        <p class="text-lg text-slate-700 leading-relaxed">
          The Recruiting Compass helps high school student athletes and their families manage the
          college recruiting journey — tracking schools, coaches, interactions, and timelines in one
          place. We believe every athlete deserves clarity, control, and a fair shot. No professional
          service required.
        </p>
      </section>

      <!-- Feedback Form -->
      <section>
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Send Us a Message</h2>

        <form class="space-y-4" @submit.prevent="submitFeedback">
          <div>
            <label for="subject" class="block text-sm font-medium text-slate-700 mb-1">
              Subject
            </label>
            <select
              id="subject"
              v-model="form.subject"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>Select a category</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="question">Question</option>
              <option value="general">General Feedback</option>
            </select>
          </div>

          <div>
            <label for="message" class="block text-sm font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              v-model="form.message"
              rows="6"
              maxlength="5000"
              placeholder="Tell us what's on your mind..."
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              required
            />
            <p class="text-xs text-slate-400 mt-1 text-right">
              {{ form.message.length }} / 5000
            </p>
          </div>

          <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <div v-if="submitted" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p class="text-sm text-green-700">Thanks for your message — we'll be in touch soon.</p>
          </div>

          <UButton
            type="submit"
            :loading="loading"
            :disabled="loading || submitted"
            color="primary"
          >
            Send Message
          </UButton>
        </form>
      </section>

      <!-- Fallback contact -->
      <section>
        <p class="text-sm text-slate-500">
          You can also reach us directly at
          <a
            href="mailto:info@therecruitingcompass.com"
            class="text-blue-600 hover:underline"
          >info@therecruitingcompass.com</a>.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue"
import { useAuthFetch } from "~/composables/useAuthFetch"

definePageMeta({
  middleware: "auth",
})

const { authFetch } = useAuthFetch()

const form = reactive({ subject: "", message: "" })
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref("")

async function submitFeedback() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ""

  try {
    await authFetch("/api/feedback", {
      method: "POST",
      body: { subject: form.subject, message: form.message },
    })
    submitted.value = true
    form.subject = ""
    form.message = ""
  } catch {
    errorMessage.value = "Something went wrong. Please try again or email us directly."
  } finally {
    loading.value = false
  }
}
</script>
```

**Step 2: Verify the page renders without errors**

Run dev server and navigate to `/about` while logged in:

```bash
npm run dev
```

Check: mission statement displays, form renders, submit button is present.

**Step 3: Commit**

```bash
git add pages/about.vue
git commit -m "feat: add About page with mission statement and feedback form"
```

---

### Task 3: Add About to Settings nav

**Files:**
- Modify: `pages/settings/index.vue`

**Step 1: Add the About card**

In `pages/settings/index.vue`, add a new section at the bottom (after the "Account & Profile" section, before `</main>`):

```vue
<!-- App Section -->
<div class="mb-8">
  <h2
    class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3"
  >
    App
  </h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <SettingsCard
      to="/about"
      icon="💬"
      title="About & Feedback"
      description="Our mission, and a way to send us feedback or report issues"
      variant="gray"
    />
  </div>
</div>
```

**Step 2: Verify the card appears**

Navigate to `/settings` while logged in and confirm the "About & Feedback" card is visible at the bottom of the page and links to `/about`.

**Step 3: Commit**

```bash
git add pages/settings/index.vue
git commit -m "feat: add About & Feedback link to Settings nav"
```

---

### Task 4: Final verification

**Step 1: Run full test suite**

```bash
npm test
```

Expected: all existing tests pass, 7 new tests in `feedback.post.spec.ts` pass.

**Step 2: Type check**

```bash
npm run type-check
```

Expected: 0 errors.

**Step 3: Lint**

```bash
npm run lint
```

Expected: 0 errors.

**Step 4: Manual smoke test**

1. Log in to the app
2. Navigate to `/settings` — confirm "About & Feedback" card is present
3. Click through to `/about` — confirm mission statement and form render
4. Submit a test message with Subject = "General Feedback" — confirm success banner appears
5. Check `info@therecruitingcompass.com` inbox for the email

**Step 5: Commit (if any fixes were needed)**

```bash
git add -p
git commit -m "fix: address type-check and lint issues in About page"
```
