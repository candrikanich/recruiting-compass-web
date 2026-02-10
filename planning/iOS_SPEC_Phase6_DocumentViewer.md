# iOS Page Specification Template

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Document Viewer
**Web Route:** `/documents/view`
**Priority:** Phase 6 - Polish & Edge Cases
**Complexity:** Medium

---

## 1. Overview

### Purpose

Provides a fullscreen, distraction-free document viewing experience optimized for consuming content (videos, images, PDFs). Minimal UI with essential controls (close, share, download) and focus on the document itself. This is designed for quick preview or sharing workflows where editing is not needed.

### Key User Actions

- View document in fullscreen mode (minimal chrome)
- Play videos with standard playback controls
- Zoom/pan images with gestures
- Scroll/zoom PDFs with gestures
- Navigate between multiple documents (previous/next) if opened from a collection
- Share document via iOS share sheet
- Download document to device
- Close viewer and return to previous screen

### Success Criteria

- Viewer opens instantly with document preview
- Video playback is smooth with standard controls
- Images support zoom and pan gestures
- PDFs render quickly and support scrolling/zooming
- Minimal UI maximizes content viewing area
- Swipe down gesture dismisses viewer
- Share sheet allows native iOS sharing
- Navigation between documents (if collection) is intuitive

---

## 2. User Flows

### Primary Flow

```
1. User taps document card from Documents List
2. System presents Document Viewer modally (fullscreen)
3. System loads document from file_url
4. User sees document preview (video/image/PDF)
5. User interacts with content:
   - Video: Play/pause, seek, volume
   - Image: Pinch to zoom, drag to pan
   - PDF: Swipe pages, pinch to zoom
6. User taps "Close" button or swipes down
7. System dismisses viewer and returns to Documents List
```

### Alternative Flows

```
Flow B: Share Document
1. User taps "Share" button (top toolbar)
2. System shows iOS share sheet (UIActivityViewController)
3. User selects sharing option:
   - AirDrop
   - Messages
   - Mail
   - Save to Files
   - Copy Link
4. System performs share action
5. System dismisses share sheet
6. User remains in viewer

Flow C: Download Document
1. User taps "Download" button (top toolbar)
2. System downloads file to device
3. System shows download progress indicator
4. System completes download and shows success message
5. User can open file in Files app

Flow D: Navigate Between Documents (if collection)
1. User swipes left/right (or taps next/previous buttons)
2. System loads next/previous document in collection
3. User sees new document preview
4. Repeat navigation as needed

Flow E: Fullscreen Video
1. User taps fullscreen button on video player
2. System enters fullscreen mode (hides toolbar)
3. User rotates device to landscape (optional)
4. User taps done or back gesture
5. System exits fullscreen, restores toolbar
```

### Error Scenarios

```
Error: Document not found
- User sees: Empty state "Document not found"
- Recovery: Close button returns to list

Error: Failed to load document
- User sees: Error message "Unable to load document. [reason]"
- Recovery: Retry button or close

Error: Download failed
- User sees: Alert "Download failed. Check your connection."
- Recovery: Retry download or cancel

Error: Network failure
- User sees: Error overlay "Connection lost"
- Recovery: Retry loading or close viewer
```

---

## 3. Data Models

### Primary Model

```swift
struct Document: Codable, Identifiable {
  let id: String
  let type: DocumentType
  let title: String
  let description: String?
  let fileUrl: String
  let fileType: String?
  let version: Int
  let schoolId: String?
  let createdAt: String?

  // Computed properties
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

  var displayTitle: String {
    title
  }
}

enum DocumentType: String, Codable {
  case highlightVideo = "highlight_video"
  case transcript = "transcript"
  case resume = "resume"
  case recLetter = "rec_letter"
  case questionnaire = "questionnaire"
  case statsSheet = "stats_sheet"
}

// For navigation in collections
struct DocumentCollection {
  let documents: [Document]
  let currentIndex: Int

  var currentDocument: Document {
    documents[currentIndex]
  }

  var hasNext: Bool {
    currentIndex < documents.count - 1
  }

  var hasPrevious: Bool {
    currentIndex > 0
  }

  func nextDocument() -> Document? {
    hasNext ? documents[currentIndex + 1] : nil
  }

  func previousDocument() -> Document? {
    hasPrevious ? documents[currentIndex - 1] : nil
  }
}
```

### Related Models

- `Document` (primary model)
- No additional models required

### Data Origin

- **Source:** Direct file URL (passed as parameter) or Supabase query by ID
- **Refresh:** No auto-refresh (static viewing session)
- **Caching:** Rely on iOS URLCache for file caching
- **Mutations:** None (read-only viewer)

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Document by ID (if ID provided)

```
GET via Supabase
Table: documents
Filter: id = documentId
Select: id, title, file_url, file_type, type

Swift Example:
let response = try await supabase
  .from("documents")
  .select("id, title, file_url, file_type, type")
  .eq("id", documentId)
  .single()
  .execute()

Response:
{
  "id": "uuid",
  "title": "Freshman Highlights 2025",
  "file_url": "https://storage.url/file.mp4",
  "file_type": "video/mp4",
  "type": "highlight_video"
}

Error Codes:
- 401: Not authenticated
- 404: Document not found
- 500: Server error
```

#### Endpoint 2: Download File (if needed)

```
GET file from file_url
Direct download from Supabase Storage public URL

Swift Example:
let url = URL(string: document.fileUrl)!
let (localURL, response) = try await URLSession.shared.download(from: url)

Response:
- File downloaded to temporary location
- Can be moved to Files app or shared
```

### Authentication

- **Method:** None required for public file URLs (Supabase Storage public bucket)
- **Token Storage:** Not applicable for public files
- **Note:** If files are private, Supabase Auth Token must be included in file requests

---

## 5. State Management

### Page-Level State

```swift
@Published var document: Document
@Published var isLoading = false
@Published var error: String? = nil
@Published var isToolbarVisible = true
@Published var isShareSheetPresented = false
@Published var downloadProgress: Double = 0.0

// Collection navigation (optional)
@Published var collection: DocumentCollection? = nil
@Published var currentIndex: Int = 0

// Video state
@Published var isVideoPlaying = false
@Published var isFullscreen = false

// PDF state
@Published var pdfDocument: PDFDocument? = nil
@Published var currentPage: Int = 1

// Image state
@Published var imageZoomScale: CGFloat = 1.0
```

### Persistence Across Navigation

- **Document data** does not persist (viewer is modal, dismissed on close)
- **Toolbar visibility** resets to visible on each open
- **Video playback position** does not persist (starts from beginning)
- **PDF page position** does not persist (starts at page 1)

### Shared State (if cross-page)

- **None** (viewer is self-contained modal view)

---

## 6. UI/UX Details

### Layout Structure

```
[Fullscreen Modal View]
  [Top Toolbar - Translucent, auto-hides on tap]
    - Close button (left): "✕" or "Done"
    - Title (center): Document title (truncated)
    - Actions (right): Share button, Download button

  [Content Area - Full height, edge-to-edge]
    - Video: AVPlayerViewController (fullscreen, native controls)
    - Image: Zoomable ImageView (pinch/pan)
    - PDF: PDFView (paginated, zoomable)
    - Other: "Preview unavailable" + Download button

  [Bottom Toolbar - Translucent, auto-hides]
    - Navigation buttons (if collection):
      * Previous button (left, disabled if first)
      * Page indicator (center): "3 of 10"
      * Next button (right, disabled if last)

  [Gesture Overlays]
    - Tap: Toggle toolbar visibility
    - Swipe down: Dismiss viewer
    - Swipe left/right: Navigate collection (if applicable)
```

### Design System References

- **Color Palette:**
  - Toolbar background: `rgba(0, 0, 0, 0.8)` (translucent black)
  - Buttons: White icons on dark background
  - Close button: System "xmark.circle.fill" SF Symbol
  - Share button: System "square.and.arrow.up" SF Symbol
  - Download button: System "arrow.down.circle" SF Symbol

- **Typography:**
  - Title: SF Pro Text, 17pt, semibold, white
  - Page indicator: SF Pro Text, 14pt, regular, white

- **Spacing:** 16pt padding for toolbar, 8pt gaps between buttons
- **Radius:** No rounded corners (fullscreen)

### Interactive Elements

#### Top Toolbar

- **Close Button:**
  - Position: Top-left
  - Size: 44pt × 44pt
  - Icon: "✕" or "xmark" SF Symbol
  - Color: White
  - Tap: Dismiss viewer

- **Title Label:**
  - Position: Top-center
  - Width: Flexible, truncates with ellipsis
  - Color: White
  - Tap: No action

- **Share Button:**
  - Position: Top-right
  - Size: 44pt × 44pt
  - Icon: "square.and.arrow.up" SF Symbol
  - Color: White
  - Tap: Present share sheet

- **Download Button:**
  - Position: Top-right (next to share)
  - Size: 44pt × 44pt
  - Icon: "arrow.down.circle" SF Symbol
  - Color: White
  - Tap: Download file to device

#### Content Area

- **Video:**
  - Component: AVPlayerViewController
  - Controls: Native iOS video controls (play/pause, seek, volume, fullscreen, AirPlay)
  - Gestures: Tap to show/hide controls
  - Auto-play: No (user must tap play)

- **Image:**
  - Component: ScrollView with zoomable UIImageView
  - Gestures:
    - Pinch: Zoom in/out (1x to 5x)
    - Drag: Pan when zoomed
    - Double-tap: Zoom to 2x or back to 1x
  - Initial state: Fit to screen (aspect fill)

- **PDF:**
  - Component: PDFView
  - Controls: None (gestures only)
  - Gestures:
    - Swipe: Change pages (vertical scroll)
    - Pinch: Zoom in/out
    - Drag: Pan when zoomed
  - Initial state: Fit to width, page 1

- **Other Files:**
  - Message: "Preview unavailable for this file type"
  - Button: "Download to view" (blue filled)

#### Bottom Toolbar (if collection)

- **Previous Button:**
  - Icon: "chevron.left" SF Symbol
  - Disabled: If on first document (gray)
  - Enabled: White
  - Tap: Load previous document

- **Page Indicator:**
  - Format: "3 of 10"
  - Color: White
  - Tap: No action

- **Next Button:**
  - Icon: "chevron.right" SF Symbol
  - Disabled: If on last document (gray)
  - Enabled: White
  - Tap: Load next document

#### Gestures

- **Tap (anywhere on content):**
  - Action: Toggle toolbar visibility
  - Transition: Fade in/out with 0.2s animation

- **Swipe Down:**
  - Action: Dismiss viewer (interactive dismissal)
  - Transition: Follow finger, elastic bounce if released early

- **Swipe Left/Right (if collection):**
  - Action: Navigate to next/previous document
  - Transition: Slide animation (crossfade for videos)

### Loading States

```
First Load:
- Spinner overlay (white on translucent black background)
- No skeleton (fullscreen spinner)
- Timeout: 10 seconds (then show error)

Video Buffering:
- Native AVPlayer spinner (automatic)
- Progress bar for buffering progress (automatic)

PDF Loading:
- Spinner on first page
- Progressive rendering as pages load

Download Progress:
- Linear progress bar below download button
- Percentage text: "45%"

Error State:
- Error icon (white)
- Error message (white, centered)
- Retry button (white outline)
- Close button (still visible)
```

### Accessibility

- **VoiceOver:**
  - Close button: "Close document viewer"
  - Share button: "Share document"
  - Download button: "Download document to device"
  - Previous button: "View previous document"
  - Next button: "View next document"
  - Page indicator: "Document 3 of 10"
  - Video player: Native AVPlayer accessibility
  - PDF view: Native PDFView accessibility
- **Color Contrast:** White on dark translucent background (high contrast)
- **Touch Targets:** 44pt minimum for all buttons
- **Dynamic Type:** Title text scales with Dynamic Type
- **Gestures:** All essential actions available via buttons (not gesture-only)

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 16+)
- AVKit (for video playback - AVPlayerViewController)
- PDFKit (for PDF rendering - PDFView)
- UIKit (for UIActivityViewController - share sheet)

### Third-Party Libraries

- None (use native iOS components)

### External Services

- Supabase Storage (for file hosting)
- Supabase PostgreSQL (if fetching document by ID)

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show error overlay "Connection timed out" + retry button
- **No internet:** Show "No internet connection. Please check your connection." + close button
- **Server error (5xx):** Show "Server error. Unable to load document." + retry

### Data Errors

- **Document not found:** Show "Document not found" + close button
- **Invalid file_url:** Show "Invalid file URL" + close button
- **File deleted from storage:** Show "File no longer available" + close button
- **Unsupported file type:** Show "Preview unavailable for this file type" + download button

### User Errors

- **Download failed:** Alert: "Download failed. Please try again."
- **Share canceled:** No error (user canceled share sheet)
- **Video playback error:** Show "Unable to play video. [reason]" + close button

### Edge Cases

- **Very large video files (1GB+):** Show buffering spinner, allow streaming playback
- **Very large PDF files (500+ pages):** Load pages progressively (lazy loading)
- **High-resolution images (20MP+):** Downsample for display to avoid memory pressure
- **Corrupt files:** Show "Unable to load file. File may be corrupt." + close button
- **Offline mode:** Disable download button, allow viewing cached files
- **Low storage:** Alert before download: "Not enough storage space"
- **Toolbar auto-hide:** Toolbar hides after 3 seconds of inactivity (video only)
- **Rotation lock:** Respect device rotation lock setting

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Viewer opens and displays document correctly
- [ ] Video plays with native controls
- [ ] Image supports zoom (pinch) and pan (drag) gestures
- [ ] PDF pages scroll and zoom correctly
- [ ] User can close viewer via close button
- [ ] User can dismiss viewer via swipe down gesture
- [ ] User can share document via share sheet
- [ ] User can download document to device
- [ ] Toolbar toggles visibility on tap
- [ ] Navigation between documents works (if collection)
- [ ] Toolbar auto-hides after 3 seconds (video)

### Error Tests

- [ ] Handle network timeout during load (show retry)
- [ ] Handle 404 (document not found - show error)
- [ ] Handle video playback error (show message)
- [ ] Handle PDF load failure (show error)
- [ ] Handle download failure (show alert)
- [ ] Handle unsupported file type (show download button)
- [ ] Handle offline mode (disable download, allow cached viewing)

### Edge Case Tests

- [ ] Very large video files (1GB+) stream correctly
- [ ] Very large PDFs (500+ pages) load progressively
- [ ] High-resolution images (20MP+) display without crashing
- [ ] Rapid swipes between documents don't cause crashes
- [ ] Device rotation works correctly (landscape/portrait)
- [ ] VoiceOver reads all elements correctly
- [ ] Low storage alert before download works
- [ ] Corrupt files show appropriate error message

### Performance Tests

- [ ] Viewer opens in <1 second
- [ ] Video starts buffering immediately
- [ ] PDF first page renders in <1 second
- [ ] Image zoom is smooth (60 fps)
- [ ] No memory leaks when closing viewer
- [ ] Background video playback works (if AVAudioSession configured)

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Web viewer is identical to detail page:** Web doesn't have a separate fullscreen viewer; this iOS spec creates a distinct, simplified viewer experience
- **No edit functionality:** Web detail page allows editing; iOS viewer is read-only (use detail page for editing)
- **Query param routing:** Web uses `?id=` query param; iOS should use modal presentation with passed document/ID

### iOS-Specific Considerations

- **Memory pressure:** Large files can cause memory warnings on older devices (implement aggressive caching and downsampling)
- **Background playback:** Video continues playing in background if AVAudioSession is configured (may not be desired)
- **Picture-in-Picture (PiP):** AVPlayer supports PiP by default; decide if this should be enabled
- **Rotation lock:** Respect user's rotation lock setting (don't force landscape for videos)
- **Gesture conflicts:** Pinch gesture on video player may conflict with toolbar tap (prioritize toolbar tap)
- **Toolbar auto-hide:** Implement auto-hide timer for video viewing; keep visible for PDFs/images
- **File URL expiration:** Supabase public URLs may expire if bucket policy changes (ensure long-lived URLs)
- **Swipe-to-dismiss:** Interactive dismissal requires careful state management (pause video on dismiss)

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/documents/view.vue`
  - **Note:** Web implementation is identical to `[id].vue` (detail page)
  - iOS should implement as simplified fullscreen viewer
- **Composables used:**
  - `useDocumentsConsolidated` (fetch document by ID)
- **Components:**
  - `VideoPlayer.vue` (use AVPlayerViewController instead)
- **API endpoints:** Supabase direct queries (no custom API routes)

### Design References

- **iOS HIG:** https://developer.apple.com/design/human-interface-guidelines/
- **Modal Presentation:** https://developer.apple.com/design/human-interface-guidelines/modality
- **Video Playback:** https://developer.apple.com/design/human-interface-guidelines/playing-video

### API Documentation

- **AVPlayerViewController:** https://developer.apple.com/documentation/avkit/avplayerviewcontroller
- **PDFView:** https://developer.apple.com/documentation/pdfkit/pdfview
- **UIActivityViewController:** https://developer.apple.com/documentation/uikit/uiactivityviewcontroller

---

## 12. Sign-Off

**Specification reviewed by:** Claude (AI Assistant)
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:**

- Implement interactive swipe-to-dismiss gesture (similar to Photos app)
- Consider enabling Picture-in-Picture (PiP) for video playback
- Toolbar auto-hide should activate after 3 seconds of inactivity (video only)
- Collection navigation is optional for MVP (can be added in later phase)
- Download feature may require permission prompts (confirm UX flow)

---

## Appendix A: Example Implementation Reference

### Similar Pages in Codebase

- **Photos App (iOS)** - Similar fullscreen image/video viewer with minimal UI
- **Safari Reader Mode (iOS)** - Similar toolbar auto-hide behavior
- **Event Detail** (`iOS_SPEC_Phase6_EventDetail.md`) - Similar preview section pattern

### Code Snippets from Web

```typescript
// Fetch document by ID (from web implementation)
const documentId = computed(() => {
  const id = route.query.id
  if (Array.isArray(id)) {
    return decodeURIComponent(id.join('/'))
  }
  return decodeURIComponent(id as string)
})

const document = computed(() => {
  const id = documentId.value
  // If ID contains a slash, it's actually a file_url path
  if (id.includes('/')) {
    return documents.value.find((d: Document) => d.file_url === id)
  }
  return documents.value.find((d: Document) => d.id === id)
})

// Video player (use AVPlayerViewController instead)
<template>
  <video :src="document.file_url" controls />
</template>

// PDF viewer (use PDFView instead)
<template>
  <iframe :src="document.file_url" />
</template>
```

### iOS Implementation Pattern

```swift
// Present fullscreen viewer modally
struct DocumentViewerView: View {
  let document: Document
  @Environment(\.dismiss) var dismiss
  @State private var isToolbarVisible = true
  @State private var dragOffset: CGFloat = 0

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      // Content
      DocumentContentView(document: document)
        .offset(y: dragOffset)
        .gesture(
          DragGesture()
            .onChanged { value in
              if value.translation.height > 0 {
                dragOffset = value.translation.height
              }
            }
            .onEnded { value in
              if value.translation.height > 150 {
                dismiss()
              } else {
                withAnimation {
                  dragOffset = 0
                }
              }
            }
        )

      // Toolbar
      if isToolbarVisible {
        VStack {
          HStack {
            Button("Close") { dismiss() }
            Spacer()
            Text(document.title).lineLimit(1)
            Spacer()
            Button(action: shareDocument) {
              Image(systemName: "square.and.arrow.up")
            }
          }
          .padding()
          .background(.ultraThinMaterial)

          Spacer()
        }
        .transition(.opacity)
      }
    }
    .statusBar(hidden: !isToolbarVisible)
    .onTapGesture {
      withAnimation {
        isToolbarVisible.toggle()
      }
    }
  }

  func shareDocument() {
    // Present UIActivityViewController
  }
}
```
