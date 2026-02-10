# iOS Page Specification

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Privacy Policy
**Web Route:** `/legal/privacy`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** Low

---

## 1. Overview

### Purpose

Displays the Privacy Policy for The Recruiting Compass application, explaining how user data is collected, used, shared, and protected. Users can read about their privacy rights, data security measures, cookie usage, and contact information for privacy questions. This page is required for GDPR, CCPA, and App Store compliance.

### Key User Actions

- Read Privacy Policy text
- Scroll through all sections
- Navigate back to previous page
- Navigate to app privacy settings (optional link)
- Optional: Accept/Acknowledge privacy policy (if required)

### Success Criteria

- User can read all sections of the Privacy Policy
- Text is properly formatted with headers, subheaders, and lists
- Scrolling works smoothly
- "Last Updated" date displays correctly
- User can navigate back easily
- Links within text open correctly (if any)
- Optional "Manage Settings" button works (if implemented)

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Privacy Policy page
   - From settings, onboarding, or legal footer link
2. System displays Privacy Policy header with "Last Updated" date
3. User sees scrollable legal text with 12 sections
4. User scrolls to read all sections
5. User taps back button to return
```

### Alternative Flows

```
Flow B: Navigate to Privacy Settings
1. User reads privacy policy
2. User taps "Manage Privacy Settings" button (if implemented)
3. System navigates to app settings page
4. User can adjust privacy preferences

Flow C: First-Time User (Acknowledgment Required)
1. User creates account or first launches app
2. System presents Privacy Policy modal
3. User reads policy (required scroll to bottom)
4. User sees "Accept" button
5. User taps "Accept"
6. System records acknowledgment in database
7. Modal dismisses, user continues to app

Flow D: Open External Link
1. User taps email link (privacy@recruitingcompass.com)
2. System opens Mail app with pre-filled recipient
3. User composes privacy inquiry
```

### Error Scenarios

```
Error: Failed to load privacy policy
- User sees: Error banner "Unable to load Privacy Policy"
- Recovery: Tap retry button or navigate back

Error: Acknowledgment failed to save
- User sees: Alert "Failed to save acknowledgment. Please try again."
- Recovery: Retry accept button
```

---

## 3. Data Models

### Primary Model

```swift
struct PrivacyPolicy {
  let content: String // Full Markdown or HTML text
  let lastUpdated: Date
  let version: String // e.g., "1.0"

  var formattedDate: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .long
    return formatter.string(from: lastUpdated)
  }
}

struct PrivacyAcknowledgment: Codable {
  let userId: String
  let policyVersion: String
  let acknowledgedAt: Date
  let ipAddress: String? // Optional for audit
}
```

### Related Models

- `User` (for tracking acknowledgment)

### Data Origin

- **Source:** Hardcoded in app bundle OR fetched from Supabase `legal_documents` table
- **Refresh:** Only on app update (if hardcoded) OR on page load (if dynamic)
- **Caching:** Cache indefinitely (update only when version changes)
- **Mutations:** Create acknowledgment record (if required)

---

## 4. API Integration

### Endpoints Used

#### Option A: Static Content (Hardcoded)

```
No API calls needed.
Privacy policy text bundled with app in Assets or as .md file.
```

#### Option B: Dynamic Content (Supabase)

```
GET via Supabase
Table: legal_documents
Filter: type = "privacy_policy"
Select: content, last_updated, version

Swift Example:
let response = try await supabase
  .from("legal_documents")
  .select("content, last_updated, version")
  .eq("type", "privacy_policy")
  .single()
  .execute()

Response:
{
  "content": "# Privacy Policy\n\n## 1. Introduction\n...",
  "last_updated": "2026-01-15T00:00:00Z",
  "version": "1.0"
}

Error Codes:
- 404: Privacy policy not found (fallback to bundled version)
- 500: Server error (fallback to bundled version)
```

#### Endpoint 2: Record Acknowledgment (if required)

```
POST via Supabase
Table: legal_acceptances

Swift Example:
let acknowledgment = [
  "user_id": userId,
  "document_type": "privacy_policy",
  "version": policyVersion,
  "accepted_at": ISO8601DateFormatter().string(from: Date()),
  "ip_address": deviceIP // Optional
]

let response = try await supabase
  .from("legal_acceptances")
  .insert([acknowledgment])
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
- **Note:** Privacy policy page should be accessible without authentication (public layout)

---

## 5. State Management

### Page-Level State

```swift
@Published var policyContent: String = ""
@Published var lastUpdated: Date = Date()
@Published var version: String = "1.0"
@Published var isLoading = false
@Published var error: String? = nil
@Published var hasScrolledToBottom = false
@Published var showAcceptButton = false // If acknowledgment required
```

### Persistence Across Navigation

- **Policy content:** Cached indefinitely
- **Acknowledgment status:** Persisted in database

### Shared State (if cross-page)

- **Auth state:** Accessed to determine if acknowledgment required
- **User data:** Used for recording acknowledgment

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView or Modal (if acknowledgment required)]
  [Header - Sticky]
    - Back button (if navigation) OR Close button (if modal)
    - Title: "Privacy Policy"

  [ScrollView]
    [Last Updated]
      - Text: "Last Updated: [Date]"
      - Style: Small, gray, centered

    [Content]
      - Markdown or styled text
      - Sections with headers (h2)
      - Subsections with subheaders (h3)
      - Paragraphs
      - Bulleted/numbered lists
      - Emphasis (bold, italic)
      - Contact information box (gray background)

    [Manage Settings Button] (optional)
      - "Manage Privacy Settings" link/button
      - Navigate to app settings

    [Spacer - 100pt] (if acknowledgment required)

  [Footer Button] (if acknowledgment required, sticky bottom)
    - "Accept" button (blue, filled, disabled until scrolled to bottom)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Text: `#111827` (near-black)
  - Gray: `#475569` (body text)
  - Light gray: `#F9FAFB` (background)
  - Contact box background: `#F3F4F6`

- **Typography:**
  - Title: SF Pro Display, 28pt, bold
  - H2 headers: SF Pro Text, 20pt, bold
  - H3 subheaders: SF Pro Text, 18pt, semibold
  - Body: SF Pro Text, 16pt, regular, line height 1.5
  - Last Updated: SF Pro Text, 12pt, regular, gray

- **Spacing:** 20pt padding, 16pt between sections, 12pt between subsections
- **Radius:** 8pt for buttons, 12pt for contact box

### Interactive Elements

#### Back/Close Button

- **Position:** Top-left corner
- **Style:** Standard navigation back (navigation) OR "X" close (modal)
- **Tap:** Dismiss page

#### Scrollable Content

- **Scroll indicator:** Always visible
- **Bounce:** Enabled
- **Tracking:** Detect when user scrolls to bottom (if acknowledgment required)

#### Contact Information Box

- **Layout:** Gray background box with rounded corners
- **Content:** "Recruiting Compass" + email addresses
- **Email links:** Tappable, open Mail app

#### Manage Settings Button (optional)

- **Position:** Below main content, before footer
- **Style:** Blue text, arrow icon
- **Tap:** Navigate to app privacy settings page

#### Accept Button (if required)

- **Style:** Blue filled, white text
- **Disabled:** Until user scrolls to bottom
- **Enabled:** When `hasScrolledToBottom = true`
- **Tap:** Record acknowledgment, dismiss modal

### Loading States

```
First Load:
- Loading spinner in center
- Text: "Loading Privacy Policy..."

Error State:
- Icon: ⚠️ (gray, 60pt)
- Title: "Unable to load Privacy Policy"
- Subtitle: "Please check your connection"
- CTA: "Retry" button
- Fallback: If bundled version exists, show it
```

### Accessibility

- **VoiceOver:**
  - Title: "Privacy Policy"
  - Last Updated: "Last updated [Date]"
  - Content: Read full text with proper heading navigation (h2, h3)
  - Accept button: "Accept Privacy Policy. Button. [Enabled/Disabled]"
  - Email links: "Email privacy at recruitingcompass dot com. Link."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for buttons and links
- **Dynamic Type:** Support text size scaling (important for legal text)
- **Headings:** Properly tagged for VoiceOver navigation (h2, h3)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- MessageUI (for email composition, if using email links)
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

- **Privacy policy not found:** Fallback to bundled version
- **Malformed Markdown:** Show raw text with warning

### User Errors

- **User tries to accept without scrolling:** Button remains disabled
- **Email app not available:** Show alert "Email not available on this device"

### Edge Cases

- **Very long text (25+ pages):** Ensure smooth scrolling, consider pagination
- **Email links broken:** Show error if Mail app fails to open
- **Acknowledgment fails to save:** Show error, allow retry
- **User kills app during acknowledgment:** On next launch, check acknowledgment status
- **Privacy policy updated while user viewing:** Show alert on next page transition

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays privacy policy correctly
- [ ] "Last Updated" date displays correctly
- [ ] All 12 sections display with proper formatting
- [ ] Subsections (h3) display correctly under main sections
- [ ] User can scroll through entire document
- [ ] Headers and subheaders are bold and properly styled
- [ ] Lists display with bullets/numbers
- [ ] Contact information box displays correctly
- [ ] Email links open Mail app correctly
- [ ] User can navigate back
- [ ] (If acknowledgment) Accept button enables after scroll to bottom
- [ ] (If acknowledgment) Acknowledgment saves successfully
- [ ] (If implemented) "Manage Settings" button navigates correctly

### Error Tests

- [ ] Handle network timeout (show error, fallback to bundled)
- [ ] Handle missing privacy policy (fallback to bundled)
- [ ] Handle malformed Markdown (show raw text)
- [ ] Handle acknowledgment save failure (show error, allow retry)
- [ ] Handle email link failure (show alert)

### Edge Case Tests

- [ ] Very long text scrolls smoothly
- [ ] VoiceOver reads content correctly with heading navigation
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text properly (especially important for legal)
- [ ] Landscape orientation works correctly
- [ ] Scroll-to-bottom detection works accurately
- [ ] Email addresses format correctly (no parsing errors)

### Performance Tests

- [ ] Page loads in <1 second (bundled) or <2 seconds (dynamic)
- [ ] Scrolling is smooth (60 fps)
- [ ] No memory leaks when navigating away
- [ ] Markdown rendering doesn't block UI

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Static content:** Web uses hardcoded privacy policy in component, not fetched dynamically
- **No acknowledgment tracking:** Web doesn't implement accept flow
- **Public layout:** Web uses "public" layout (no auth required)
- **Subsections:** Web uses h3 for subsections (iOS should preserve this hierarchy)

### iOS-Specific Considerations

- **Markdown rendering:** iOS 15+ has native `AttributedString(markdown:)`, older versions need third-party library
- **Scroll tracking:** Detecting "scrolled to bottom" requires careful implementation (account for safe area, content insets)
- **Email links:** iOS must handle `mailto:` URLs correctly, fallback if Mail app unavailable
- **Bundled fallback:** Always include bundled version in case of network failure
- **Version tracking:** Ensure version number updates when policy changes
- **GDPR/CCPA compliance:** Ensure policy covers all required disclosures

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/legal/privacy.vue`
- **Layout:** `public` layout (no auth required)
- **Composables:** None (static content)
- **Content:** Hardcoded in component

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Database Schema:** `legal_documents`, `legal_acceptances` tables (if dynamic)

### Legal Compliance

- **GDPR:** General Data Protection Regulation (EU)
- **CCPA:** California Consumer Privacy Act
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Recommend bundling privacy policy in app for offline access
- Consider dynamic fetching for updates without app releases
- Implement acknowledgment tracking if required for compliance
- Ensure proper Markdown rendering for readability
- Add version checking to prompt users for re-acknowledgment after updates
- Ensure GDPR/CCPA compliance in privacy policy text
- Consider adding print/share functionality (optional)
- "Manage Settings" link could navigate to app-level privacy settings

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Terms of Service** (`iOS_SPEC_Phase6_TermsOfService.md`) - Nearly identical pattern

### Code Snippets from Web

```vue
<!-- Privacy policy content (from web) -->
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
        <h1 class="text-2xl font-bold text-slate-900">Privacy Policy</h1>
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
          <h2>1. Introduction</h2>
          <p>Recruiting Compass is committed to protecting your privacy...</p>
        </section>

        <section class="mb-8">
          <h2>2. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways:</p>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            Information You Provide
          </h3>
          <ul>
            <li><strong>Registration Information:</strong> Name, email...</li>
            <!-- More items -->
          </ul>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            Automatically Collected Information
          </h3>
          <ul>
            <li><strong>Log Data:</strong> IP address, browser type...</li>
            <!-- More items -->
          </ul>
        </section>

        <!-- More sections... -->

        <section class="mb-8">
          <h2>12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, please contact us at:
          </p>
          <div class="bg-slate-50 p-4 rounded mt-4">
            <p>
              <strong>Recruiting Compass</strong><br />
              Email: privacy@recruitingcompass.com<br />
              Support: support@recruitingcompass.com
            </p>
          </div>
        </section>
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

### iOS Markdown Rendering with Subsections

```swift
// iOS 15+ native Markdown rendering with h3 subsections
let markdownString = """
# Privacy Policy

## 1. Introduction

Recruiting Compass is committed to protecting your privacy...

## 2. Information We Collect

We may collect information about you in a variety of ways:

### Information You Provide

- **Registration Information:** Name, email address, password...
- **Profile Information:** Profile photo, biographical information...

### Automatically Collected Information

- **Log Data:** IP address, browser type, pages visited...
- **Device Information:** Device type, operating system...
"""

let attributedString = try? AttributedString(
  markdown: markdownString,
  options: AttributedString.MarkdownParsingOptions(
    interpretedSyntax: .inlineOnlyPreservingWhitespace
  )
)

Text(attributedString ?? "Failed to load privacy policy")
  .font(.body)
  .foregroundColor(.secondary)
```

### Contact Information Box Styling

```swift
VStack(alignment: .leading, spacing: 8) {
  Text("Recruiting Compass")
    .font(.headline)

  Text("Email: privacy@recruitingcompass.com")
    .font(.body)
    .foregroundColor(.blue)
    .onTapGesture {
      // Open Mail app
      if let url = URL(string: "mailto:privacy@recruitingcompass.com") {
        UIApplication.shared.open(url)
      }
    }

  Text("Support: support@recruitingcompass.com")
    .font(.body)
    .foregroundColor(.blue)
    .onTapGesture {
      if let url = URL(string: "mailto:support@recruitingcompass.com") {
        UIApplication.shared.open(url)
      }
    }
}
.padding()
.background(Color.gray.opacity(0.1))
.cornerRadius(12)
```
