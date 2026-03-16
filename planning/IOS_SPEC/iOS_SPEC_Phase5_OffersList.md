# iOS Page Specification: Offers List

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Offers List
**Web Route:** `/offers/index`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

The Offers List page allows athletes to track all scholarship offers received, manage offer statuses, compare multiple offers side-by-side, and monitor critical deadlines. It provides filtering, sorting, and comparison features to help make informed decisions.

### Key User Actions

- View all offers in a filterable/sortable list
- See summary counts (Accepted, Pending, Declined)
- Log new offers with complete details (amount, percentage, type, deadline)
- Compare 2+ selected offers side-by-side
- Filter by status, offer type, school name
- Sort by date, deadline, percentage, amount
- Navigate to offer detail page for full view/edit
- Delete offers with confirmation

### Success Criteria

- Offers load and display within 2 seconds
- Filtering and sorting work correctly
- Offer comparison shows 2+ offers in side-by-side view
- Deadline indicators show urgency (days remaining, color-coded)
- Form validation prevents invalid data entry
- All CRUD operations persist correctly

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Offers page
2. System fetches all offers for user
3. System displays:
   - Summary cards (Accepted, Pending, Declined counts)
   - Filter/sort controls
   - Offers list (grid/cards)
4. User can tap any offer to view details
5. User can select multiple offers for comparison
```

### Alternative Flow: Log New Offer

```
1. User taps "+ Log Offer" button
2. System shows add offer form
3. User fills in:
   - School (dropdown from user's schools)
   - Offer Type (full_ride, partial, scholarship, recruited_walk_on, preferred_walk_on)
   - Status (pending, accepted, declined, expired)
   - Scholarship % (0-100)
   - Scholarship Amount ($)
   - Offer Date (date picker)
   - Deadline (date picker, optional)
   - Notes (multiline text, optional)
4. User taps "Save Offer"
5. System validates required fields (school, offer_type, status, offer_date)
6. System saves to Supabase
7. System refreshes list
8. Form collapses
```

### Alternative Flow: Filter/Sort Offers

```
1. User taps filter/sort controls
2. User selects:
   - Status filter (All, Pending, Accepted, Declined, Expired)
   - Offer Type filter (All, Full Ride, Partial, etc.)
   - Sort By (Offer Date, Deadline, Percentage, Amount)
   - Sort Direction (Newest First, Oldest First)
3. System applies filters/sorts immediately
4. List updates with filtered/sorted offers
```

### Alternative Flow: Compare Offers

```
1. User selects 2+ offers via checkboxes
2. "Compare (N)" button appears
3. User taps "Compare" button
4. System shows comparison modal/sheet
5. Modal displays offers side-by-side with key fields:
   - School name
   - Offer type
   - Scholarship %
   - Scholarship $
   - Deadline
   - Status
6. User can make decision based on comparison
7. User closes comparison modal
```

### Alternative Flow: Delete Offer

```
1. User taps "Delete" button on offer card
2. System shows confirmation alert
3. User confirms deletion
4. System deletes offer from Supabase
5. System removes offer from UI
```

### Error Scenarios

```
Error: No offers logged
- User sees: Empty state
- Message: "No offers logged yet"
- Subtitle: "Log scholarship offers as you receive them"
- CTA: "+ Log Offer" button

Error: No results match filters
- User sees: "No offers match your filters"
- Subtitle: "Try adjusting your search criteria"
- Action: Clear filters button

Error: Fetch fails
- User sees: Error banner with retry
- Recovery: Pull-to-refresh
```

---

## 3. Data Models

### Primary Model: Offer

```swift
struct Offer: Codable, Identifiable {
  let id: String
  let userId: String
  let schoolId: String
  let offerType: OfferType
  let scholarshipAmount: Double?
  let scholarshipPercentage: Int?
  let offerDate: Date
  let deadlineDate: Date?
  let status: OfferStatus
  let conditions: String?
  let notes: String?
  let createdAt: Date
  let updatedAt: Date

  // Computed
  var daysUntilDeadline: Int? {
    guard let deadline = deadlineDate else { return nil }
    let calendar = Calendar.current
    let now = Date()
    let components = calendar.dateComponents([.day], from: now, to: deadline)
    return components.day
  }

  var deadlineUrgency: DeadlineUrgency {
    guard let days = daysUntilDeadline else { return .none }
    if days < 0 { return .overdue }
    if days <= 7 { return .critical }
    if days <= 30 { return .urgent }
    return .normal
  }
}

enum OfferType: String, Codable, CaseIterable {
  case fullRide = "full_ride"
  case partial = "partial"
  case scholarship = "scholarship"
  case recruitedWalkOn = "recruited_walk_on"
  case preferredWalkOn = "preferred_walk_on"

  var displayName: String {
    switch self {
    case .fullRide: return "Full Ride Scholarship"
    case .partial: return "Partial Scholarship"
    case .scholarship: return "Scholarship"
    case .recruitedWalkOn: return "Recruited Walk-On"
    case .preferredWalkOn: return "Preferred Walk-On"
    }
  }
}

enum OfferStatus: String, Codable, CaseIterable {
  case pending
  case accepted
  case declined
  case expired

  var displayName: String {
    rawValue.capitalized
  }

  var color: Color {
    switch self {
    case .pending: return .blue
    case .accepted: return .green
    case .declined: return .red
    case .expired: return .gray
    }
  }
}

enum DeadlineUrgency {
  case overdue
  case critical  // <= 7 days
  case urgent    // <= 30 days
  case normal
  case none      // no deadline set
}
```

### Data Origin

- **Source:** Supabase `offers` table
- **Refresh:** On page load, after create/update/delete
- **Caching:** In-memory only
- **Mutations:** Create, Update, Delete available

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Offers

```
GET /api/offers?status=pending&schoolId=uuid

Response:
{
  "success": true,
  "data": [ /* array of offers */ ]
}
```

#### Endpoint 2: Create Offer

```
POST /api/offers

Body:
{
  "school_id": "uuid",
  "offer_type": "full_ride",
  "scholarship_amount": 50000,
  "scholarship_percentage": 100,
  "offer_date": "2026-02-10",
  "deadline_date": "2026-03-01",
  "status": "pending",
  "conditions": null,
  "notes": "Full athletic scholarship"
}

Response:
{
  "success": true,
  "data": { /* created offer */ }
}
```

#### Endpoint 3: Delete Offer

```
DELETE /api/offers/:id

Response:
{
  "success": true
}
```

### Authentication

(Same as other pages)

---

## 5. State Management

```swift
@State var offers: [Offer] = []
@State var schools: [School] = []
@State var isLoading = false
@State var error: String? = nil
@State var showAddForm = false
@State var showComparison = false
@State var selectedOfferIds: Set<String> = []
@State var filters = OfferFilters()
@State var newOffer = NewOfferData()

struct OfferFilters {
  var schoolSearch: String = ""
  var status: OfferStatus? = nil
  var offerType: OfferType? = nil
  var sortBy: SortField = .offerDate
  var sortDirection: SortDirection = .descending
}

struct NewOfferData {
  var schoolId: String = ""
  var offerType: OfferType? = nil
  var scholarshipAmount: Double? = nil
  var scholarshipPercentage: Int? = nil
  var offerDate: Date = Date()
  var deadlineDate: Date? = nil
  var status: OfferStatus = .pending
  var notes: String = ""
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Header]
  - Title: "Offers"
  - Count: "N offers found"
  - Actions: [Compare (N)] [+ Log Offer]

[Summary Cards Row]
  - 3 cards: Accepted, Pending, Declined
  - Each shows count + icon

[Add Offer Form] (collapsible)
  - Form fields in grid (2-3 columns on larger screens)
  - Submit/Cancel buttons

[Filter Bar]
  - Search (school name)
  - Status dropdown
  - Offer Type dropdown
  - Sort By dropdown
  - Sort Direction dropdown

[Offers Grid/List]
  - Cards with:
    - Checkbox (for comparison)
    - School name
    - Status badge
    - Offer type label
    - Scholarship % / Amount
    - Offered date
    - Deadline (color-coded urgency)
    - Notes preview
    - [View] [Delete] buttons
  - Color-coded left border by status

[Comparison Modal]
  - Side-by-side comparison of selected offers
  - Shows all key fields for easy comparison

[Loading/Empty States]
```

### Design System

- **Colors:**
  - Accepted: Green (`#10b981`)
  - Pending: Blue (`#3b82f6`)
  - Declined: Red (`#ef4444`)
  - Expired: Gray (`#6b7280`)
  - Deadline Critical: Red (`#ef4444`)
  - Deadline Urgent: Amber (`#f59e0b`)

- **Card Style:**
  - White background, rounded corners (12pt)
  - Left border (4pt) color-coded by status
  - Shadow on hover

### Interactive Elements

- **Checkboxes:** Multi-select for comparison
- **Filter/Sort Controls:** Dropdowns/pickers
- **Offer Cards:** Tappable to navigate to detail view
- **Compare Button:** Only visible when 2+ offers selected

### Loading States

- Skeleton cards during initial load
- Pull-to-refresh gesture

### Accessibility

- VoiceOver labels for all elements
- Offer cards announce: "Offer from [School], [Status], [Amount], Deadline in [N] days"
- Color-coded urgency also conveyed via text
- 44pt minimum touch targets

---

## 7. Dependencies

### Frameworks

- SwiftUI (iOS 15+)
- Supabase iOS Client

### Third-Party Libraries

- None required (can use native SwiftUI)

---

## 8. Error Handling & Edge Cases

- **No offers:** Show empty state
- **No schools available:** Disable school dropdown, show message
- **Deadline passed:** Show "Overdue" in red
- **No deadline set:** Show "—" or "No deadline"
- **Very long school names:** Truncate with ellipsis
- **Amount formatting:** Use thousands separator (e.g., $50,000)
- **Percentage validation:** Ensure 0-100 range

---

## 9. Testing Checklist

### Happy Path

- [ ] Page loads offers correctly
- [ ] Can log new offer
- [ ] Filtering works (status, type, school search)
- [ ] Sorting works (all fields, both directions)
- [ ] Comparison modal shows 2+ offers
- [ ] Deadline urgency displays correctly
- [ ] Delete works with confirmation
- [ ] Navigation to detail page works

### Error Tests

- [ ] No offers shows empty state
- [ ] Invalid form data shows validation errors
- [ ] Network errors handled gracefully

### Edge Cases

- [ ] 100+ offers (performance acceptable)
- [ ] Offer with no deadline
- [ ] Overdue offers display correctly
- [ ] Checkbox selection/deselection works

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **School lookup:** Requires schools to be loaded first
- **Comparison feature:** Limited to visual comparison (no decision tracking)

### iOS-Specific

- **Form validation:** Ensure all required fields validated before submit
- **Date picker UX:** Native iOS date picker may differ from web
- **Deadline calculations:** Use Calendar for accurate day calculations

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/offers/index.vue`
- **Composables:** `useOffers`, `useSchools`
- **Components:** `OfferComparison`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Standard CRUD page with filtering/sorting. Comparison feature adds complexity. Ensure deadline calculations are accurate and timezone-aware.
