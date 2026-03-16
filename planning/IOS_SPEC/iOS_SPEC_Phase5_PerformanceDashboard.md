# iOS Page Specification: Performance Dashboard

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Performance Dashboard
**Web Route:** `/performance/index`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** High (Charts + complex data visualization)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

The Performance Dashboard is the central hub for athletes to log and track athletic performance metrics over time. It provides comprehensive charting, trend analysis, metric comparison, and historical tracking to help athletes and parents monitor progress and identify areas for improvement.

### Key User Actions

- View performance dashboard with charts and trends
- Log new performance metrics (velocity, exit velo, 60-time, pop time, batting avg, ERA, strikeouts)
- Toggle between different metric types to view specific charts
- View latest metrics summary cards for each metric type
- Edit existing metrics (value, date, unit, notes, verified status)
- Delete metrics
- Export metrics as CSV/PDF
- View metric trends (improving/declining/stable) with visual indicators

### Success Criteria

- User can log metrics and see them reflected in charts within 2 seconds
- Charts display correctly with smooth animations
- Metric trends calculate accurately (comparing first 3 vs last 3 records)
- Latest metrics display current values for each metric type
- Export functionality generates valid CSV/PDF files
- Edit/delete operations persist correctly

---

## 2. User Flows

### Primary Flow: View Performance Dashboard

```
1. User navigates to Performance Dashboard
2. System fetches all performance metrics for user
3. System displays:
   - Performance Dashboard component (if metrics exist)
   - Line chart for selected metric type
   - Metric trends section (improving/declining/stable)
   - Latest metrics summary cards
   - Metric history list (sorted newest first)
4. User can switch between metric types to view different charts
5. User can scroll to view full history
```

### Alternative Flow: Log New Metric

```
1. User taps "+ Log Metric" button
2. System shows metric form
3. User fills in:
   - Metric Type (dropdown: velocity, exit_velo, sixty_time, pop_time, batting_avg, era, strikeouts, other)
   - Value (number, step 0.01)
   - Date (date picker, defaults to today)
   - Unit (text, optional)
   - Notes (multiline text, optional)
   - Verified (checkbox, default unchecked)
4. User taps "Log Metric"
5. System validates required fields (metric_type, value, date)
6. System saves metric to Supabase
7. System refreshes metrics list
8. System shows success confirmation
9. Form collapses automatically
```

### Alternative Flow: Edit Existing Metric

```
1. User taps "Edit" button on a metric card
2. System opens edit modal with pre-filled data
3. User modifies any fields
4. User taps "Save Changes"
5. System validates and saves updates
6. System closes modal
7. System refreshes metrics list
```

### Alternative Flow: Delete Metric

```
1. User taps "Delete" button on a metric card
2. System shows confirmation alert
3. User confirms deletion
4. System deletes metric from Supabase
5. System removes metric from UI
6. Charts and trends recalculate automatically
```

### Alternative Flow: Export Metrics

```
1. User taps "Export" button
2. System shows export modal with options (CSV or PDF)
3. User selects format
4. System generates file
5. System shows share sheet for export/download
```

### Error Scenarios

```
Error: No metrics logged yet
- User sees: Empty state with message and CTA
- CTA: "Start tracking your performance to build a historical record"
- Action: Shows "+ Log Metric" button prominently

Error: Metric fetch fails
- User sees: Error banner with retry option
- Recovery: Pull-to-refresh or retry button

Error: Insufficient data for chart (< 2 records)
- User sees: Message "Not enough data to display chart (need at least 2 records)"
- Recovery: Log more metrics
```

---

## 3. Data Models

### Primary Model: PerformanceMetric

```swift
struct PerformanceMetric: Codable, Identifiable {
  let id: String
  let userId: String
  let metricType: MetricType
  let value: Double
  let unit: String
  let recordedDate: Date
  let eventId: String?
  let verified: Bool
  let notes: String?
  let createdAt: Date
  let updatedAt: Date

  // iOS-specific computed properties
  var displayName: String {
    metricType.displayName
  }

  var formattedValue: String {
    "\(String(format: "%.2f", value)) \(unit)"
  }

  var formattedDate: String {
    recordedDate.formatted(date: .abbreviated, time: .omitted)
  }
}

enum MetricType: String, Codable {
  case velocity = "velocity"
  case exitVelo = "exit_velo"
  case sixtyTime = "sixty_time"
  case popTime = "pop_time"
  case battingAvg = "batting_avg"
  case era = "era"
  case strikeouts = "strikeouts"
  case other = "other"

  var displayName: String {
    switch self {
    case .velocity: return "Fastball Velocity"
    case .exitVelo: return "Exit Velocity"
    case .sixtyTime: return "60-Yard Dash"
    case .popTime: return "Pop Time"
    case .battingAvg: return "Batting Average"
    case .era: return "ERA"
    case .strikeouts: return "Strikeouts"
    case .other: return "Other Metric"
    }
  }

  var isLowerBetter: Bool {
    // For metrics like 60-time, ERA, pop time, lower is better
    self == .sixtyTime || self == .popTime || self == .era
  }
}
```

### Supporting Model: MetricTrend

```swift
struct MetricTrend: Identifiable {
  let id = UUID()
  let type: MetricType
  let values: [Double]
  let min: Double
  let max: Double
  let average: Double
  let unit: String
  let count: Int
  let trend: TrendDirection

  enum TrendDirection {
    case improving
    case declining
    case stable
  }
}
```

### Data Origin

- **Source:** Supabase table `performance_metrics`
- **Refresh:** On page load, after create/update/delete
- **Caching:** In-memory cache (not persistent)
- **Mutations:** Create, Update, Delete available

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Metrics

```
GET /api/performance/metrics

Query Parameters:
- metricType: string (optional, filter by type)
- eventId: string (optional, filter by event)
- startDate: string (optional, ISO date)
- endDate: string (optional, ISO date)

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "metric_type": "velocity",
      "value": 85.5,
      "unit": "mph",
      "recorded_date": "2026-02-10",
      "event_id": null,
      "verified": false,
      "notes": "Indoor workout",
      "created_at": "2026-02-10T12:00:00Z",
      "updated_at": "2026-02-10T12:00:00Z"
    }
  ]
}

Error Codes:
- 401: Not authenticated
- 403: No access to metrics
- 500: Server error
```

#### Endpoint 2: Create Metric

```
POST /api/performance/metrics

Body:
{
  "metric_type": "velocity",
  "value": 85.5,
  "unit": "mph",
  "recorded_date": "2026-02-10",
  "event_id": null,
  "verified": false,
  "notes": "Indoor workout"
}

Response:
{
  "success": true,
  "data": { /* created metric */ }
}

Error Codes:
- 400: Invalid data (missing required fields)
- 401: Not authenticated
- 500: Server error
```

#### Endpoint 3: Update Metric

```
PATCH /api/performance/metrics/:id

Body:
{
  "value": 86.0,
  "notes": "Updated measurement"
}

Response:
{
  "success": true,
  "data": { /* updated metric */ }
}
```

#### Endpoint 4: Delete Metric

```
DELETE /api/performance/metrics/:id

Response:
{
  "success": true
}
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- **Refresh:** Automatic via Supabase iOS SDK
- **Logout:** Clear token from Keychain

---

## 5. State Management

### Page-Level State

```swift
@State var metrics: [PerformanceMetric] = []
@State var isLoading = false
@State var error: String? = nil
@State var showAddForm = false
@State var showEditForm = false
@State var showExportModal = false
@State var editingMetric: PerformanceMetric? = nil
@State var selectedMetricType: MetricType? = nil
```

### Persistence Across Navigation

- Metrics do NOT persist when navigating away (fresh fetch on return)
- Selected metric type filter clears on page exit
- Form state clears on page exit

### Shared State

- User auth state: Accessed from auth manager
- Family context: Parent preview mode (if viewing athlete's metrics)

---

## 6. UI/UX Details

### Layout Structure

```
[Sub-Navigation]
  - Performance Overview (active)
  - Timeline & Analytics (link to /performance/timeline)

[Header]
  - Title: "Performance Metrics"
  - Subtitle: "Track your athletic performance over time"
  - Actions: [Export Button] [+ Log Metric Button]

[Performance Dashboard Section] (if metrics > 0)
  - Charts, summary stats, trends

[Add Metric Form] (collapsible, shows when "+ Log Metric" tapped)
  - Form fields (2-column grid on larger screens)
  - Submit/Cancel buttons

[Performance Trends Chart]
  - Title: "Performance Trends"
  - Metric type filter buttons (if multiple types logged)
  - Line chart (requires 2+ records)
  - Empty state if insufficient data

[Metric Trends Section] (if metrics > 1)
  - Title: "Metric Trends"
  - Trend cards for each metric type
  - Shows: improving/declining/stable indicator, min/max/avg, bar chart

[Latest Metrics Summary]
  - 3-column grid of cards
  - Shows most recent value for each metric type logged
  - Verified badge if applicable

[Loading State]
  - Skeleton screens or spinner

[Empty State]
  - Message: "No metrics logged yet"
  - CTA: "+ Log Metric"

[Metric History List]
  - Title: "Metric History"
  - Cards sorted newest first
  - Each card shows: Type, Date, Value, Edit/Delete buttons, Notes (if present), Verified badge
```

### Design System References

- **Color Palette:**
  - Primary: `#3b82f6` (blue)
  - Success: `#10b981` (green)
  - Warning: `#f59e0b` (amber)
  - Danger: `#ef4444` (red)
  - Improving: `#10b981` (green)
  - Declining: `#ef4444` (red)
  - Stable: `#6b7280` (gray)

- **Typography:**
  - Page Title: SF Pro Display, 28pt, bold
  - Section Title: SF Pro Display, 20pt, semibold
  - Card Title: SF Pro Text, 16pt, semibold
  - Body: SF Pro Text, 14pt, regular
  - Caption: SF Pro Text, 12pt, regular

- **Spacing:** 16pt standard padding, 8pt gaps, 24pt section spacing
- **Radius:** 12pt for cards, 8pt for buttons
- **Chart Height:** 320pt for primary chart, 96pt for mini bar charts

### Interactive Elements

#### Buttons

- **Primary CTA (+ Log Metric):** Blue background, white text, 44pt min height
- **Export Button:** Outlined style, blue border/text, 44pt min height
- **Metric Type Filter:** Pill-style toggle buttons, selected state = filled blue
- **Edit/Delete:** Small buttons (32pt height), Edit = blue, Delete = red

#### Forms

- **Text Inputs:** Single-line, rounded corners, border on focus
- **Number Inputs:** Keyboard type = decimal pad, step = 0.01
- **Date Picker:** Native iOS date picker
- **Dropdown:** Native picker or menu for metric type selection
- **Checkbox:** Native toggle for "Verified" status
- **Validation:** Real-time for required fields, error text below inputs

#### Charts

- **Line Chart:** Smooth curves, blue line, fill gradient, interactive points
- **Bar Chart (trends):** Mini bars, blue fill, hover shows value
- **Metric Type Toggle:** Horizontal scroll if > 4 types

#### Modals

- **Edit Metric Modal:** Full-screen or large sheet, dismiss via X or Cancel button
- **Export Modal:** Bottom sheet with format options (CSV, PDF)
- **Delete Confirmation:** Standard iOS alert with Confirm/Cancel

### Loading States

```
First Load:
- Full-page skeleton with placeholder cards
- 500ms delay before showing skeleton

Reload:
- Pull-to-refresh gesture
- Subtle spinner in navigation bar

Empty State:
- Icon: Chart icon (SF Symbols)
- Message: "No metrics logged yet"
- Subtitle: "Start tracking your performance to build a historical record"
- CTA: "+ Log Metric" button

Error State:
- Error icon
- Clear error message (e.g., "Failed to load metrics")
- Retry button
- Pull-to-refresh still available
```

### Accessibility

- **VoiceOver:** All interactive elements have descriptive labels
  - Chart: "Performance chart for [metric type], showing [count] data points"
  - Metric card: "[Metric type], [value] [unit], recorded [date]"
  - Trend indicator: "[Metric type] is [improving/declining/stable]"
- **Color Contrast:** WCAG AA minimum
- **Touch Targets:** 44pt minimum (iOS standard)
- **Dynamic Type:** Supports text size scaling
- **Reduced Motion:** Disable chart animations if user prefers reduced motion

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (for auth + data)
- **Charts Framework:** Swift Charts (iOS 16+) or third-party (e.g., SwiftUICharts)

### Third-Party Libraries

- **Charts:** Swift Charts (native, recommended) or Charts library
  - Provides: Line charts, bar charts, interactive data visualization
  - Alternative: Custom chart implementation using Canvas

### External Services

- Supabase PostgreSQL (`performance_metrics` table)
- Supabase Auth (login/session)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry button
- **No internet:** Show offline indicator + queue for sync (optional enhancement)
- **Server error (5xx):** Show "Server error, please try again" + retry

### Data Errors

- **Empty list:** Show appropriate empty state with CTA
- **Invalid metric data:** Skip/filter and log error
- **Missing required field:** Show inline validation error before submit
- **Stale data:** Automatic refresh on interval (optional)

### User Errors

- **Form validation:** Show inline error messages
  - Missing metric type: "Please select a metric type"
  - Missing value: "Please enter a value"
  - Missing date: "Please select a date"
- **Duplicate entry:** Allow (no restriction on duplicates)
- **Delete confirmation:** Standard iOS alert prevents accidental deletion

### Edge Cases

- **Very long notes:** Truncate with "Read more" or expand
- **Large metric values:** Format with thousands separator (85,000)
- **Very small values:** Display with appropriate precision (0.001)
- **No unit provided:** Display value only
- **Only 1 metric logged:** Show value card, hide chart (needs 2+ for chart)
- **Trend calculation with < 2 records:** Don't show trend section
- **Chart with > 50 data points:** Consider pagination or filtering by date range
- **Offline then online:** Sync queued changes (optional enhancement)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays metrics correctly
- [ ] User can log new metric and see it in list immediately
- [ ] User can edit metric and changes persist
- [ ] User can delete metric with confirmation
- [ ] Charts display correctly for each metric type
- [ ] Metric trends calculate accurately
- [ ] Latest metrics summary shows correct current values
- [ ] Export functionality works (CSV/PDF generation)

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show permission message)
- [ ] Handle empty metric list (show empty state)
- [ ] Handle server errors (5xx)
- [ ] Handle form validation errors (missing required fields)

### Edge Case Tests

- [ ] Only 1 metric logged (chart hidden, card shown)
- [ ] Very long notes don't break layout
- [ ] Large values display correctly
- [ ] Metric type with no data doesn't break chart filter
- [ ] Rapid taps on submit don't create duplicates
- [ ] VoiceOver works on all elements
- [ ] Page adapts to different device sizes (SE, 13, 15 Pro Max)

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] List scrolling is smooth (60 fps) with 100+ metrics
- [ ] Chart rendering is smooth with 50+ data points
- [ ] No memory leaks when navigating away
- [ ] Images/charts load without blocking UI

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Chart library dependency:** Web uses Chart.js; iOS will need native Charts or third-party library
- **Export functionality:** Web generates files client-side; iOS will need similar capability
- **Trend calculation:** Uses first 3 vs last 3 comparison; ensure iOS matches this logic
- **Lower is better logic:** Some metrics (60-time, ERA, pop time) are better when lower; iOS must handle this correctly

### iOS-Specific Considerations

- **Charts on iOS 15:** Swift Charts requires iOS 16+; for iOS 15 support, use third-party library or custom implementation
- **Date picker UX:** iOS date picker behavior differs from web; ensure good UX
- **Form keyboard:** Dismiss keyboard appropriately when tapping outside form
- **Large datasets:** Consider pagination or date filtering if user has 100+ metrics
- **Memory pressure:** iOS may reload view when backgrounded; handle state restoration

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/performance/index.vue`
- **Composables used:** `usePerformance`
- **Components:** `PerformanceDashboard`, `ExportButton`, `ExportModal`
- **Chart library:** Chart.js (vue-chartjs)

### Design References

- **Figma:** [Link to design if available]
- **Brand Guidelines:** [Link if exists]

### API Documentation

- **Swagger/Spec:** [If available]
- **Database Schema:** `performance_metrics` table in Supabase

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** This is a complex page requiring a robust charting library. Recommend using Swift Charts (iOS 16+) or evaluating third-party options for iOS 15 support. Trend calculation logic is critical—ensure parity with web implementation.

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- Dashboard charts (if analytics implemented)
- Any other charting/visualization pages

### Code Snippets from Web

**Metric Trend Calculation (TypeScript):**

```typescript
// Determine trend (comparing first 3 to last 3)
const first3 = values.slice(0, 3);
const last3 = values.slice(-3);
const firstAvg = first3.reduce((a, b) => a + b, 0) / first3.length;
const lastAvg = last3.reduce((a, b) => a + b, 0) / last3.length;

// For metrics like 60-time, ERA, lower is better
const lowerIsBetter = ["sixty_time", "pop_time", "era"].includes(type);
let trend: "improving" | "declining" | "stable";

if (lowerIsBetter) {
  if (lastAvg < firstAvg * 0.99) trend = "improving";
  else if (lastAvg > firstAvg * 1.01) trend = "declining";
  else trend = "stable";
} else {
  if (lastAvg > firstAvg * 1.01) trend = "improving";
  else if (lastAvg < firstAvg * 0.99) trend = "declining";
  else trend = "stable";
}
```

**iOS implementation should match this logic exactly.**
