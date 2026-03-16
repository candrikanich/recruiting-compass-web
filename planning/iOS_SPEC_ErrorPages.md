# iOS Spec: Error Pages

**Platform parity with:** `error.vue` (web root)
**Status:** Ready for implementation
**Date:** 2026-03-06

---

## Overview

The Recruiting Compass shows branded, human-friendly error screens whenever something goes wrong — database outages, missing pages, auth failures. These replace generic iOS system errors. The goal is to keep users calm, clearly explain what happened, and give them a clear next step.

**Design principle:** Blame the system, never the user. Warm and direct. Brand-consistent.

---

## Visual Design

### Brand background

All error screens use the branded emerald background — matching the login/signup screens:

- Background: `Color("emerald-600")` → `#059669`
- Animated sport field lines as a subtle overlay (reuse `MultiSportFieldBackground` view)
- Decorative pulsing white circles in corners (subtle, `opacity: 0.1`, match landing screen)

### Card

Centered white card on the emerald background:

- Background: `Color.white.opacity(0.95)`
- Corner radius: `16`
- Shadow: medium
- Padding: `32`
- Max width: `400` (centered with horizontal padding `24`)

### Logo

Recruiting Compass stacked logo above the card:
- Asset: `recruiting-compass-stacked` (already in iOS asset catalog)
- Height: `120`, proportional width
- Drop shadow

### Layout (top to bottom inside card)

1. Colored icon circle (56×56, `cornerRadius: 28`)
2. Headline — `title2`, `bold`, `Color.primary`, centered
3. Body — `body`, `Color.secondary`, centered, max 3 lines
4. Status code — `caption`, `Color.tertiaryLabel`, monospaced (hidden if no code)
5. Primary button — blue filled
6. Secondary button — gray background (optional, per error type)

### Support link (below card)

`"Need help? Contact support"` — white/70 opacity, links to `mailto:support@therecruitingcompass.com`

---

## Error Types

### 404 — Page Not Found

```
Headline:  That page ran a different route.
Body:      We couldn't find what you're looking for. It may have
           moved, or the link might be off.
Icon:      MagnifyingGlass (SF Symbol: magnifyingglass)
Icon bg:   blue-50 (#EFF6FF)
Icon fg:   blue-500 (#3B82F6)
Primary:   "Go to Dashboard" → navigate to Dashboard tab
Secondary: "Search Schools" → navigate to Schools tab
```

### 401 — Unauthenticated

```
Headline:  You'll need to sign in first.
Body:      This page requires an account. Log in to pick up where
           you left off.
Icon:      Lock (SF Symbol: lock.fill)
Icon bg:   amber-50 (#FFFBEB)
Icon fg:   amber-500 (#F59E0B)
Primary:   "Sign In" → navigate to Login screen
Secondary: "Create Account" → navigate to Signup screen
```

### 403 — Forbidden

```
Headline:  This isn't your playbook.
Body:      You don't have access to this page. If you think that's
           a mistake, reach out to the account owner.
Icon:      ShieldExclamation (SF Symbol: shield.slash.fill)
Icon bg:   red-50 (#FEF2F2)
Icon fg:   red-500 (#EF4444)
Primary:   "Go to Dashboard" → navigate to Dashboard tab
Secondary: (none)
```

### 500 — Internal Server Error

```
Headline:  We fumbled. It's on us.
Body:      Something went wrong on our end. Your data is safe, but
           we hit an unexpected snag. Our team has been notified.
Icon:      ExclamationTriangle (SF Symbol: exclamationmark.triangle.fill)
Icon bg:   red-50 (#FEF2F2)
Icon fg:   red-500 (#EF4444)
Primary:   "Try Again" → retry the failed request
Secondary: "Go Home" → navigate to Dashboard tab
```

### 502/503/504 — Service Unavailable / Gateway Timeout

```
Headline:  We're taking a timeout.
Body:      Something on our end isn't cooperating right now. Your
           recruiting data is safe — we're just temporarily offline.
           Try again in a few minutes.
Icon:      Clock (SF Symbol: clock.fill)
Icon bg:   slate-50 (#F8FAFC)
Icon fg:   slate-500 (#64748B)
Primary:   "Try Again" → retry the failed request
Secondary: "Go Home" → navigate to Dashboard tab
```

### Network / Offline (URLError)

```
Headline:  Looks like the connection dropped.
Body:      We can't reach our servers right now. Check your
           connection and try again.
Icon:      WiFiSlash (SF Symbol: wifi.slash)
Icon bg:   slate-50 (#F8FAFC)
Icon fg:   slate-500 (#64748B)
Primary:   "Try Again" → retry
Secondary: (none)
```

### Default / Unknown

```
Headline:  Something went sideways.
Body:      We hit an unexpected snag. Your data is safe — try
           refreshing or head back home.
Icon:      ExclamationCircle (SF Symbol: exclamationmark.circle.fill)
Icon bg:   slate-50 (#F8FAFC)
Icon fg:   slate-500 (#64748B)
Primary:   "Try Again" → retry
Secondary: "Go Home" → navigate to Dashboard tab
```

---

## Session Expired (Inline — Not Full Screen)

Shown on any screen after a token expiry or `401` from a background refresh. Use a bottom sheet / modal rather than replacing the full screen (the user may have unsaved form state):

```
Title:     You've been away for a while.
Body:      For your security, we signed you out after a period of
           inactivity. Log back in to continue.
Button:    "Sign In Again" → Login screen
```

---

## Implementation Notes

### SwiftUI Component

Create a reusable `ErrorStateView` that accepts an `AppError` enum:

```swift
enum AppError {
    case notFound
    case unauthorized
    case forbidden
    case serverError(statusCode: Int)
    case serviceUnavailable
    case networkOffline
    case sessionExpired
    case unknown
}

struct ErrorStateView: View {
    let error: AppError
    let onPrimary: () -> Void
    let onSecondary: (() -> Void)?
    // ...
}
```

### Presentation

- **Full-screen errors** (fatal, navigation failed): Present `ErrorStateView` as the root view or via `.fullScreenCover`
- **Inline errors** (a tab failed to load): Show `ErrorStateView` inside the tab's `NavigationStack` content area, not full-screen
- **Session expired**: Present as `.sheet` with `isPresented` binding

### Error Detection

Map HTTP status codes and `URLError` types to `AppError`:

```swift
extension AppError {
    init(from error: Error) {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost:
                self = .networkOffline
            case .timedOut:
                self = .serviceUnavailable
            default:
                self = .unknown
            }
        } else {
            self = .unknown
        }
    }

    init(statusCode: Int) {
        switch statusCode {
        case 401: self = .unauthorized
        case 403: self = .forbidden
        case 404: self = .notFound
        case 500: self = .serverError(statusCode: 500)
        case 502, 503, 504: self = .serviceUnavailable
        default: self = .unknown
        }
    }
}
```

### "Try Again" Behavior

Pass a retry closure through `onPrimary`. The calling view manages the retry logic — `ErrorStateView` just calls it. This keeps the component stateless.

---

## Accessibility

- All icon circles: `accessibilityHidden(true)` (decorative)
- Headline: `accessibilityAddTraits(.isHeader)`
- Announce error on appear: `accessibilityFocused` on the headline or use `UIAccessibility.post(notification: .announcement, argument: headline)`
- Buttons: standard SwiftUI button accessibility (labels match visible text)
- Support email link: `Link("Contact support", destination: URL(string: "mailto:support@therecruitingcompass.com")!)`

---

## Reference

Web implementation: `error.vue` (root of web app)
Logo asset: `recruiting-compass-stacked` (already in iOS asset catalog)
Brand background: reuse the same emerald background component used on Login/Signup screens
