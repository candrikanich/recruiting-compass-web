# iOS Page Specification: Offer Detail

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Offer Detail
**Web Route:** `/offers/[id]`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

The Offer Detail page provides a comprehensive view of a single scholarship offer with all details, financial breakdown, deadline information, and editing capabilities. It includes a scholarship calculator to help users understand the financial value.

### Key User Actions

- View complete offer details (school, type, amount, percentage, dates, notes)
- See financial summary (amount, percentage, days until deadline)
- Edit offer details inline
- Use scholarship calculator to estimate total value
- Delete offer with confirmation
- Navigate back to offers list

### Success Criteria

- Offer loads within 1 second
- All financial details display correctly
- Edit mode toggles correctly
- Scholarship calculator computes accurately
- Delete operation requires confirmation and succeeds
- Deadline urgency displays with correct color coding

---

## 2. User Flows

### Primary Flow

```
1. User navigates from Offers List by tapping an offer
2. System fetches offer details by ID
3. System displays:
   - Status badge + school name
   - Financial summary (3 cards: Amount, %, Deadline)
   - Offer details grid (dates, conditions, notes)
   - Scholarship calculator
   - [Edit] [Delete] buttons
4. User can view all information
5. User can navigate back to list
```

### Alternative Flow: Edit Offer

```
1. User taps "Edit" button
2. System toggles to edit mode
3. Edit form displays with pre-filled data
4. User modifies fields
5. User taps "Save Changes"
6. System validates data
7. System updates offer in Supabase
8. System refreshes view
9. Edit mode toggles off
```

### Alternative Flow: Delete Offer

```
1. User taps "Delete" button
2. System shows confirmation alert
3. User confirms deletion
4. System deletes offer from Supabase
5. System navigates back to offers list
```

### Alternative Flow: Scholarship Calculator

```
1. User views calculator component
2. Calculator shows:
   - Current scholarship amount
   - Current scholarship percentage
   - Estimated total cost of attendance
   - Out-of-pocket estimate
3. User can adjust values to see what-if scenarios (optional)
```

### Error Scenarios

```
Error: Offer not found
- User sees: "Offer not found" message
- Action: "Return to Offers" button

Error: Fetch fails
- User sees: Error banner
- Action: Retry button

Error: Save fails
- User sees: Error message
- Action: Form stays open, user can retry
```

---

## 3. Data Models

### Primary Model: Offer

(See iOS_SPEC_Phase5_OffersList.md for full Offer model)

### Edit Form Data

```swift
struct OfferEditData {
  var offerType: OfferType
  var status: OfferStatus
  var scholarshipAmount: Double?
  var scholarshipPercentage: Int?
  var offerDate: Date
  var deadlineDate: Date?
  var conditions: String
  var notes: String

  init(from offer: Offer) {
    self.offerType = offer.offerType
    self.status = offer.status
    self.scholarshipAmount = offer.scholarshipAmount
    self.scholarshipPercentage = offer.scholarshipPercentage
    self.offerDate = offer.offerDate
    self.deadlineDate = offer.deadlineDate
    self.conditions = offer.conditions ?? ""
    self.notes = offer.notes ?? ""
  }
}
```

### Data Origin

- **Source:** Supabase `offers` table (by ID)
- **Refresh:** On page load, after update
- **Caching:** Single offer cached in memory while viewing
- **Mutations:** Update, Delete

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Offer by ID

```
GET /api/offers/:id

Response:
{
  "success": true,
  "data": { /* offer details */ }
}

Error Codes:
- 404: Offer not found
- 401: Not authenticated
- 403: No access to this offer
```

#### Endpoint 2: Update Offer

```
PATCH /api/offers/:id

Body:
{
  "offer_type": "partial",
  "status": "accepted",
  "scholarship_amount": 40000,
  "scholarship_percentage": 80,
  "deadline_date": "2026-03-15",
  "notes": "Updated notes"
}

Response:
{
  "success": true,
  "data": { /* updated offer */ }
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
@State var offer: Offer? = nil
@State var school: School? = nil
@State var isLoading = false
@State var error: String? = nil
@State var isEditing = false
@State var editData = OfferEditData()
@State var isUpdating = false
```

---

## 6. UI/UX Details

### Layout Structure

```
[Back Button]
  ← Back to Offers

[Offer Header]
  - Status Badge
  - School Name (large title)
  - Offer Type label

[Financial Summary Row]
  - 3 cards (Scholarship Amount, Scholarship %, Deadline)
  - Large values, color-coded

[Offer Details Section] (read-only mode)
  - Grid layout (2 columns on larger screens)
  - Offer Date
  - Deadline Date
  - Conditions (if present)
  - Notes (if present)

[Scholarship Calculator Component]
  - Shows breakdown
  - Interactive (optional)

[Edit Form] (edit mode)
  - All fields editable
  - [Save Changes] [Cancel] buttons

[Action Buttons]
  - [Edit] [Delete] (when not editing)
  - [Cancel] (when editing)

[Loading State]
  - Spinner

[Error State]
  - Error message + Retry button

[Not Found State]
  - Message + Return button
```

### Design System

- **Financial Cards:**
  - White background, prominent values
  - Large font size (32pt) for amounts
  - Color-coded deadline urgency

- **Edit Form:**
  - Same style as add offer form
  - Pre-filled with current values

- **Delete Button:**
  - Red color, secondary button style

### Interactive Elements

#### Buttons

- **Edit:** Blue, primary style
- **Delete:** Red, destructive style
- **Save Changes:** Blue, primary
- **Cancel:** Gray, secondary

#### Forms

- Date pickers for dates
- Dropdowns for type and status
- Number inputs for amount and percentage
- Multiline text for conditions and notes

#### Scholarship Calculator

- Read-only display or interactive component
- Shows breakdown of costs

### Loading States

- Full-page spinner during initial load
- Button loading state during update

### Accessibility

- VoiceOver announces all fields
- Deadline urgency conveyed via text and color
- 44pt touch targets

---

## 7. Dependencies

### Frameworks

- SwiftUI (iOS 15+)
- Supabase iOS Client

### Components

- ScholarshipCalculator (reusable component)

---

## 8. Error Handling & Edge Cases

- **Offer not found:** Show not found message
- **Network errors:** Show error banner with retry
- **Invalid data on save:** Show validation errors
- **No deadline:** Display "—" or "No deadline set"
- **Very long notes/conditions:** Scrollable or expandable
- **Deadline in past:** Show "Overdue" in red

---

## 9. Testing Checklist

### Happy Path

- [ ] Page loads offer correctly
- [ ] Financial summary displays correctly
- [ ] Edit mode toggles on/off
- [ ] Can save changes successfully
- [ ] Can delete offer with confirmation
- [ ] Scholarship calculator shows correct values
- [ ] Back navigation works

### Error Tests

- [ ] Offer not found shows appropriate message
- [ ] Network errors handled
- [ ] Invalid form data shows errors

### Edge Cases

- [ ] Offer with no deadline
- [ ] Offer with no conditions/notes
- [ ] Very long text fields
- [ ] Overdue deadline display

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Scholarship calculator:** Web has calculator component; iOS needs equivalent
- **School lookup:** Must fetch school details to display name

### iOS-Specific

- **Date picker UX:** Ensure good UX for date selection
- **Form validation:** Validate all fields before save
- **Navigation state:** Ensure proper back navigation after delete

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/offers/[id].vue`
- **Composables:** `useOffers`, `useSchools`
- **Components:** `ScholarshipCalculator`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Standard detail/edit page. Scholarship calculator component may need design review. Ensure form validation matches web implementation.
