# iOS Page Specification: Performance Timeline & Analytics

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Performance Timeline & Analytics
**Web Route:** `/performance/timeline`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** High (Multiple charts + filtering)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

The Performance Timeline provides advanced analytics and visualization of athletic metrics over time. It features date range filtering, categorized charts (power, speed, hitting, pitching), and a radar chart snapshot of current performance across all metric types.

### Key User Actions

- Select date range preset (last 30 days, 3 months, 6 months, 12 months, all time, custom)
- Toggle "Verified Only" filter to show only third-party verified metrics
- View categorized performance charts (Power, Speed, Hitting, Pitching)
- View radar chart showing current performance snapshot across all metrics
- Export timeline data as CSV or JSON
- Navigate between Performance Overview and Timeline tabs

### Success Criteria

- Date range filtering updates charts immediately
- Verified-only filter works correctly
- All chart categories display appropriate metrics
- Radar chart shows normalized performance scores
- Export generates valid CSV/JSON files
- Tab navigation persists user's selected filters

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Performance Timeline
2. System calculates default date range (last 3 months)
3. System fetches metrics and events for date range
4. System displays categorized charts:
   - Power Metrics (velocity, exit_velo)
   - Speed Metrics (sixty_time, pop_time)
   - Hitting Metrics (batting_avg)
   - Pitching Metrics (era, strikeouts)
5. System displays radar chart with latest values
6. User can adjust filters and view updated visualizations
```

### Alternative Flow: Date Range Selection

```
1. User taps date range dropdown
2. System shows preset options
3. User selects preset (e.g., "Last 6 Months")
4. System calculates start/end dates
5. System re-fetches metrics for new range
6. Charts update with filtered data
```

### Alternative Flow: Custom Date Range

```
1. User selects "Custom" from date range dropdown
2. System shows start/end date pickers
3. User selects custom dates
4. System validates (end >= start)
5. System fetches metrics for custom range
6. Charts update
```

### Alternative Flow: Verified Only Filter

```
1. User toggles "Verified Only" switch
2. System filters metrics to show only verified=true
3. Charts recalculate with filtered dataset
4. If no verified metrics, show appropriate message
```

### Alternative Flow: Export Timeline Data

```
1. User taps export button
2. System shows format options (CSV, JSON)
3. User selects format
4. System generates file with filtered metrics
5. System shows share sheet
```

### Error Scenarios

```
Error: No metrics in date range
- User sees: "No metrics found for selected date range"
- Action: Adjust date range or add metrics

Error: Fetch fails
- User sees: Error banner with retry
- Recovery: Pull-to-refresh or retry button

Error: Invalid date range (end < start)
- User sees: Validation error
- Recovery: Adjust dates
```

---

## 3. Data Models

### Primary Model: PerformanceMetric

(Same as Performance Dashboard - see iOS_SPEC_Phase5_PerformanceDashboard.md)

### Supporting Model: RadarChartData

```swift
struct RadarChartData: Identifiable {
  let id = UUID()
  let metricType: MetricType
  let normalizedValue: Double  // 0-100 scale
  let actualValue: Double
  let unit: String

  // Computed
  var displayLabel: String {
    metricType.displayName
  }
}
```

### Data Origin

- **Source:** Supabase `performance_metrics` table
- **Refresh:** On page load, on date range change, after metric create/update/delete
- **Caching:** In-memory only
- **Mutations:** Read-only (metrics managed via Performance Dashboard)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Metrics with Date Filter

```
GET /api/performance/metrics?startDate=2025-11-01&endDate=2026-02-10

Response:
{
  "success": true,
  "data": [ /* array of metrics */ ]
}
```

#### Endpoint 2: Fetch Events (for timeline context)

```
GET /api/events

Response:
{
  "success": true,
  "data": [ /* array of events */ ]
}
```

### Authentication

(Same as Performance Dashboard)

---

## 5. State Management

### Page-Level State

```swift
@State var metrics: [PerformanceMetric] = []
@State var events: [Event] = []
@State var isLoading = false
@State var error: String? = nil
@State var dateRangePreset: DateRangePreset = .last3Months
@State var customStartDate: Date? = nil
@State var customEndDate: Date? = nil
@State var verifiedOnly = false
@State var showExportModal = false

enum DateRangePreset: String, CaseIterable {
  case last30Days = "last_30_days"
  case last3Months = "last_3_months"
  case last6Months = "last_6_months"
  case last12Months = "last_12_months"
  case allTime = "all_time"
  case custom = "custom"

  var displayName: String {
    switch self {
    case .last30Days: return "Last 30 Days"
    case .last3Months: return "Last 3 Months"
    case .last6Months: return "Last 6 Months"
    case .last12Months: return "Last 12 Months"
    case .allTime: return "All Time"
    case .custom: return "Custom Range"
    }
  }
}
```

### Persistence

- Date range preset persists via UserDefaults (optional enhancement)
- Verified filter clears on page exit

---

## 6. UI/UX Details

### Layout Structure

```
[Sub-Navigation]
  - Performance Overview (link to /performance/index)
  - Timeline & Analytics (active)

[Header]
  - Title: "Performance Timeline & Analytics"
  - Subtitle: "Track your progress over time and compare metrics across events"

[Filters Bar]
  - Date Range Picker (dropdown)
  - Verified Only Toggle

[Charts Section]
  - Power Metrics Chart (velocity, exit_velo)
  - Speed Metrics Chart (sixty_time, pop_time)
  - Hitting Metrics Chart (batting_avg)  |  Pitching Metrics Chart (era, strikeouts)
    ^^ 2-column grid on larger screens
  - Radar Chart (current performance snapshot)

[Export Section]
  - Export buttons (CSV, JSON)

[Loading State]
  - Skeleton screens

[Empty State]
  - Message + CTA to log metrics
```

### Design System

(Same color palette and typography as Performance Dashboard)

### Interactive Elements

#### Date Range Picker

- Picker/Menu style with presets
- Custom range shows date pickers

#### Charts

- **Line Charts:** Blue lines, smooth curves, interactive points
- **Radar Chart:** Polygon shape, blue fill with transparency, axis labels for each metric
- **Chart Height:** 350pt for main charts, 400pt for radar

#### Export Modal

- Bottom sheet with format options
- CSV/JSON buttons

### Loading States

(Similar to Performance Dashboard)

### Accessibility

(Same standards as Performance Dashboard)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client
- **Charts Framework:** Swift Charts (iOS 16+) or third-party
  - Must support: Line charts, Radar chart

### Third-Party Libraries

- **Charts library** that includes Radar/Spider charts
  - Swift Charts may require custom implementation for radar chart
  - Alternative: SwiftUICharts or custom Canvas implementation

---

## 8. Error Handling & Edge Cases

(Similar to Performance Dashboard, plus:)

- **No verified metrics:** Show message "No verified metrics available" when verified filter is on
- **Date range too large:** Consider limiting to prevent performance issues (e.g., max 2 years)
- **Missing metric types:** Radar chart shows only available metrics (partial polygon)

---

## 9. Testing Checklist

### Happy Path

- [ ] Page loads with default 3-month range
- [ ] Date range presets work correctly
- [ ] Custom date range works
- [ ] Verified filter works
- [ ] All chart categories display correctly
- [ ] Radar chart shows normalized values
- [ ] Export works (CSV, JSON)

### Error Tests

- [ ] No metrics in range shows appropriate message
- [ ] Network errors handled
- [ ] Invalid date range (end < start) shows validation

### Edge Cases

- [ ] Only 1 metric type (charts show partial data)
- [ ] No verified metrics (filter shows empty state)
- [ ] Very large date range (performance acceptable)
- [ ] Radar chart with missing metric types

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Chart.js radar chart:** Web uses Chart.js; iOS needs equivalent
- **Metric normalization:** Radar chart normalizes values to 0-100 scale; ensure iOS matches algorithm
- **Date presets:** Calculate date ranges consistently with web

### iOS-Specific

- **Radar chart implementation:** Swift Charts may not support radar/spider charts natively; custom implementation may be needed
- **Multiple charts on one screen:** Monitor memory usage and performance

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/performance/timeline.vue`
- **Composables:** `usePerformance`, `useEvents`
- **Components:** `TimelineFilters`, `PerformanceChart`, `PerformanceRadarChart`, `ExportModal`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Radar chart implementation will be the primary technical challenge. Evaluate chart library support before starting implementation.
