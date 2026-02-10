# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Documents List
**Web Route:** `/documents`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Allows users to manage their recruiting documents (videos, transcripts, resumes, recommendation letters, questionnaires, stats sheets). Users can upload new documents, view/filter/sort existing documents, and navigate to detail pages for editing and sharing.

### Key User Actions

- View all uploaded documents
- Upload new documents (with metadata: type, title, description, school, version)
- Filter documents by type, school, shared status
- Search documents by title or description
- Sort documents by newest, oldest, name, type, most shared
- Toggle between grid and list view modes
- Delete documents
- Navigate to document detail page

### Success Criteria

- User can upload documents with correct file type validation
- Documents display correctly in grid/list views
- Filters and search work accurately
- Statistics cards show accurate counts
- Upload progress indicator displays during file upload
- User receives confirmation after successful upload
- Deleted documents are immediately removed from list

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Documents List
2. System loads all documents from Supabase
3. User sees statistics cards (total, shared, most common type, storage)
4. User sees documents in grid/list view (default: grid)
5. User taps "+ Upload Document" button
6. System shows upload form sheet
7. User fills required fields (type, title, file) and optional fields (description, school, version)
8. User selects file via document picker
9. System validates file type matches document type
10. User taps "Upload"
11. System shows progress indicator
12. System uploads file to Supabase Storage
13. System creates document record
14. System dismisses form and refreshes list
15. User sees new document in list
```

### Alternative Flows

```
Flow B: Filter Documents
1. User taps filter icon
2. System shows filter sheet with options:
   - Search (text input)
   - Type (multi-select)
   - School (dropdown)
   - Shared status (toggle)
3. User selects filters
4. System applies filters and updates list
5. User sees filtered document count

Flow C: Change Sort Order
1. User taps sort dropdown
2. User selects: Newest, Oldest, Name, Type, Most Shared
3. System re-sorts list
4. User sees updated order

Flow D: Toggle View Mode
1. User taps Grid/List toggle button
2. System switches view mode
3. User sees same documents in new layout
```

### Error Scenarios

```
Error: No documents available
- User sees: Empty state with icon, message "No documents yet", subtitle "Upload videos, transcripts, and other documents to share with coaches"
- Recovery: Tap "+ Upload Document" button

Error: Upload failed
- User sees: Alert with error message "Upload failed: [reason]"
- Recovery: Retry upload or check file size/format

Error: Invalid file type
- User sees: Alert "Invalid file type. Please select [allowed types]"
- Recovery: Select correct file type

Error: Network failure
- User sees: Banner "Unable to load documents. Check your connection."
- Recovery: Pull-to-refresh or tap retry button
```

---

## 3. Data Models

### Primary Model

```swift
struct Document: Codable, Identifiable {
  let id: String
  let userId: String?
  let type: DocumentType
  let title: String
  let description: String?
  let fileUrl: String
  let fileType: String?
  let version: Int
  let schoolId: String?
  let isCurrent: Bool
  let sharedWithSchools: [String]
  let uploadedBy: String?
  let createdAt: String?
  let updatedAt: String?

  // Computed properties
  var isShared: Bool {
    !(sharedWithSchools.isEmpty)
  }

  var typeEmoji: String {
    switch type {
    case .highlightVideo: return "🎥"
    case .transcript: return "📄"
    case .resume: return "📋"
    case .recLetter: return "💌"
    case .questionnaire: return "📝"
    case .statsSheet: return "📊"
    }
  }

  var displayDate: String {
    guard let created = createdAt else { return "Unknown" }
    return Date(iso8601String: created).formatted(date: .abbreviated, time: .omitted)
  }
}

enum DocumentType: String, Codable, CaseIterable {
  case highlightVideo = "highlight_video"
  case transcript = "transcript"
  case resume = "resume"
  case recLetter = "rec_letter"
  case questionnaire = "questionnaire"
  case statsSheet = "stats_sheet"

  var label: String {
    switch self {
    case .highlightVideo: return "Highlight Video"
    case .transcript: return "Transcript"
    case .resume: return "Resume"
    case .recLetter: return "Recommendation Letter"
    case .questionnaire: return "Questionnaire"
    case .statsSheet: return "Stats Sheet"
    }
  }

  var allowedExtensions: [String] {
    switch self {
    case .highlightVideo: return [".mp4", ".mov", ".avi"]
    case .transcript: return [".pdf", ".txt"]
    case .resume: return [".pdf", ".doc", ".docx"]
    case .recLetter: return [".pdf"]
    case .questionnaire: return [".pdf", ".doc", ".docx"]
    case .statsSheet: return [".csv", ".xls", ".xlsx"]
    }
  }
}

struct DocumentStatistics {
  let total: Int
  let shared: Int
  let mostCommonType: String
  let totalStorageMB: Double // Phase 5 implementation
}
```

### Related Models

- `School` (for school association)
- `User` (for ownership tracking)

### Data Origin

- **Source:** Supabase `documents` table
- **Refresh:** On page load, after upload, after delete
- **Caching:** Cache for 5 minutes (stale-while-revalidate)
- **Mutations:** Create, Delete (via upload form or swipe actions)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch All Documents

```
GET via Supabase
Table: documents
Filter: user_id = current_user_id
Select: id, type, title, description, file_url, file_type, version, school_id, is_current, shared_with_schools, created_at, updated_at

Swift Example:
let response = try await supabase
  .from("documents")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", ascending: false)
  .execute()

Response:
[
  {
    "id": "uuid",
    "type": "highlight_video",
    "title": "Freshman Highlights 2025",
    "description": "First season highlights",
    "file_url": "https://storage.url/file.mp4",
    "file_type": "video/mp4",
    "version": 1,
    "school_id": "school-uuid",
    "is_current": true,
    "shared_with_schools": ["school-1", "school-2"],
    "created_at": "2025-01-15T10:30:00Z"
  }
]

Error Codes:
- 401: Not authenticated (redirect to login)
- 403: No access (show error message)
- 500: Server error (show retry)
```

#### Endpoint 2: Upload Document

```
POST via Supabase Storage + Insert
Bucket: documents
Path: {user_id}/{type}/{timestamp}_{filename}

Step 1: Upload file to Supabase Storage
let uploadPath = "\(userId)/\(type)/\(timestamp)_\(filename)"
let data = fileData
let response = try await supabase.storage
  .from("documents")
  .upload(path: uploadPath, file: data, fileOptions: FileOptions(contentType: fileType))

Step 2: Insert document record
let fileUrl = supabase.storage.from("documents").getPublicUrl(path: uploadPath)
let document = [
  "user_id": userId,
  "type": type.rawValue,
  "title": title,
  "description": description,
  "file_url": fileUrl,
  "file_type": fileType,
  "version": version,
  "school_id": schoolId,
  "is_current": true,
  "shared_with_schools": []
]
let insertResponse = try await supabase
  .from("documents")
  .insert(document)
  .select()
  .single()
  .execute()

Response:
{
  "success": true,
  "data": { /* document record */ }
}

Error Codes:
- 400: Invalid file format
- 413: File too large (max 100MB)
- 500: Upload failed
```

#### Endpoint 3: Delete Document

```
DELETE via Supabase
Table: documents
Cascade: Also delete file from Storage

Step 1: Get file_url from document record
Step 2: Delete from Storage bucket
try await supabase.storage
  .from("documents")
  .remove(paths: [filePath])

Step 3: Delete document record
try await supabase
  .from("documents")
  .delete()
  .eq("id", documentId)
  .execute()

Response:
{ "success": true }

Error Codes:
- 404: Document not found
- 500: Delete failed
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
@Published var documents: [Document] = []
@Published var schools: [School] = []
@Published var isLoading = false
@Published var error: String? = nil
@Published var isUploadFormPresented = false
@Published var uploadProgress: Double = 0.0

// Filters
@Published var searchQuery = ""
@Published var selectedTypes: Set<DocumentType> = []
@Published var selectedSchoolId: String? = nil
@Published var showSharedOnly = false

// Sort & View
@Published var sortBy: SortOption = .newest
@Published var viewMode: ViewMode = .grid

enum SortOption {
  case newest, oldest, name, type, shared
}

enum ViewMode {
  case grid, list
}
```

### Persistence Across Navigation

- **View mode** persists via `UserDefaults` (key: "documentsViewMode")
- **Sort preference** persists via `UserDefaults` (key: "documentsSortBy")
- **Filters** cleared on page exit (no persistence)
- **Search query** cleared on page exit

### Shared State (if cross-page)

- **Family context:** Active user/athlete via `useActiveFamily` composable
- **Auth state:** Accessed from Supabase session manager
- **School list:** Shared across app for dropdowns/filters

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Title: "Documents"
    - Subtitle: "{filteredCount} of {totalCount} total"

  [Statistics Cards Row - Horizontal Scroll]
    - Total Documents (blue)
    - Shared Documents (green)
    - Most Common Type (purple)
    - Total Storage (orange - "Phase 5")

  [Filter Bar]
    - Filter button (badge shows active filter count)
    - Search bar (expandable)
    - Sort dropdown (Newest, Oldest, Name, Type, Shared)

  [View Toggle]
    - Grid button (selected: blue, unselected: gray)
    - List button (selected: blue, unselected: gray)

  [Content Area - ScrollView]
    - Grid: 2 columns (iPhone), 3 columns (iPad)
    - List: 1 column with thumbnails
    - Empty state (if no documents)
    - Loading skeleton (first load)

  [Floating Action Button]
    - "+ Upload Document" (bottom-right, blue circle)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Success: `#00CC66` (green)
  - Danger: `#FF3333` (red)
  - Purple: `#9333EA`
  - Orange: `#FF6B00`
  - Gray backgrounds: `#F9FAFB`

- **Typography:**
  - Title: SF Pro Display, 34pt, bold
  - Subtitle: SF Pro Text, 14pt, regular, gray
  - Card titles: SF Pro Text, 16pt, semibold
  - Body: SF Pro Text, 14pt, regular

- **Spacing:** 16pt padding, 12pt gaps between cards
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Statistics Cards

- **Layout:** Horizontal ScrollView, 4 cards
- **Card Size:** 140pt width × 80pt height
- **Content:** Icon/emoji, label, value (large, colored)
- **Tap:** None (informational only)

#### Filter Chip Bar

- **Active Filters:** Display as removable chips below filter bar
- **Chip:** Gray pill with "X" button, e.g., "Type: Video ✕"
- **Clear All:** "Clear filters" text button

#### Upload Button

- **Position:** Bottom-right floating action button
- **Size:** 64pt diameter circle
- **Icon:** "+" symbol, white on blue
- **Action:** Present upload form sheet

#### Document Cards (Grid)

- **Thumbnail:** Top section, 16:9 ratio
  - Video: Show first frame or video icon
  - PDF: Show first page thumbnail or PDF icon
  - Other: Show file type icon
- **Type Badge:** Top-left overlay, colored pill (e.g., "🎥 Video")
- **Title:** Below thumbnail, 2 lines max, truncated with ellipsis
- **Metadata:** School name, version, date (small, gray)
- **Shared Badge:** Green "Shared: 3" badge if shared
- **Tap:** Navigate to Document Detail

#### Document Rows (List)

- **Thumbnail:** Left side, 80pt × 60pt
- **Content:** Right side, title + metadata stacked
- **Shared Badge:** Right side, inline with title
- **Swipe Actions:** Delete (red, trash icon)
- **Tap:** Navigate to Document Detail

#### Upload Form Sheet

- **Presentation:** Modal sheet, .large detents
- **Sections:**
  1. Document Type (required, picker)
  2. Title (required, text field)
  3. School (optional, dropdown)
  4. Version (optional, number field, default: 1)
  5. Description (optional, text editor, 3 rows)
  6. File Upload (required, button → document picker)
- **Progress Bar:** Show during upload
- **Buttons:** "Upload" (blue, disabled until valid), "Cancel" (gray)

### Loading States

```
First Load:
- Skeleton screens for 6 document cards
- 300ms delay before showing skeleton
- Shimmer animation

Reload:
- Activity indicator in navigation bar
- Content remains visible

Upload Progress:
- Linear progress bar below file name
- Percentage text: "45%"
- Estimated time remaining

Empty State:
- Icon: 📄 (gray, 80pt)
- Title: "No documents yet"
- Subtitle: "Upload videos, transcripts, and other documents to share with coaches"
- CTA: "+ Upload Document" button (blue)

Error State:
- Red banner at top
- Error message (clear, user-friendly)
- Retry button
```

### Accessibility

- **VoiceOver:**
  - Cards: "Freshman Highlights. Highlight Video. Shared with 2 schools. Uploaded January 15, 2025."
  - Upload button: "Upload new document"
  - Filter button: "Filter documents. 2 filters active."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Support text size scaling in list view (not grid thumbnails)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (for auth + data + storage)
- UIKit (for UIDocumentPickerViewController)
- AVFoundation (for video thumbnails)
- PDFKit (for PDF thumbnails)

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase PostgreSQL (`documents` table)
- Supabase Storage (`documents` bucket)
- Supabase Auth (session management)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" banner + retry button
- **No internet:** Show offline mode indicator, queue upload for later (optional)
- **Server error (5xx):** Show "Server error. Please try again." + retry

### Data Errors

- **Empty list:** Show empty state with CTA
- **Invalid document record:** Skip and log error (don't crash)
- **Missing school_id:** Display "General" or "Not specified"
- **Missing file_url:** Show placeholder icon, disable tap

### User Errors

- **Invalid file type:** Alert: "Invalid file type. [Type] requires [extensions]."
- **File too large:** Alert: "File exceeds 100MB limit. Please compress or choose a smaller file."
- **Missing required fields:** Show inline validation errors (red border, message below field)
- **Upload interrupted:** Alert: "Upload failed. Please try again."

### Edge Cases

- **Very long title:** Truncate with ellipsis after 2 lines in grid, 1 line in list
- **Large lists (100+ documents):** Implement pagination (load 50 at a time, infinite scroll)
- **Concurrent uploads:** Queue uploads, show progress for each in separate rows
- **Duplicate title:** Allow duplicates (differentiate by version or date)
- **Shared with 20+ schools:** Truncate badge to "Shared: 20+"
- **Offline upload:** Store upload request locally, sync when online (optional for Phase 6)

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays all user's documents correctly
- [ ] Statistics cards show accurate counts
- [ ] User can upload a video document successfully
- [ ] User can upload a PDF document successfully
- [ ] Upload progress indicator displays during upload
- [ ] User can delete a document via swipe action
- [ ] User can toggle between grid and list views
- [ ] User can filter documents by type
- [ ] User can search documents by title
- [ ] User can sort documents by newest/oldest/name
- [ ] User can navigate to document detail page

### Error Tests

- [ ] Handle network timeout during fetch (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle upload failure (show alert with reason)
- [ ] Handle invalid file type selection (show validation error)
- [ ] Handle empty data set (show empty state)
- [ ] Handle server errors (5xx) (show retry)

### Edge Case Tests

- [ ] Very long document title doesn't break layout (truncates)
- [ ] Large lists (100+ documents) load efficiently (pagination)
- [ ] Rapid taps on upload button don't create duplicate sheets
- [ ] VoiceOver reads document cards correctly
- [ ] Page adapts to different device sizes (SE, 13, 15+, iPad)
- [ ] Dynamic Type scales text in list view
- [ ] Filter with no results shows appropriate message
- [ ] Multiple filters applied simultaneously work correctly

### Performance Tests

- [ ] Page loads in <2 seconds on 4G (with cached data)
- [ ] Grid scrolling is smooth (60 fps) with 50+ documents
- [ ] No memory leaks when navigating away
- [ ] Video thumbnails load without blocking UI
- [ ] Upload progress updates smoothly (no UI freezes)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Total Storage metric:** Shows "Phase 5" placeholder (not implemented yet)
- **Version control:** Web shows version number but doesn't enforce version increment rules
- **Duplicate detection:** Web allows duplicate titles without warning

### iOS-Specific Considerations

- **File picker:** iOS document picker has different UX than web file input (users must understand file locations)
- **Thumbnail generation:** Video thumbnails require AVAssetImageGenerator (can be slow for large files)
- **PDF thumbnails:** PDFKit rendering can be slow for large PDFs (implement caching)
- **Background uploads:** iOS requires background URLSession for reliable large file uploads
- **Memory pressure:** iOS may terminate app during large uploads if not properly backgrounded
- **File size limits:** Consider iOS app storage limits when allowing 100MB+ files
- **Offline mode:** Web doesn't support offline uploads; iOS could queue uploads when offline

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/documents/index.vue`
- **Composables used:**
  - `useDocumentsConsolidated` (fetch, upload, delete)
  - `useSchools` (school dropdown)
  - `useUniversalFilter` (filter logic)
  - `useFormValidation` (file validation)
- **API endpoints:** Supabase direct queries (no custom API routes)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Storage API:** https://supabase.com/docs/guides/storage
- **Database Schema:** `documents` table in Supabase

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Implement background upload session for large files (videos)
- Cache thumbnails aggressively to avoid repeated generation
- Consider adding document preview quick look on long-press (3D Touch/Haptic Touch)
- Phase 5 will add total storage calculation (database aggregate query)

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Schools List** (`iOS_SPEC_Phase5_SchoolsList.md`) - Similar filter/sort/view toggle pattern
- **Events List** (`iOS_SPEC_Phase6_EventsList.md`) - Similar grid/list view implementation

### Code Snippets from Web

```typescript
// File validation logic (from useFormValidation composable)
const allowedExtensions = {
  highlight_video: [".mp4", ".mov", ".avi"],
  transcript: [".pdf", ".txt"],
  resume: [".pdf", ".doc", ".docx"],
  rec_letter: [".pdf"],
  questionnaire: [".pdf", ".doc", ".docx"],
  stats_sheet: [".csv", ".xls", ".xlsx"],
};

function validateFile(file: File, type: DocumentType): boolean {
  const extension = file.name.substring(file.name.lastIndexOf("."));
  return allowedExtensions[type].includes(extension.toLowerCase());
}

// Supabase upload pattern (from useDocumentsConsolidated)
const uploadDocument = async (
  file: File,
  type: DocumentType,
  title: string,
  metadata: object,
) => {
  // 1. Upload file to Storage
  const filePath = `${userId}/${type}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  // 3. Insert document record
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      type,
      title,
      file_url: urlData.publicUrl,
      file_type: file.type,
      ...metadata,
    })
    .select()
    .single();

  return { success: !error, data, error };
};
```
