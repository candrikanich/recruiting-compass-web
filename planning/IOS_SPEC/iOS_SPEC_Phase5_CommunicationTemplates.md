# iOS Page Specification: Communication Templates

**Project:** The Recruiting Compass iOS App
**Created:** February 10, 2026
**Page Name:** Communication Templates
**Web Route:** `/settings/communication-templates`
**Priority:** Phase 5 (Lower Priority - Nice-to-Have)
**Complexity:** Medium
**Estimated Time:** 3 days

---

## 1. Overview

### Purpose

The Communication Templates page allows athletes to create, manage, and organize reusable templates for emails, text messages, and social media posts to coaches. Templates support variable substitution (e.g., {{coach_name}}, {{school_name}}) and can be filtered by type.

### Key User Actions

- View all personal templates (filtered by type)
- Create new templates for email, text, or Twitter/X
- Edit existing templates
- Delete templates with confirmation
- Filter templates by type (Email, Text, Twitter)
- Use templates when logging interactions (integration with interactions page)

### Success Criteria

- Templates load within 1 second
- CRUD operations persist correctly
- Type filtering works instantly
- Variable placeholders are clearly documented
- Templates can be used when creating interactions
- Form validation prevents invalid data

---

## 2. User Flows

### Primary Flow

```
1. User navigates to Communication Templates (from Settings)
2. System fetches user's templates
3. System displays:
   - Tab navigation (My Templates / Create New)
   - Type filter buttons (All, Email, Text, Twitter)
   - Template list (cards)
4. User can view all templates or filter by type
5. User can tap "Edit" to modify a template
6. User can tap "Create New" to add a template
```

### Alternative Flow: Create New Template

```
1. User taps "Create New" tab
2. System shows template editor form
3. User fills in:
   - Template Name (required)
   - Template Type (email, text, twitter)
   - Body/Content (multiline text, required)
   - Variables guide (shows available variables)
4. User taps "Save Template"
5. System validates (name + body required)
6. System saves to Supabase
7. System switches to "My Templates" tab
8. Template appears in list
```

### Alternative Flow: Edit Template

```
1. User taps "Edit" on a template card
2. System switches to "Create New" tab with pre-filled data
3. User modifies fields
4. User taps "Save Changes"
5. System updates template in Supabase
6. System returns to "My Templates" tab
```

### Alternative Flow: Delete Template

```
1. User taps "Delete" button (in edit mode)
2. System shows confirmation alert
3. User confirms deletion
4. System deletes template from Supabase
5. System returns to "My Templates" tab
```

### Alternative Flow: Filter by Type

```
1. User taps type filter button (e.g., "Email")
2. System filters template list
3. Only email templates display
4. Count updates (e.g., "Email (5)")
```

### Error Scenarios

```
Error: No templates yet
- User sees: Empty state
- Message: "No templates found"
- Action: Switches to "Create New" tab

Error: Fetch fails
- User sees: Error banner
- Recovery: Retry button or pull-to-refresh

Error: Save fails
- User sees: Error message
- Recovery: Form stays open, user can retry
```

---

## 3. Data Models

### Primary Model: CommunicationTemplate

```swift
struct CommunicationTemplate: Codable, Identifiable {
  let id: String
  let userId: String
  let name: String
  let type: TemplateType
  let body: String
  let variables: [String]?  // Optional list of supported variables
  let createdAt: Date
  let updatedAt: Date

  // Computed
  var typeDisplayName: String {
    type.rawValue.capitalized
  }

  var bodyPreview: String {
    let maxLength = 100
    return body.count > maxLength ? String(body.prefix(maxLength)) + "..." : body
  }

  var formattedDate: String {
    createdAt.formatted(date: .abbreviated, time: .omitted)
  }
}

enum TemplateType: String, Codable, CaseIterable {
  case email
  case text
  case twitter

  var displayName: String {
    switch self {
    case .email: return "Email"
    case .text: return "Text"
    case .twitter: return "Twitter"
    }
  }
}
```

### Form Data Model

```swift
struct TemplateFormData {
  var name: String = ""
  var type: TemplateType = .email
  var body: String = ""

  var isValid: Bool {
    !name.isEmpty && !body.isEmpty
  }

  init() {}

  init(from template: CommunicationTemplate) {
    self.name = template.name
    self.type = template.type
    self.body = template.body
  }
}
```

### Data Origin

- **Source:** Supabase `communication_templates` table
- **Refresh:** On page load, after create/update/delete
- **Caching:** In-memory only
- **Mutations:** Create, Update, Delete

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch User Templates

```
GET /api/communication-templates

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Initial Contact Email",
      "type": "email",
      "body": "Dear {{coach_name}},\n\nMy name is {{athlete_name}}...",
      "variables": ["coach_name", "athlete_name", "school_name"],
      "created_at": "2026-02-10T12:00:00Z",
      "updated_at": "2026-02-10T12:00:00Z"
    },
    ...
  ]
}
```

#### Endpoint 2: Create Template

```
POST /api/communication-templates

Body:
{
  "name": "Follow-up Email",
  "type": "email",
  "body": "Hi {{coach_name}}, I wanted to follow up..."
}

Response:
{
  "success": true,
  "data": { /* created template */ }
}
```

#### Endpoint 3: Update Template

```
PATCH /api/communication-templates/:id

Body:
{
  "name": "Updated Name",
  "body": "Updated body text"
}

Response:
{
  "success": true,
  "data": { /* updated template */ }
}
```

#### Endpoint 4: Delete Template

```
DELETE /api/communication-templates/:id

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
@State var templates: [CommunicationTemplate] = []
@State var isLoading = false
@State var error: String? = nil
@State var activeTab: Tab = .list
@State var filterType: TemplateType? = nil
@State var editingTemplate: CommunicationTemplate? = nil
@State var formData = TemplateFormData()

enum Tab {
  case list
  case create
}
```

---

## 6. UI/UX Details

### Layout Structure

```
[Back Button]
  ← Back to Settings

[Header]
  - Title: "Communication Templates"
  - Subtitle: "Create and manage email, text, and social media templates"

[Tab Navigation]
  - My Templates (N)
  - Create New

[My Templates Tab]
  - Type filter buttons (All, Email, Text, Twitter) with counts
  - Template cards grid/list
  - Empty state (if no templates)

[Create New Tab]
  - Template Editor form:
    - Template Name (text input)
    - Template Type (picker)
    - Body (multiline text, large)
    - Variables Guide (info section)
    - [Save Template] [Cancel] buttons
  - Delete button (if editing existing template)

[Template Card]
  - Template name (bold)
  - Type badge + date
  - Body preview (truncated)
  - [Edit] button

[Loading State]
  - Skeleton cards

[Empty State]
  - "No templates found"
```

### Design System

- **Type Badges:**
  - Email: Blue
  - Text: Green
  - Twitter: Sky blue

- **Form:**
  - Large multiline text area for body (200pt+ height)
  - Character counter (optional)

- **Variables Guide:**
  - Info box listing available variables:
    - {{coach_name}}
    - {{athlete_name}}
    - {{school_name}}
    - {{sport}}
  - Tapping a variable inserts it into body field (optional enhancement)

### Interactive Elements

#### Tab Navigation

- Button group, selected tab highlighted

#### Type Filter Buttons

- Pill-style buttons
- Selected state: Filled blue
- Unselected: Outlined gray

#### Template Editor

- Multiline text area with syntax highlighting for variables (optional)
- Save button enabled only when form is valid

#### Template Cards

- Tappable to open in edit mode

### Loading States

- Skeleton cards for initial load

### Accessibility

- VoiceOver announces all fields
- Form validation errors announced
- 44pt touch targets

---

## 7. Dependencies

### Frameworks

- SwiftUI (iOS 15+)
- Supabase iOS Client

---

## 8. Error Handling & Edge Cases

- **No templates:** Show empty state
- **Network errors:** Show error banner with retry
- **Invalid form data:** Show validation errors
- **Very long body text:** Allow (no hard limit), scroll view
- **Special characters in body:** Allow (no restrictions)
- **Variable syntax:** Document clearly in Variables Guide

---

## 9. Testing Checklist

### Happy Path

- [ ] Page loads templates correctly
- [ ] Can create new template
- [ ] Can edit existing template
- [ ] Can delete template with confirmation
- [ ] Type filtering works
- [ ] Tab navigation works
- [ ] Form validation works

### Error Tests

- [ ] Empty template name shows error
- [ ] Empty body shows error
- [ ] Network errors handled

### Edge Cases

- [ ] No templates (empty state)
- [ ] Only 1 type of template (filter still works)
- [ ] Very long template body
- [ ] Templates with special characters

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- **Variables:** Web has specific list; iOS should match
- **Template usage:** Integration with interactions page needed separately

### iOS-Specific

- **Multiline text input:** Ensure good UX for long templates
- **Variable insertion:** Consider helper to insert variables into body

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/settings/communication-templates.vue`
- **Composables:** `useCommunicationTemplates`
- **Components:** `TemplateEditor`

---

## 12. Sign-Off

**Specification reviewed by:** Claude
**Web implementation verified:** February 10, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** Standard CRUD page with tab navigation and filtering. Consider adding variable insertion helper for better UX. Templates integrate with interactions page (separate implementation).
