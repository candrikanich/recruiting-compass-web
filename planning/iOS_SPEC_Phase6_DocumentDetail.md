# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Document Detail
**Web Route:** `/documents/[id]`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** High

---

## 1. Overview

### Purpose

Allows users to view full details of a specific document, preview the file content (videos, images, PDFs), edit metadata, manage version history, share with schools, and delete the document. This is the central hub for managing individual documents.

### Key User Actions

- View document metadata (type, title, description, version, school, upload date, file type)
- Preview document content:
  - Videos: AVPlayerViewController with playback controls
  - Images: Full-size image with zoom/pan
  - PDFs: Inline PDFView with scrolling/zooming
  - Other files: Download button
- Edit document metadata (title, description, school)
- Delete document (with confirmation)
- Share document with schools (multi-select modal)
- View version history (list all versions, restore previous versions)
- Upload new version (increments version number)
- Navigate back to documents list

### Success Criteria

- User can view all document details clearly
- Video playback works smoothly with standard controls
- PDF rendering is fast and zoomable
- Edit form saves changes and updates display
- Share modal allows multi-select schools and displays currently shared schools
- Version history shows all versions chronologically
- User can restore previous versions successfully
- Delete confirmation prevents accidental deletion
- Navigation back to list maintains scroll position

---

## 2. User Flows

### Primary Flow

```
1. User taps document card from Documents List
2. System navigates to Document Detail page
3. System loads document data and version history from Supabase
4. User sees document header (type badge, title, description)
5. User sees metadata grid (version, school, upload date, file type)
6. User sees document preview (video/image/PDF/download button)
7. User scrolls down to view version history
8. User taps "Edit" button
9. System shows edit form (title, school, description)
10. User modifies fields and taps "Save"
11. System updates document record
12. System dismisses edit form and refreshes display
13. User sees updated metadata
```

### Alternative Flows

```
Flow B: Share Document with Schools
1. User taps "Share" button
2. System shows share modal with:
   - Currently shared schools (with "Remove" buttons)
   - Available schools (checkboxes)
3. User selects schools to add
4. User taps "Save"
5. System creates share records in database
6. System dismisses modal and refreshes document
7. User sees updated shared count badge

Flow C: Upload New Version
1. User taps "+ Upload New Version" button
2. System shows document picker
3. User selects file
4. System validates file type matches original type
5. System uploads file to Storage
6. System creates new document version record (increments version)
7. System marks new version as current
8. System refreshes version history
9. User sees new version listed

Flow D: Restore Previous Version
1. User scrolls to version history section
2. User taps "Restore" on a previous version
3. System shows confirmation alert: "Restore this version? The current version will be marked as archived."
4. User confirms
5. System marks current version as not current
6. System marks selected version as current
7. System refreshes document and version history
8. User sees restored version as current

Flow E: Delete Document
1. User taps "Delete" button
2. System shows alert: "Are you sure you want to delete this document? This action cannot be undone."
3. User confirms
4. System deletes file from Storage bucket
5. System deletes document record from database
6. System navigates back to Documents List
7. Document no longer appears in list
```

### Error Scenarios

```
Error: Document not found
- User sees: Empty state "Document not found"
- Recovery: "Return to Documents" button

Error: Failed to load preview
- User sees: Placeholder with "Preview unavailable" message
- Recovery: "Download" button to view externally

Error: Edit failed
- User sees: Alert "Failed to save changes. [reason]"
- Recovery: Retry save or cancel

Error: Share failed
- User sees: Alert "Failed to share document. Check your connection."
- Recovery: Retry or cancel

Error: Delete failed
- User sees: Alert "Failed to delete document. Please try again."
- Recovery: Retry or cancel

Error: Network failure
- User sees: Banner "Unable to load document details. Check your connection."
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
  var typeLabel: String {
    type.label
  }

  var typeEmoji: String {
    type.emoji
  }

  var displayDate: String {
    guard let created = createdAt else { return "Unknown" }
    return Date(iso8601String: created).formatted(date: .abbreviated, time: .omitted)
  }

  var isVideo: Bool {
    type == .highlightVideo || fileType?.contains("video") == true
  }

  var isImage: Bool {
    fileType?.contains("image") == true
  }

  var isPDF: Bool {
    fileType == "application/pdf"
  }

  var canPreview: Bool {
    isVideo || isImage || isPDF
  }
}

enum DocumentType: String, Codable {
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

  var emoji: String {
    switch self {
    case .highlightVideo: return "🎥"
    case .transcript: return "📄"
    case .resume: return "📋"
    case .recLetter: return "💌"
    case .questionnaire: return "📝"
    case .statsSheet: return "📊"
    }
  }
}

struct DocumentVersion {
  let id: String
  let version: Int
  let fileUrl: String
  let isCurrent: Bool
  let createdAt: String

  var displayDate: String {
    Date(iso8601String: createdAt).formatted(date: .abbreviated, time: .shortened)
  }
}

struct ShareAccess {
  let schoolId: String
  let permission: String // "view" or "edit"
}
```

### Related Models

- `School` (for school association and share list)
- `User` (for ownership)

### Data Origin

- **Source:** Supabase `documents` table
- **Refresh:** On page load, after edit, after share, after version operations
- **Caching:** Cache document data for 5 minutes, version history for 10 minutes
- **Mutations:** Update (metadata), Delete, Share/Unshare, Version operations

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Document by ID

```
GET via Supabase
Table: documents
Filter: id = documentId
Select: *

Swift Example:
let response = try await supabase
  .from("documents")
  .select("*")
  .eq("id", documentId)
  .single()
  .execute()

Response:
{
  "id": "uuid",
  "type": "highlight_video",
  "title": "Freshman Highlights 2025",
  "description": "First season highlights",
  "file_url": "https://storage.url/file.mp4",
  "file_type": "video/mp4",
  "version": 2,
  "school_id": "school-uuid",
  "is_current": true,
  "shared_with_schools": ["school-1", "school-2"],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:00:00Z"
}

Error Codes:
- 401: Not authenticated
- 404: Document not found
- 500: Server error
```

#### Endpoint 2: Update Document Metadata

```
PUT via Supabase
Table: documents
Update: title, description, school_id

Swift Example:
let updates = [
  "title": newTitle,
  "description": newDescription,
  "school_id": newSchoolId
]
let response = try await supabase
  .from("documents")
  .update(updates)
  .eq("id", documentId)
  .select()
  .single()
  .execute()

Response:
{
  "success": true,
  "data": { /* updated document */ }
}

Error Codes:
- 400: Invalid data
- 404: Document not found
- 500: Update failed
```

#### Endpoint 3: Fetch Version History

```
GET via Supabase
Table: documents
Filter: Same title + type + user_id (all versions)
Order: version DESC

Swift Example:
let response = try await supabase
  .from("documents")
  .select("id, version, file_url, is_current, created_at")
  .eq("title", document.title)
  .eq("type", document.type)
  .eq("user_id", userId)
  .order("version", ascending: false)
  .execute()

Response:
[
  {
    "id": "v2-uuid",
    "version": 2,
    "file_url": "https://storage.url/file_v2.mp4",
    "is_current": true,
    "created_at": "2025-01-20T14:00:00Z"
  },
  {
    "id": "v1-uuid",
    "version": 1,
    "file_url": "https://storage.url/file_v1.mp4",
    "is_current": false,
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

#### Endpoint 4: Share Document with School

```
POST via Supabase
Table: document_shares (or update shared_with_schools array)

Swift Example (Array approach):
let currentShared = document.sharedWithSchools
let newShared = currentShared + [schoolId]
let response = try await supabase
  .from("documents")
  .update(["shared_with_schools": newShared])
  .eq("id", documentId)
  .execute()

Response:
{ "success": true }
```

#### Endpoint 5: Revoke School Access

```
DELETE via Supabase
Table: document_shares (or update array)

Swift Example:
let currentShared = document.sharedWithSchools.filter { $0 != schoolId }
let response = try await supabase
  .from("documents")
  .update(["shared_with_schools": currentShared])
  .eq("id", documentId)
  .execute()

Response:
{ "success": true }
```

#### Endpoint 6: Delete Document

```
DELETE via Supabase
Table: documents
Cascade: Delete file from Storage

Step 1: Extract file path from file_url
Step 2: Delete from Storage
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
@Published var document: Document? = nil
@Published var versions: [DocumentVersion] = []
@Published var schools: [School] = []
@Published var isLoading = false
@Published var error: String? = nil

// Edit state
@Published var isEditing = false
@Published var editTitle = ""
@Published var editDescription = ""
@Published var editSchoolId: String? = nil

// Share state
@Published var isShareModalPresented = false
@Published var selectedSchoolIds: Set<String> = []

// Upload new version state
@Published var isUploadingNewVersion = false
@Published var uploadProgress: Double = 0.0

// Preview state
@Published var isVideoPlaying = false
@Published var pdfDocument: PDFDocument? = nil
```

### Persistence Across Navigation

- **Document data** does not persist (reload on page re-entry)
- **Edit form state** cleared when form dismissed
- **Share selections** cleared when modal dismissed
- **Scroll position** maintained when navigating back from detail to list

### Shared State (if cross-page)

- **Family context:** Active user/athlete via `useActiveFamily` composable
- **Auth state:** Accessed from Supabase session manager
- **School list:** Shared across app for dropdowns

---

## 6. UI/UX Details

### Layout Structure

```
[NavigationView]
  [Header]
    - Back button: "← Back to Documents"
    - Title: Document title (large, bold)

  [ScrollView]
    [Document Header Card - White Background]
      - Type badge (colored pill, e.g., "🎥 Highlight Video")
      - Title (large, bold)
      - Description (if present, gray)
      - Action buttons row:
        * Edit (blue)
        * Share (green)
        * Delete (red)

    [Metadata Grid - 4 columns, 2 rows on iPhone]
      - Version: "v2"
      - School: "Stanford"
      - Uploaded: "Jan 15, 2025"
      - File Type: "video/mp4"

    [Document Preview Card - White Background]
      - Header: "Preview"
      - Content:
        * Video: AVPlayerViewController (embedded, 16:9 ratio)
        * Image: Full-width image with zoom gesture
        * PDF: PDFView (scrollable, zoomable)
        * Other: "Preview unavailable" + Download button

    [Version History Card - White Background]
      - Header: "Version History"
      - List of versions:
        * Version number + "Current" badge (if current)
        * Upload date + time
        * View button (opens preview)
        * Restore button (if not current)
      - "+ Upload New Version" button (blue, full-width)

    [Edit Form Card - Shown when isEditing = true]
      - Header: "Edit Document"
      - Form fields:
        * Title (text field)
        * School (dropdown)
        * Description (text editor, 3 rows)
      - Buttons: "Save" (blue), "Cancel" (gray)
```

### Design System References

- **Color Palette:**
  - Primary: `#0066FF` (blue)
  - Success: `#00CC66` (green)
  - Danger: `#FF3333` (red)
  - Gray backgrounds: `#F9FAFB`
  - Card background: `#FFFFFF`

- **Typography:**
  - Title: SF Pro Display, 28pt, bold
  - Subtitle: SF Pro Text, 16pt, regular, gray
  - Body: SF Pro Text, 14pt, regular
  - Metadata labels: SF Pro Text, 12pt, semibold, gray
  - Metadata values: SF Pro Text, 14pt, regular

- **Spacing:** 16pt padding inside cards, 12pt gaps between cards
- **Radius:** 12pt for cards, 8pt for buttons

### Interactive Elements

#### Action Buttons (Header)

- **Edit Button:**
  - Style: Blue filled, white text
  - Size: 88pt × 44pt
  - Tap: Show edit form

- **Share Button:**
  - Style: Green filled, white text
  - Size: 88pt × 44pt
  - Tap: Present share modal

- **Delete Button:**
  - Style: Red filled, white text
  - Size: 88pt × 44pt
  - Tap: Show confirmation alert

#### Document Preview

- **Video:**
  - Component: AVPlayerViewController
  - Controls: Play/pause, seek, volume, fullscreen
  - Tap: Toggle play/pause
  - Double-tap: Fullscreen

- **Image:**
  - Component: Zoomable ImageView
  - Gestures: Pinch to zoom, drag to pan
  - Tap: Toggle zoom (fit/fill)

- **PDF:**
  - Component: PDFView
  - Controls: Page navigation, zoom buttons
  - Gestures: Pinch to zoom, swipe to change pages
  - Tap: No action (let PDFView handle)

- **Download Button (for other files):**
  - Style: Blue filled, white text
  - Icon: Download arrow ↓
  - Tap: Open file in default app or share sheet

#### Version History List

- **Row Layout:**
  - Left: Version number ("v2") + badge ("Current" if applicable)
  - Center: Upload date + time (small, gray)
  - Right: "View" button (blue outline), "Restore" button (gray outline)

- **Upload New Version Button:**
  - Style: Blue filled, white text, full-width
  - Icon: "+ Upload New Version"
  - Tap: Open document picker

#### Share Modal

- **Layout:** Modal sheet, .large detents
- **Header:** "Share Document"
- **Section 1: Currently Shared Schools**
  - List of schools with "Remove" buttons (red text)
  - Empty if no schools shared
- **Section 2: Add Schools**
  - Checkboxes for each available school
  - Max-height scrollable (200pt)
- **Buttons:** "Save" (green), "Close" (gray)

#### Edit Form

- **Title Field:**
  - Placeholder: "Document title"
  - Validation: Required, max 100 chars
  - Error: Red border + message below

- **School Dropdown:**
  - Placeholder: "Select School (Optional)"
  - Options: All user's schools + "General / Not School-Specific"

- **Description Editor:**
  - Placeholder: "Add a description..."
  - Rows: 3 lines, auto-expand
  - Max chars: 500

- **Buttons:**
  - Save: Blue filled, disabled until valid
  - Cancel: Gray filled

### Loading States

```
First Load:
- Skeleton screens for header, preview, version history
- 300ms delay before showing skeleton
- Shimmer animation

Reload:
- Activity indicator in navigation bar
- Content remains visible

Video Loading:
- Spinner overlay on video player until buffered
- Progress bar for buffering progress

PDF Loading:
- Skeleton for first page
- Progressive rendering as pages load

Upload New Version:
- Progress bar below file name
- Percentage text: "45%"

Empty State (No Versions):
- Text: "No previous versions"
- Subtle gray color

Error State:
- Red banner at top
- Error message
- Retry button (if applicable)
```

### Accessibility

- **VoiceOver:**
  - Header: "Freshman Highlights. Highlight Video. Version 2."
  - Edit button: "Edit document metadata"
  - Share button: "Share document with schools"
  - Delete button: "Delete document. This action cannot be undone."
  - Version row: "Version 1. Uploaded January 15, 2025. View button. Restore button."
- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Support text size scaling (title, description, metadata)
- **Video Controls:** Ensure AVPlayer controls are accessible

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- Supabase iOS Client (for auth + data + storage)
- AVKit (for video playback - AVPlayerViewController)
- PDFKit (for PDF rendering - PDFView)
- UIKit (for document picker)

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
- **No internet:** Show offline mode indicator, disable edit/share/delete actions
- **Server error (5xx):** Show "Server error. Please try again." + retry

### Data Errors

- **Document not found:** Show empty state with "Return to Documents" button
- **Invalid file_url:** Show placeholder + "Preview unavailable" message
- **Missing school_id:** Display "General" or "Not specified"
- **Missing version history:** Show "No previous versions" message

### User Errors

- **Edit validation failed:** Show inline errors (red border, message below field)
- **Share with no schools selected:** Disable "Save" button
- **Delete confirmation:** Require explicit confirmation via alert
- **Restore version interrupted:** Show error alert with retry option

### Edge Cases

- **Very long title:** Truncate with ellipsis in header (2 lines max)
- **Very long description:** Allow full scrolling in display, limit input to 500 chars
- **Large video files (500MB+):** Show buffering progress, allow background playback
- **Large PDFs (100+ pages):** Load pages progressively, show page count
- **Shared with 50+ schools:** Truncate list in share modal, implement search
- **10+ versions:** Implement pagination or "Show more" button
- **Concurrent edits:** Last-write-wins (no conflict resolution)
- **Offline version restore:** Disable restore button when offline

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Page loads and displays document details correctly
- [ ] Video playback works with standard controls
- [ ] PDF rendering is clear and zoomable
- [ ] Image preview supports zoom and pan gestures
- [ ] User can edit title, description, and school
- [ ] Edit form saves changes and updates display
- [ ] User can share document with schools
- [ ] Share modal shows currently shared schools with remove buttons
- [ ] User can add multiple schools via checkboxes
- [ ] Version history displays all versions chronologically
- [ ] User can view previous versions
- [ ] User can restore previous versions
- [ ] User can upload new version (file picker opens)
- [ ] User can delete document (confirmation required)
- [ ] Navigation back to list works correctly

### Error Tests

- [ ] Handle network timeout during fetch (show retry)
- [ ] Handle 401 error (redirect to login)
- [ ] Handle 404 (document not found - show empty state)
- [ ] Handle edit save failure (show alert with reason)
- [ ] Handle share failure (show alert)
- [ ] Handle delete failure (show alert)
- [ ] Handle server errors (5xx) (show retry)

### Edge Case Tests

- [ ] Very long title displays correctly (truncated)
- [ ] Very long description scrolls properly
- [ ] Large video files buffer and play smoothly
- [ ] Large PDFs load pages progressively
- [ ] Shared with many schools (50+) displays correctly
- [ ] Multiple versions (10+) display correctly
- [ ] VoiceOver reads all elements correctly
- [ ] Dynamic Type scales text appropriately
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds (with cached data)
- [ ] Video starts playing within 3 seconds (on 4G)
- [ ] PDF first page renders in <1 second
- [ ] Edit form submission completes in <1 second
- [ ] No memory leaks when navigating away
- [ ] Background video playback works (if app backgrounded)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Version control:** Web tracks versions by incrementing version number, but doesn't enforce strict version increment rules (user could manually set version to any number)
- **Share permissions:** Web only supports "view" permission (not "edit")
- **Concurrent edits:** No conflict resolution (last-write-wins)

### iOS-Specific Considerations

- **Video playback:** Large video files (500MB+) may cause memory pressure on older devices (iPhone SE, XR)
- **PDF rendering:** PDFKit can be slow for large PDFs (100+ pages) - implement page lazy loading
- **Background playback:** Video continues playing in background if AVAudioSession is configured for background audio
- **File storage:** iOS app storage limits apply (avoid filling device storage with large documents)
- **Share sheet vs custom modal:** iOS typically uses UIActivityViewController for sharing, but web uses custom modal (custom modal chosen for consistency)
- **Version restore UX:** Restoring a version doesn't create a new version; it just marks a different existing version as current
- **File URL security:** Supabase public URLs expire if not configured correctly (ensure bucket policy allows public read)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/documents/[id].vue`
- **Composables used:**
  - `useDocumentsConsolidated` (fetch, update, delete, fetchVersions, shareDocument, revokeAccess)
  - `useSchools` (school dropdown)
  - `useErrorHandler` (error messaging)
- **Components:**
  - `VideoPlayer.vue` (custom video player wrapper)
- **API endpoints:** Supabase direct queries (no custom API routes)

### Design References

- **Figma:** (Not provided)
- **Brand Guidelines:** Follow SF Design System, iOS HIG

### API Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Storage API:** https://supabase.com/docs/guides/storage
- **AVPlayer Docs:** https://developer.apple.com/documentation/avkit/avplayerviewcontroller
- **PDFKit Docs:** https://developer.apple.com/documentation/pdfkit

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Ensure AVAudioSession is configured for video playback (enable background audio if desired)
- Implement PDFKit lazy loading for large PDFs (load pages on-demand)
- Consider adding quick actions: long-press for preview, swipe for delete
- Version restore should show preview of version before restoring (not implemented in web, nice-to-have for iOS)

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **School Detail** (`iOS_SPEC_Phase5_SchoolDetail.md`) - Similar detail page structure with edit form
- **Event Detail** (`iOS_SPEC_Phase6_EventDetail.md`) - Similar metadata grid and action buttons

### Code Snippets from Web

```typescript
// Fetch document by ID (from useDocumentsConsolidated)
const fetchDocumentById = async (id: string): Promise<Document> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Update document metadata
const updateDocument = async (id: string, updates: Partial<Document>) => {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Share document with school
const shareDocument = async (docId: string, schoolId: string, permission: string) => {
  const doc = await fetchDocumentById(docId)
  const currentShared = doc.shared_with_schools || []
  const newShared = [...currentShared, schoolId]

  const { error } = await supabase
    .from('documents')
    .update({ shared_with_schools: newShared })
    .eq('id', docId)

  if (error) throw error
  return true
}

// Fetch version history
const fetchVersions = async (documentId: string): Promise<Document[]> => {
  const doc = await fetchDocumentById(documentId)

  const { data, error } = await supabase
    .from('documents')
    .select('id, version, file_url, is_current, created_at')
    .eq('title', doc.title)
    .eq('type', doc.type)
    .eq('user_id', doc.user_id)
    .order('version', { ascending: false })

  if (error) throw error
  return data
}

// Video player component (simplified)
<template>
  <video
    :src="src"
    controls
    class="w-full rounded-lg"
    @error="handleError"
  />
</template>

<script setup lang="ts">
const props = defineProps<{ src: string }>()
const handleError = () => {
  console.error('Video failed to load:', props.src)
}
</script>
```
