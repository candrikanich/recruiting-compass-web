# iOS Page Specification: Analytics Dashboard

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Analytics Dashboard
**Web Route:** `/analytics/index`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** High (Multiple chart types + aggregations)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

The Analytics Dashboard provides comprehensive recruiting metrics and performance insights through various chart types (pie, funnel, scatter). It aggregates data across schools, interactions, offers, and performance to give users a holistic view of their recruiting journey.

### Key User Actions

- View summary statistics (total schools, interactions, offers, commitments)
- Analyze interaction types distribution (pie chart)
- Analyze sentiment breakdown (pie chart)
- View recruiting pipeline funnel (Initial Contact → Offers → Committed)
- Analyze school status distribution (pie chart)
- View performance correlation scatter plot
- Filter all data by date range
- Export analytics as CSV, Excel, or PDF

### Success Criteria

- All charts load and display correctly within 3 seconds
- Date range filtering updates all charts
- Export functionality generates valid files
- Charts are interactive (tap for details)
- Statistics show accurate aggregated data

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Analytics Dashboard
2. System fetches aggregated data for default date range (last 30 days)
3. System displays:
   - Summary stat cards (4 metrics)
   - Interaction Types pie chart
   - Sentiment Breakdown pie chart
   - Recruiting Pipeline funnel
   - School Status pie chart
   - Performance Correlation scatter plot
4. User can adjust date range to see different time periods
5. User can tap chart segments for drill-down (optional enhancement)
6. User can export data in multiple formats
```

### Alternative Flow: Date Range Change

```
1. User selects date range (Last 7/30/90 days, custom)
2. System re-fetches data for new range
3. All charts and stats update
```

### Alternative Flow: Export Analytics

```
1. User taps Export button
2. System shows format options (CSV, Excel, PDF)
3. User selects format
4. System generates report
5. System shows share sheet
```

### Error Scenarios

```
Error: No data available
- User sees: Empty state with message
- Action: Add schools/interactions to see analytics

Error: Fetch fails
- User sees: Error banner with retry
- Recovery: Pull-to-refresh or retry button
```

---

## 3. Data Models

### Summary Stats Model

```swift
struct AnalyticsSummary {
  let totalSchools: Int
  let totalInteractions: Int
  let totalOffers: Int
  let commitments: Int
  let trend: Trend?

  struct Trend {
    let percentage: Double  // e.g., 5.0 = +5%, -5.0 = -5%
    let label: String       // e.g., "vs last period"
  }
}
```

### Chart Data Models

```swift
struct PieChartData: Identifiable {
  let id = UUID()
  let label: String
  let value: Int
  let color: Color
}

struct FunnelStageData: Identifiable {
  let id = UUID()
  let label: String
  let value: Int
  let color: Color
}

struct ScatterDataPoint: Identifiable {
  let id = UUID()
  let x: Double
  let y: Double
  let label: String
  let color: Color
}
```

### Data Origin

- **Source:** Aggregated from multiple Supabase tables (schools, interactions, offers, performance_metrics)
- **Refresh:** On page load, on date range change
- **Caching:** In-memory only
- **Mutations:** Read-only (analytics view)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Analytics Summary

```
GET /api/analytics/summary?startDate=2026-01-10&endDate=2026-02-10

Response:
{
  "success": true,
  "data": {
    "totalSchools": 24,
    "totalInteractions": 87,
    "totalOffers": 15,
    "commitments": 3,
    "trends": {
      "schools": 5,
      "interactions": 12,
      "offers": -5
    }
  }
}
```

#### Endpoint 2: Fetch Interaction Analytics

```
GET /api/analytics/interactions?startDate=...&endDate=...

Response:
{
  "success": true,
  "data": {
    "byType": [
      { "label": "Email", "value": 34 },
      { "label": "Phone Call", "value": 28 },
      ...
    ],
    "bySentiment": [
      { "label": "Positive", "value": 52 },
      { "label": "Neutral", "value": 28 },
      ...
    ]
  }
}
```

#### Endpoint 3: Fetch Pipeline Data

```
GET /api/analytics/pipeline

Response:
{
  "success": true,
  "data": {
    "stages": [
      { "label": "Initial Contact", "value": 250 },
      { "label": "Active Discussions", "value": 85 },
      { "label": "Offers Extended", "value": 15 },
      { "label": "Committed", "value": 3 }
    ]
  }
}
```

#### Endpoint 4: Fetch School Analytics

```
GET /api/analytics/schools

Response:
{
  "success": true,
  "data": {
    "byStatus": [
      { "label": "Active Recruiting", "value": 18 },
      { "label": "On Wait List", "value": 4 },
      { "label": "Passed", "value": 2 }
    ]
  }
}
```

#### Endpoint 5: Fetch Performance Correlation

```
GET /api/analytics/performance/correlation

Response:
{
  "success": true,
  "data": {
    "datasets": [
      {
        "label": "Exit Velocity vs Distance",
        "points": [
          { "x": 85, "y": 340, "label": "Player A" },
          ...
        ]
      }
    ]
  }
}
```

### Authentication

(Same as other pages)

---

## 5. State Management

### Page-Level State

```swift
@State var summaryStats: AnalyticsSummary? = nil
@State var interactionTypesData: [PieChartData] = []
@State var sentimentData: [PieChartData] = []
@State var pipelineData: [FunnelStageData] = []
@State var schoolStatusData: [PieChartData] = []
@State var performanceData: [ScatterDataPoint] = []
@State var dateRange: DateRange = .last30Days
@State var isLoading = false
@State var error: String? = nil

enum DateRange {
  case last7Days
  case last30Days
  case last90Days
  case custom(start: Date, end: Date)
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Header]
  - Title: "Analytics Dashboard"
  - Subtitle: "Comprehensive recruiting metrics and performance insights"

[Date Range Toolbar]
  - Date range picker

[Summary Stats Row]
  - 4 cards in grid (2x2 on smaller screens, 4x1 on larger)
  - Each card shows: Icon, Value, Trend indicator

[Charts Grid - 2 columns on larger screens]
  - Interaction Types (pie)
  - Sentiment Breakdown (pie)
  - Recruiting Pipeline (funnel)
  - School Status (pie)

[Performance Correlation Section]
  - Full-width scatter plot
  - Title, axis labels, trend line

[Export Actions Section]
  - 3 export buttons (CSV, Excel, PDF)

[Loading State]
  - Skeleton screens

[Empty State]
  - Message: "No data to analyze yet"
  - Subtitle: "Start adding schools and logging interactions"
```

### Design System

- **Chart Colors:**
  - Primary: `#3b82f6` (blue)
  - Secondary: `#10b981` (green)
  - Tertiary: `#f59e0b` (amber)
  - Quaternary: `#ef4444` (red)
  - Additional: `#8b5cf6` (purple), `#ec4899` (pink)

- **Chart Heights:**
  - Pie charts: 300pt
  - Funnel chart: 350pt
  - Scatter plot: 400pt

### Interactive Elements

#### Charts

- **Pie Charts:** Tappable segments (optional drill-down)
- **Funnel Chart:** Tappable stages
- **Scatter Plot:** Interactive points (show label on tap)

#### Export Buttons

- CSV: Outlined button, gray
- Excel: Outlined button, gray
- PDF: Primary blue button

### Loading States

- Skeleton screens with chart placeholders
- Individual chart loading spinners

### Accessibility

- Charts have descriptive labels for VoiceOver
- Color contrast meets WCAG AA
- All interactive elements 44pt minimum

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client
- **Charts Framework:** Swift Charts or third-party
  - Requires: Pie charts, Funnel charts, Scatter plots

### Third-Party Libraries

- Chart library supporting pie, funnel, scatter plot types
- Export library for generating CSV/Excel/PDF (or custom implementation)

---

## 8. Error Handling & Edge Cases

- **No data:** Show empty state
- **Network errors:** Show error banner with retry
- **Missing data for specific chart:** Hide that chart or show "No data" placeholder
- **Very large datasets:** Consider pagination or aggregation

---

## 9. Testing Checklist

### Happy Path

- [ ] Page loads with all charts
- [ ] Summary stats display correctly
- [ ] Date range filtering works
- [ ] All chart types render correctly
- [ ] Export works (CSV, Excel, PDF)
- [ ] Charts are interactive

### Error Tests

- [ ] Handle no data gracefully
- [ ] Handle network errors
- [ ] Handle missing data for specific charts

### Edge Cases

- [ ] Only 1 data point for pie chart (100% single segment)
- [ ] Empty funnel stages
- [ ] Scatter plot with outliers

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Static/mock data:** Web implementation uses mock data; iOS will need real API integration
- **Chart interactivity:** Web has click handlers; iOS needs equivalent tap gestures

### iOS-Specific

- **Funnel chart:** Not natively supported by Swift Charts; may require custom implementation
- **Export functionality:** Generating Excel/PDF on iOS requires third-party library or custom code
- **Multiple chart types:** Ensure chart library supports all required types

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/analytics/index.vue`
- **Composables:** `usePerformanceAnalytics`
- **Components:** `DateRangeToolbar`, `StatCard`, `PieChart`, `FunnelChart`, `ScatterChart`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Analytics page requires robust charting library supporting multiple chart types. Verify library supports pie, funnel, and scatter plots before starting. Export functionality will require additional research/implementation.
