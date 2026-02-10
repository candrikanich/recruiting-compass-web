# iOS Page Specification

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Terms of Service
**Web Route:** `/legal/terms`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** Low

---

## 1. Overview

### Purpose

Displays the Terms and Conditions (Terms of Service) for using The Recruiting Compass application. Users can read the full legal text, which covers usage rights, disclaimers, limitations, user accounts, prohibited activities, and governing law. This page is required for compliance and transparency.

### Key User Actions

- Read Terms and Conditions text
- Scroll through all sections
- Navigate back to previous page
- Optional: Accept/Decline terms (if first-time user or after update)

### Success Criteria

- User can read all sections of the Terms
- Text is properly formatted with headers and lists
- Scrolling works smoothly
- "Last Updated" date displays correctly
- User can navigate back easily
- Links within text open correctly (if any)

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Terms of Service page
   - From settings, onboarding, or legal footer link
2. System displays Terms header with "Last Updated" date
3. User sees scrollable legal text with 11 sections
4. User scrolls to read all sections
5. User taps back button to return
```

### Alternative Flows

```
Flow B: First-Time User (Acceptance Required)
1. User creates account or first launches app
2. System presents Terms of Service modal
3. User reads terms (required scroll to bottom)
4. User sees "Accept" and "Decline" buttons
5. User taps "Accept"
6. System records acceptance in database
7. Modal dismisses, user continues to app

Flow C: Terms Updated (Re-acceptance Required)
1. User launches app after terms update
2. System detects user hasn't accepted new version
3. System presents Terms modal
4. User must accept or decline
5. If decline: user logged out, cannot use app
6. If accept: acceptance recorded, user continues

Flow D: Open External Link (if any)
1. User taps link within terms text
2. System opens SFSafariViewController
3. User views linked content
4. User closes browser, returns to terms
```

### Error Scenarios

```
Error: Failed to load terms
- User sees: Error banner "Unable to load Terms of Service"
- Recovery: Tap retry button or navigate back

Error: Acceptance failed to save
- User sees: Alert "Failed to save acceptance. Please try again."
- Recovery: Retry accept button
```

---

## 3. Data Models

### Primary Model

```swift
struct TermsOfService {
  let content: String // Full Markdown or HTML text
  let lastUpdated: Date
  let version: String // e.g., "1.0"

  var formattedDate: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .long
    return formatter.string(from: lastUpdated)
  }
}

struct TermsAcceptance: Codable {
  let userId: String
  let termsVersion: String
  let acceptedAt: Date
  let ipAddress: String? // Optional for audit
}
```

### Related Models

- `User` (for tracking acceptance)

### Data Origin

- **Source:** Hardcoded in app bundle OR fetched from Supabase `legal_documents` table
- **Refresh:** Only on app update (if hardcoded) OR on page load (if dynamic)
- **Caching:** Cache indefinitely (update only when version changes)
- **Mutations:** Create acceptance record (if required)

---

## 4. API Integration

### Endpoints Used

#### Option A: Static Content (Hardcoded)

```
No API calls needed.
Terms text bundled with app in Assets or as .md file.
```

#### Option B: Dynamic Content (Supabase)

```
GET via Supabase
Table: legal_documents
Filter: type = "terms_of_service"
Select: content, last_updated, version

Swift Example:
let response = try await supabase
  .from("legal_documents")
  .select("content, last_updated, version")
  .eq("type", "terms_of_service")
  .single()
  .execute()

Response:
{
  "content": "# Terms and Conditions\n\n## 1. Agreement to Terms\n...",
  "last_updated": "2026-01-15T00:00:00Z",
  "version": "1.0"
}

Error Codes:
- 404: Terms not found (fallback to bundled version)
- 500: Server error (fallback to bundled version)
```

#### Endpoint 2: Record Acceptance (if required)

```
POST via Supabase
Table: legal_acceptances

Swift Example:
let acceptance = [
  "user_id": userId,
  "document_type": "terms_of_service",
  "version": termsVersion,
  "accepted_at": ISO8601DateFormatter().string(from: Date()),
  "ip_address": deviceIP // Optional
]

let response = try await supabase
  .from("legal_acceptances")
  .insert([acceptance])
  .execute()

Response:
{ "success": true }

Error Codes:
- 401: Not authenticated
- 500: Failed to save
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK
- **Note:** Terms page should be accessible without authentication (public layout)

---

## 5. State Management

### Page-Level State

```swift
@Published var termsContent: String = ""
@Published var lastUpdated: Date = Date()
@Published var version: String = "1.0"
@Published var isLoading = false
@Published var error: String? = nil
@Published var hasScrolledToBottom = false
@Published var showAcceptButtons = false // If acceptance required
```

### Persistence Across Navigation

- **Terms content:** Cached indefinitely
- **Acceptance status:** Persisted in database

### Shared State (if cross-page)

- **Auth state:** Accessed to determine if acceptance required
- **User data:** Used for recording acceptance

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView or Modal (if acceptance required)]
  [Header - Sticky]
    - Back button (if navigation) OR Close button (if modal)
    - Title: "Terms and Conditions"

  [ScrollView]
    [Last Updated]
      - Text: "Last Updated: [Date]"
      - Style: Small, gray, centered

    [Content]
      - Markdown or styled text
      - Sections with headers (h2)
      - Paragraphs
      - Bulleted/numbered lists
      - Emphasis (bold, italic)

    [Spacer - 100pt] (if acceptance required)

  [Footer Buttons] (if acceptance required, sticky bottom)
    - "Decline" button (gray, outline)
    - "Accept" button (blue, filled, disabled until scrolled to bottom)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Text: `#111827` (near-black)
  - Gray: `#475569` (body text)
  - Light gray: `#F9FAFB` (background)

- **Typography:**
  - Title: SF Pro Display, 28pt, bold
  - H2 headers: SF Pro Text, 20pt, bold
  - Body: SF Pro Text, 16pt, regular, line height 1.5
  - Last Updated: SF Pro Text, 12pt, regular, gray

- **Spacing:** 20pt padding, 16pt between sections
- **Radius:** 8pt for buttons

### Interactive Elements

#### Back/Close Button

- **Position:** Top-left corner
- **Style:** Standard navigation back (navigation) OR "X" close (modal)
- **Tap:** Dismiss page

#### Scrollable Content

- **Scroll indicator:** Always visible
- **Bounce:** Enabled
- **Tracking:** Detect when user scrolls to bottom (if acceptance required)

#### Accept/Decline Buttons (if required)

- **Layout:** Horizontal row, equal width
- **Decline button:**
  - Style: Gray outline, gray text
  - Tap: Show confirmation alert "You must accept the Terms to use the app"
- **Accept button:**
  - Style: Blue filled, white text
  - Disabled: Until user scrolls to bottom
  - Enabled: When `hasScrolledToBottom = true`
  - Tap: Record acceptance, dismiss modal

### Loading States

```
First Load:
- Loading spinner in center
- Text: "Loading Terms..."

Error State:
- Icon: ⚠️ (gray, 60pt)
- Title: "Unable to load Terms of Service"
- Subtitle: "Please check your connection"
- CTA: "Retry" button
- Fallback: If bundled version exists, show it
```

### Accessibility

- **VoiceOver:**
  - Title: "Terms and Conditions"
  - Last Updated: "Last updated [Date]"
  - Content: Read full text with proper heading navigation
  - Accept button: "Accept Terms and Conditions. Button. [Enabled/Disabled]"
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for buttons
- **Dynamic Type:** Support text size scaling (important for legal text)
- **Headings:** Properly tagged for VoiceOver navigation (h2, h3)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- SafariServices (for external links, if any)
- Supabase iOS Client (if dynamic content)
- Foundation (for date formatting)

### Third-Party Libraries

- **Markdown rendering:** Use `AttributedString(markdown:)` (iOS 15+) OR third-party library like `Down` or `SwiftMarkdown`

### External Services

- Supabase PostgreSQL (`legal_documents`, `legal_acceptances` tables) - if dynamic
- None if using bundled static content

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show error state, fallback to bundled version
- **No internet:** Show error state, fallback to bundled version
- **Server error (5xx):** Show error state, fallback to bundled version

### Data Errors

- **Terms not found:** Fallback to bundled version
- **Malformed Markdown:** Show raw text with warning

### User Errors

- **User tries to accept without scrolling:** Button remains disabled
- **User declines terms:** Show alert, do not proceed

### Edge Cases

- **Very long text (20+ pages):** Ensure smooth scrolling, consider pagination
- **External links broken:** Show error if link fails to open
- **Acceptance fails to save:** Show error, allow retry
- **User kills app during acceptance:** On next launch, check acceptance status
- **Terms updated while user viewing:** Show alert on next page transition

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays terms correctly
- [ ] "Last Updated" date displays correctly
- [ ] All 11 sections display with proper formatting
- [ ] User can scroll through entire document
- [ ] Headers are bold and properly styled
- [ ] Lists display with bullets/numbers
- [ ] User can navigate back
- [ ] (If acceptance) Accept button enables after scroll to bottom
- [ ] (If acceptance) Acceptance saves successfully

### Error Tests

- [ ] Handle network timeout (show error, fallback to bundled)
- [ ] Handle missing terms (fallback to bundled)
- [ ] Handle malformed Markdown (show raw text)
- [ ] Handle acceptance save failure (show error, allow retry)
- [ ] Handle external link failure (show alert)

### Edge Case Tests

- [ ] Very long text scrolls smoothly
- [ ] VoiceOver reads content correctly
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text properly (especially important for legal)
- [ ] Landscape orientation works correctly
- [ ] User can decline terms (if acceptance flow)
- [ ] Scroll-to-bottom detection works accurately

### Performance Tests

- [ ] Page loads in <1 second (bundled) or <2 seconds (dynamic)
- [ ] Scrolling is smooth (60 fps)
- [ ] No memory leaks when navigating away
- [ ] Markdown rendering doesn't block UI

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Static content:** Web uses hardcoded terms in component, not fetched dynamically
- **No acceptance tracking:** Web doesn't implement accept/decline flow
- **Public layout:** Web uses "public" layout (no auth required)

### iOS-Specific Considerations

- **Markdown rendering:** iOS 15+ has native `AttributedString(markdown:)`, older versions need third-party library
- **Scroll tracking:** Detecting "scrolled to bottom" requires careful implementation (account for safe area, content insets)
- **Acceptance enforcement:** If acceptance required, must block app usage until accepted
- **Bundled fallback:** Always include bundled version in case of network failure
- **Version tracking:** Ensure version number updates when terms change

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/legal/terms.vue`
- **Layout:** `public` layout (no auth required)
- **Composables:** None (static content)
- **Content:** Hardcoded in component

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Database Schema:** `legal_documents`, `legal_acceptances` tables (if dynamic)

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Recommend bundling terms in app for offline access
- Consider dynamic fetching for updates without app releases
- Implement acceptance tracking if required for compliance
- Ensure proper Markdown rendering for readability
- Add version checking to prompt users for re-acceptance after updates
- Consider adding print/share functionality (optional)

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Privacy Policy** (`iOS_SPEC_Phase6_PrivacyPolicy.md`) - Identical pattern

### Code Snippets from Web

```vue
<!-- Terms content (from web) -->
<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div
        class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between"
      >
        <NuxtLink
          to="/"
          class="text-slate-600 hover:text-slate-900 flex items-center gap-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back
        </NuxtLink>
        <h1 class="text-2xl font-bold text-slate-900">Terms and Conditions</h1>
        <div class="w-10" />
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-12">
      <div
        class="bg-white rounded-lg shadow-sm p-8 prose prose-slate max-w-none"
      >
        <p class="text-slate-600 mb-8">
          <strong>Last Updated:</strong> {{ lastUpdated }}
        </p>

        <section class="mb-8">
          <h2>1. Agreement to Terms</h2>
          <p>By accessing and using the Recruiting Compass website...</p>
        </section>

        <!-- More sections... -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const lastUpdated = ref(
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);
</script>
```

### iOS Markdown Rendering Example

```swift
// iOS 15+ native Markdown rendering
let markdownString = """
# Terms and Conditions

## 1. Agreement to Terms

By accessing and using the Recruiting Compass...

- Item 1
- Item 2
- Item 3
"""

let attributedString = try? AttributedString(
  markdown: markdownString,
  options: AttributedString.MarkdownParsingOptions(
    interpretedSyntax: .inlineOnlyPreservingWhitespace
  )
)

Text(attributedString ?? "Failed to load terms")
  .font(.body)
  .foregroundColor(.secondary)
```

### Scroll-to-Bottom Detection

```swift
ScrollViewReader { proxy in
  ScrollView {
    VStack(alignment: .leading, spacing: 16) {
      // Content
      Text(termsContent)

      // Bottom marker
      Color.clear
        .frame(height: 1)
        .id("bottom")
        .onAppear {
          hasScrolledToBottom = true
        }
    }
  }
}
```
