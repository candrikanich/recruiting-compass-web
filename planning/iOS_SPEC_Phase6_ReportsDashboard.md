# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Reports Dashboard
**Web Route:** `/reports`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Allows users to generate comprehensive recruiting reports for specific date ranges, view aggregated statistics across schools, coaches, interactions, and performance metrics, and export data in CSV format. This provides analytics and insights into recruiting progress and effectiveness.

### Key User Actions

- Select date range via quick presets or custom dates (from/to)
- Generate report for selected date range
- View report summary with statistics cards:
  - Total Schools (with breakdown by status and division)
  - Total Coaches (with average response rate)
  - Total Interactions (with breakdown by type and sentiment)
  - Total Metrics (with summaries: avg/max/min)
- View "Schools by Status" breakdown
- Export report data to CSV file
- Share exported report via iOS share sheet

### Success Criteria

- User can select date range easily via presets
- Report generates quickly (<2 seconds for typical dataset)
- Statistics cards display accurate counts and percentages
- Schools by Status breakdown shows all status categories
- CSV export generates valid file with all data
- User can share exported CSV via native iOS share sheet
- Error messages are clear and actionable

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Reports Dashboard
2. System pre-selects "Last 30 days" date range (default)
3. User sees date range selection UI:
   - Quick preset buttons (Last 7/30/90 days, etc.)
   - Custom date pickers (From/To)
4. User taps "Generate Report" button
5. System shows loading indicator
6. System aggregates data from all sources (schools, coaches, interactions, metrics)
7. System displays Report Summary card with statistics
8. User scrolls to view:
   - Stats grid (4-6 cards)
   - Schools by Status breakdown
9. User taps "Export CSV" button
10. System generates CSV file
11. System presents iOS share sheet
12. User selects destination (Files, Mail, AirDrop, etc.)
13. System saves/shares CSV file
```

### Alternative Flows

```
Flow B: Apply Quick Preset
1. User taps preset button (e.g., "Last 90 days")
2. System calculates date range
3. System updates From/To date fields
4. User sees updated date range

Flow C: Custom Date Range
1. User taps "From" date field
2. System shows date picker
3. User selects start date
4. User taps "To" date field
5. System shows date picker
6. User selects end date
7. User taps "Generate Report"

Flow D: Clear Report
1. User changes date range
2. System clears current report display
3. User generates new report
```

### Error Scenarios

```
Error: No data in date range
- User sees: Alert "No data found for selected date range"
- Recovery: Try different date range

Error: Invalid date range (To before From)
- User sees: Inline validation "End date must be after start date"
- Recovery: Adjust dates

Error: Report generation failed
- User sees: Alert "Failed to generate report. Please try again."
- Recovery: Retry button or change filters

Error: Export failed
- User sees: Alert "Failed to export CSV. Please try again."
- Recovery: Retry export
```

---

## 3. Data Models

### Primary Model

```swift
struct ReportData: Codable {
  let title: String
  let dateRange: DateRange
  let schools: SchoolReport?
  let coaches: CoachReport?
  let interactions: InteractionReport?
  let metrics: MetricsReport?

  struct DateRange: Codable {
    let from: String // ISO 8601
    let to: String // ISO 8601

    var displayRange: String {
      let formatter = DateFormatter()
      formatter.dateStyle = .medium
      guard let fromDate = Date(iso8601String: from),
            let toDate = Date(iso8601String: to) else {
        return "Invalid range"
      }
      return "\(formatter.string(from: fromDate)) - \(formatter.string(from: toDate))"
    }
  }

  struct SchoolReport: Codable {
    let total: Int
    let byStatus: [String: Int]
    let byDivision: [String: Int]
  }

  struct CoachReport: Codable {
    let total: Int
    let avgResponseRate: Double
    let bySchool: Int
  }

  struct InteractionReport: Codable {
    let total: Int
    let byType: [String: Int]
    let bySentiment: [String: Int]
  }

  struct MetricsReport: Codable {
    let total: Int
    let byType: [String: Int]
    let summaries: [MetricSummary]

    struct MetricSummary: Codable {
      let type: String
      let avg: Double
      let max: Double
      let min: Double
    }
  }
}

enum DatePreset: String, CaseIterable {
  case last7Days = "Last 7 days"
  case last30Days = "Last 30 days"
  case last90Days = "Last 90 days"
  case last6Months = "Last 6 months"
  case yearToDate = "Year to date"
  case lastYear = "Last year"

  var days: Int {
    switch self {
    case .last7Days: return 7
    case .last30Days: return 30
    case .last90Days: return 90
    case .last6Months: return 180
    case .yearToDate: return 999 // Special handling
    case .lastYear: return 365
    }
  }

  func calculateRange() -> (from: Date, to: Date) {
    let today = Date()
    switch self {
    case .yearToDate:
      let calendar = Calendar.current
      let startOfYear = calendar.date(from: calendar.dateComponents([.year], from: today))!
      return (startOfYear, today)
    default:
      let daysAgo = Calendar.current.date(byAdding: .day, value: -days, to: today)!
      return (daysAgo, today)
    }
  }
}
```

### Related Models

- `School` (for aggregation)
- `Coach` (for aggregation)
- `Interaction` (for aggregation)
- `PerformanceMetric` (for aggregation)

### Data Origin

- **Source:** Client-side aggregation of existing data (schools, coaches, interactions, metrics)
- **Refresh:** On-demand (when user generates report)
- **Caching:** None (reports are generated fresh each time)
- **Mutations:** None (read-only, generates CSV export)

---

## 4. API Integration

### Endpoints Used

**Note:** This page uses **client-side data aggregation** - no dedicated API endpoint. Data is pulled from existing composables and aggregated locally.

#### Data Sources

```swift
// Fetch all required data sources
let schools = try await supabase
  .from("schools")
  .select("*")
  .eq("user_id", userId)
  .execute()

let coaches = try await supabase
  .from("coaches")
  .select("*")
  .eq("user_id", userId)
  .execute()

let interactions = try await supabase
  .from("interactions")
  .select("*")
  .eq("user_id", userId)
  .gte("occurred_at", fromDate)
  .lte("occurred_at", toDate)
  .execute()

let metrics = try await supabase
  .from("performance_metrics")
  .select("*")
  .eq("athlete_id", athleteId)
  .gte("created_at", fromDate)
  .lte("created_at", toDate)
  .execute()
```

#### Aggregation Logic

```swift
func generateReport(
  schools: [School],
  coaches: [Coach],
  interactions: [Interaction],
  metrics: [PerformanceMetric],
  from: Date,
  to: Date
) -> ReportData {
  // Schools aggregation
  let schoolReport = SchoolReport(
    total: schools.count,
    byStatus: schools.reduce(into: [:]) { counts, school in
      counts[school.status, default: 0] += 1
    },
    byDivision: schools.reduce(into: [:]) { counts, school in
      counts[school.division, default: 0] += 1
    }
  )

  // Coaches aggregation
  let totalResponses = interactions.filter { $0.initiatedBy == "coach" }.count
  let avgResponseRate = coaches.isEmpty ? 0 : Double(totalResponses) / Double(coaches.count) * 100
  let coachReport = CoachReport(
    total: coaches.count,
    avgResponseRate: avgResponseRate,
    bySchool: Set(coaches.compactMap { $0.schoolId }).count
  )

  // Interactions aggregation
  let interactionReport = InteractionReport(
    total: interactions.count,
    byType: interactions.reduce(into: [:]) { counts, interaction in
      counts[interaction.type, default: 0] += 1
    },
    bySentiment: interactions.reduce(into: [:]) { counts, interaction in
      counts[interaction.sentiment ?? "neutral", default: 0] += 1
    }
  )

  // Metrics aggregation
  let metricsByType = Dictionary(grouping: metrics) { $0.type }
  let summaries = metricsByType.map { type, metrics in
    let values = metrics.compactMap { $0.value }
    return MetricSummary(
      type: type,
      avg: values.reduce(0, +) / Double(values.count),
      max: values.max() ?? 0,
      min: values.min() ?? 0
    )
  }
  let metricsReport = MetricsReport(
    total: metrics.count,
    byType: metricsByType.mapValues { $0.count },
    summaries: summaries
  )

  return ReportData(
    title: "Recruiting Report",
    dateRange: DateRange(from: from.iso8601, to: to.iso8601),
    schools: schoolReport,
    coaches: coachReport,
    interactions: interactionReport,
    metrics: metricsReport
  )
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
@Published var currentReport: ReportData? = nil
@Published var isGenerating = false
@Published var error: String? = nil

// Date selection
@Published var fromDate = Date()
@Published var toDate = Date()

// Data sources (loaded on page load)
@Published var schools: [School] = []
@Published var coaches: [Coach] = []
@Published var interactions: [Interaction] = []
@Published var metrics: [PerformanceMetric] = []
```

### Persistence Across Navigation

- **Date range selection** does not persist (resets to default on page re-entry)
- **Current report** does not persist (cleared on page exit)

### Shared State (if cross-page)

- **Family context:** Active user/athlete via `useActiveFamily` composable
- **Auth state:** Accessed from Supabase session manager

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Title: "Reports & Analytics"
    - Subtitle: "Generate comprehensive reports and export recruiting data"

  [ScrollView]
    [Generate Report Card - White Background]
      - Header: "Generate Report"
      - Quick Presets (6 buttons):
        * Last 7 days
        * Last 30 days
        * Last 90 days
        * Last 6 months
        * Year to date
        * Last year
      - Date Range:
        * From (date picker)
        * To (date picker)
      - Generate Button (blue, full-width, disabled until dates valid)
      - Error message (if present)

    [Report Summary Card - White Background, shown after generation]
      - Header: "Report Summary" + Export CSV button
      - Stats Grid (2×3 grid on iPhone, 3×2 on iPad):
        * Schools (blue icon)
        * Coaches (purple icon)
        * Interactions (green icon)
        * Metrics (amber icon)
        * Response Rate (indigo icon)
      - Schools by Status (expandable list):
        * Status name: Count
        * (e.g., "Interested: 15")

  [Sidebar Info Cards - Optional, can be sheets on iPhone]
    [Report Includes Card - Blue Background]
      - List of what's included in report
    [Export Options Card - White Background]
      - Description of export formats
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Success: `#00CC66` (green)
  - Purple: `#9333EA`
  - Amber: `#FF6B00`
  - Indigo: `#4F46E5`
  - Gray backgrounds: `#F9FAFB`

- **Typography:**
  - Title: SF Pro Display, 28pt, semibold
  - Subtitle: SF Pro Text, 16pt, regular, gray
  - Card header: SF Pro Text, 18pt, semibold
  - Stat value: SF Pro Display, 32pt, bold
  - Stat label: SF Pro Text, 14pt, regular

- **Spacing:** 16pt padding inside cards, 12pt gaps between cards
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Date Preset Buttons

- **Layout:** 3×2 grid on iPhone, 2×3 on iPad
- **Style:** White background, gray border, rounded corners
- **Size:** Equal width, 44pt height minimum
- **Tap:** Apply preset date range, update From/To fields
- **Active state:** Blue border, blue text

#### Date Pickers

- **From Field:**
  - Label: "From"
  - Style: Standard iOS date picker field
  - Tap: Present date picker sheet

- **To Field:**
  - Label: "To"
  - Style: Standard iOS date picker field
  - Tap: Present date picker sheet
  - Validation: Must be >= From date

#### Generate Button

- **Style:** Blue gradient fill, white text, full-width
- **Size:** 44pt height minimum
- **Icon:** ChartBar SF Symbol (left side)
- **Tap:** Generate report
- **Disabled:** If From/To dates invalid or generating
- **Loading:** Spinner + "Generating..." text

#### Statistics Cards

- **Layout:** 2×3 grid (iPhone), 3×2 grid (iPad)
- **Size:** Equal width, 80pt height
- **Content:**
  - Icon (colored background circle, 40pt)
  - Value (large, bold, colored)
  - Label (small, gray)
- **Tap:** None (informational only)
- **Colors:**
  - Schools: Blue
  - Coaches: Purple
  - Interactions: Green
  - Metrics: Amber
  - Response Rate: Indigo

#### Schools by Status List

- **Row Layout:**
  - Left: Status name (capitalized)
  - Right: Count (bold)
- **Style:** Light gray background, rounded corners
- **Tap:** No action (informational only)

#### Export CSV Button

- **Style:** Green fill, white text
- **Size:** Compact, top-right of Report Summary card
- **Icon:** ArrowDown SF Symbol (left side)
- **Tap:** Generate CSV and present share sheet

### Loading States

```
First Load (Data Sources):
- Skeleton for Generate Report card
- 300ms delay before showing skeleton

Generating Report:
- Spinner in Generate button
- Button text changes to "Generating..."
- Button disabled

Report Display:
- Fade-in animation for Report Summary card
- Stats cards appear with staggered animation (50ms delay each)

Export CSV:
- Activity indicator on Export button
- Button text changes to "Exporting..."

Empty State (No Data):
- Alert: "No data found for selected date range. Try a different range."

Error State:
- Red banner above Generate button
- Clear error message
```

### Accessibility

- **VoiceOver:**
  - Preset buttons: "Last 30 days preset"
  - Date pickers: "From date: [date]", "To date: [date]"
  - Generate button: "Generate report for selected date range"
  - Stat cards: "Schools: 25. Tap for details."
  - Export button: "Export report to CSV file"
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Support text size scaling (all text elements)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (for auth + data)
- Foundation (for date calculations, CSV generation)

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase PostgreSQL (`schools`, `coaches`, `interactions`, `performance_metrics` tables)
- Supabase Auth (session management)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out. Check your connection." + retry
- **No internet:** Show offline mode indicator, disable report generation
- **Server error (5xx):** Show "Server error. Unable to load data." + retry

### Data Errors

- **Empty data set:** Show alert "No data available for selected date range"
- **Invalid aggregation:** Log error, show partial results with warning
- **Missing required data:** Skip that section, show others

### User Errors

- **Invalid date range (To before From):** Show inline validation error "End date must be after start date"
- **Missing dates:** Disable Generate button
- **Export with no report:** Show alert "Generate a report first before exporting"

### Edge Cases

- **Very large date ranges (10+ years):** Warn user "Large date range may take longer to generate"
- **Zero results:** Show "No data found" message instead of report card
- **Null/undefined fields:** Handle gracefully (default to 0 or "N/A")
- **Division calculations:** Avoid divide-by-zero (check denominator > 0)
- **CSV special characters:** Escape commas, quotes in CSV export
- **Very long school names:** Truncate in breakdown list (with ellipsis)
- **Status with no schools:** Don't display in breakdown (skip empty categories)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays generate report form
- [ ] User can tap preset button to apply date range
- [ ] User can select custom From/To dates
- [ ] Generate button is disabled until dates are valid
- [ ] Report generates and displays statistics correctly
- [ ] All stat cards show accurate counts
- [ ] Schools by Status breakdown displays correctly
- [ ] User can export report to CSV
- [ ] CSV file contains correct data
- [ ] Share sheet presents with CSV file

### Error Tests

- [ ] Handle network timeout during data load (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle invalid date range (show validation error)
- [ ] Handle empty data set (show alert)
- [ ] Handle export failure (show alert with retry)
- [ ] Handle server errors (5xx) (show retry)

### Edge Case Tests

- [ ] Very large date range (10+ years) handles correctly
- [ ] Zero results shows appropriate message
- [ ] Division by zero is handled (no crashes)
- [ ] CSV with special characters exports correctly
- [ ] Very long school names truncate properly
- [ ] VoiceOver reads all elements correctly
- [ ] Dynamic Type scales text appropriately
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Report generates in <2 seconds (for 100 records)
- [ ] CSV export completes in <1 second
- [ ] No memory leaks when navigating away
- [ ] Stats cards animate smoothly
- [ ] Large datasets (1000+ records) handle efficiently

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Client-side aggregation:** No server-side report generation API (all aggregation happens in client)
- **CSV only:** PDF export mentioned in UI but not implemented (Phase 5 feature)
- **No historical reports:** Reports are generated on-demand, not saved
- **No charts:** Web shows stats cards only (no graphs/charts yet)

### iOS-Specific Considerations

- **Memory usage:** Large datasets (10k+ records) may cause memory pressure on older devices
- **CSV generation:** Foundation's CSV encoding is basic (consider third-party library for complex exports)
- **Date calculations:** Time zone handling must be consistent (use UTC for date ranges)
- **Share sheet:** iOS share sheet replaces web download flow (better UX for mobile)
- **Background processing:** Report generation blocks UI (consider background thread for large datasets)
- **Export formats:** iOS supports CSV natively, but PDF export requires additional work (UIGraphicsPDFRenderer)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/reports/index.vue`
- **Composables used:**
  - `useReports` (generateReport, exportToCSV)
  - `useSchools` (data source)
  - `useCoaches` (data source)
  - `useInteractions` (data source)
  - `usePerformance` (data source)
- **Utilities:**
  - `utils/reportExport.ts` (generateReportData, exportReportToCSV, downloadReport)
- **API endpoints:** None (client-side aggregation)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Date Formatting:** ISO 8601 standard

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Consider using Charts framework (iOS 16+) for visualizing stats (line charts, bar charts)
- Implement background thread for report generation if dataset is large (>1000 records)
- CSV export could be enhanced with more columns (detailed breakdowns)
- PDF export is mentioned in web UI but not implemented (consider for Phase 7)
- Add pull-to-refresh to reload data sources if stale

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Performance Dashboard** (if exists) - Similar stats card grid layout
- **Analytics Page** (if exists) - Similar aggregation patterns

### Code Snippets from Web

```typescript
// Generate report (from useReports composable)
const generateReport = async (from: string, to: string) => {
  isGenerating.value = true;
  error.value = null;

  try {
    currentReport.value = generateReportData(
      schools.value,
      coaches.value,
      interactions.value,
      metrics.value,
      from,
      to,
    );
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to generate report";
  } finally {
    isGenerating.value = false;
  }
};

// Apply date preset
const applyPreset = (preset: { label: string; days: number }) => {
  const today = new Date();
  const daysAgo = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);

  fromDate.value = daysAgo.toISOString().split("T")[0];
  toDate.value = today.toISOString().split("T")[0];
};

// Export to CSV
const exportToCSV = (filename = "recruiting-report.csv") => {
  if (!currentReport.value) {
    error.value = "No report to export";
    return;
  }

  try {
    const csv = exportReportToCSV(currentReport.value);
    downloadReport(filename, csv);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to export report";
  }
};
```

### iOS Implementation Pattern

```swift
// Generate report (Swift)
func generateReport(from: Date, to: Date) async {
  isGenerating = true
  error = nil

  do {
    // Load all data sources in parallel
    async let schoolsTask = fetchSchools()
    async let coachesTask = fetchCoaches()
    async let interactionsTask = fetchInteractions(from: from, to: to)
    async let metricsTask = fetchMetrics(from: from, to: to)

    let (schools, coaches, interactions, metrics) = try await (
      schoolsTask,
      coachesTask,
      interactionsTask,
      metricsTask
    )

    // Aggregate data
    currentReport = aggregateReportData(
      schools: schools,
      coaches: coaches,
      interactions: interactions,
      metrics: metrics,
      from: from,
      to: to
    )
  } catch {
    self.error = "Failed to generate report: \(error.localizedDescription)"
  }

  isGenerating = false
}

// Export CSV
func exportToCSV() {
  guard let report = currentReport else {
    error = "No report to export"
    return
  }

  let csvString = generateCSV(from: report)
  let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("report.csv")

  do {
    try csvString.write(to: tempURL, atomically: true, encoding: .utf8)
    presentShareSheet(url: tempURL)
  } catch {
    self.error = "Failed to export CSV: \(error.localizedDescription)"
  }
}
```
