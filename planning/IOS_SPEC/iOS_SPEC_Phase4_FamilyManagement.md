# iOS Page Specification: Family Management Settings

**Project:** The Recruiting Compass iOS App
**Created:** February 8, 2026
**Page Name:** Family Management
**Web Route:** `/settings/family-management`
**Priority:** MVP / Phase 4 (Medium - Multi-User Support)
**Complexity:** High (role-based views, multi-step family code workflow, member management)
**Estimated Time:** 4-5 days

---

## 1. Overview

### Purpose

Allow players (athletes) and parents to manage family connections. Players create and share family codes with parents. Parents join families using codes. This enables parents to view their child's recruiting data through a shared family unit.

### Key User Actions

- **Players:** View family code, copy code to clipboard/share, regenerate code, view family members, remove family members
- **Parents:** Enter a family code to join a family, view joined families, leave a family

### Success Criteria

- Player sees their family code (FAM-XXXXXX format) on page load
- Player can copy code to clipboard or share via iOS share sheet
- Player can regenerate code (invalidates old code)
- Parent can enter a code, join a family, and see it in their families list
- Parent sees descriptive error messages for invalid/expired codes
- Family members list updates in real-time after join/remove
- Role-based views: players see code + members, parents see join form + families

---

## 2. User Flows

### Primary Flow: Player Views Family Code

```
1. Player navigates to Family Management from Settings
2. System fetches family_units record for player's user ID
3. Player sees their family code displayed prominently (FAM-XXXXXX)
4. Player sees code generation timestamp
5. Player sees list of family members (parents who have joined)
```

### Alternative Flow: Player Creates Family (First Visit)

```
1. Player navigates to Family Management
2. System detects no family_units record exists
3. System calls POST /api/family/create
4. New family created with generated FAM-XXXXXX code
5. Player sees their new code and empty members list
```

### Alternative Flow: Player Regenerates Code

```
1. Player taps "Regenerate Code" button
2. Confirmation alert: "Are you sure? The old code will stop working."
3. Player confirms
4. System calls POST /api/family/code/regenerate
5. New code displayed, success message shown
```

### Alternative Flow: Player Removes Family Member

```
1. Player taps "Remove" on a family member card
2. Confirmation alert: "Remove [name] from family?"
3. Player confirms
4. System calls DELETE /api/family/members/[memberId]
5. Member disappears from list, success message shown
```

### Alternative Flow: Parent Joins Family

```
1. Parent navigates to Family Management
2. Parent sees "Join a Family" section with code input
3. Parent enters FAM-XXXXXX code
4. System calls POST /api/family/code/join
5. Success: Family appears in "My Families" list
6. Active family context updates for parent
```

### Error Scenarios

```
Error: Invalid code format
- User sees: "Invalid family code format. Codes look like FAM-XXXXXX"
- Recovery: Re-enter correct code

Error: Code not found (404)
- User sees: "Family code not found. Please check and try again."
- Recovery: Verify code with player, re-enter

Error: Rate limited (429)
- User sees: "Too many attempts. Please wait 5 minutes."
- Recovery: Wait and retry

Error: Already a member (400)
- User sees: "You are already a member of this family."
- Recovery: None needed

Error: Network failure
- User sees: "Connection error. Please try again."
- Recovery: Retry button
```

---

## 3. Data Models

### Primary Models

```swift
struct FamilyUnit: Codable, Identifiable {
    let id: String
    let playerUserId: String
    let familyName: String?
    let familyCode: String?          // Format: FAM-XXXXXX
    let codeGeneratedAt: String?     // ISO timestamp
    let createdAt: String?
}

struct FamilyMember: Codable, Identifiable {
    let id: String
    let familyUnitId: String
    let userId: String
    let role: String                  // "player" | "parent"
    let addedAt: String
    let user: FamilyMemberUser
}

struct FamilyMemberUser: Codable {
    let id: String
    let email: String
    let fullName: String?
    let role: String
}

struct ParentFamilyData: Codable, Identifiable {
    var id: String { familyId }
    let familyId: String
    let familyCode: String
    let familyName: String
    let codeGeneratedAt: String
}
```

### Data Origin

- **Source:** Supabase tables `family_units`, `family_members`, `users`
- **Refresh:** On page load + after mutations
- **Caching:** No (always fetch fresh data)
- **Mutations:** Create family, join family, regenerate code, remove member

---

## 4. API Integration

### Endpoints Used

#### Endpoint 1: Fetch Family Code (Player)

```
Supabase Direct Query:
SELECT id, family_code, family_name, code_generated_at
FROM family_units
WHERE player_user_id = :userId
LIMIT 1

Response: Single FamilyUnit record or null
```

#### Endpoint 2: Fetch Parent Families (Parent)

```
Supabase Direct Query:
SELECT family_unit_id, family_units!inner(id, family_code, family_name, code_generated_at)
FROM family_members
WHERE user_id = :userId AND role = 'parent'

Response: Array of membership records with joined family data
```

#### Endpoint 3: Fetch Family Members (Player)

```
GET /api/family/members

Response:
{
  "members": [
    {
      "id": "uuid",
      "family_unit_id": "uuid",
      "user_id": "uuid",
      "role": "parent",
      "added_at": "ISO timestamp",
      "users": { "id": "uuid", "email": "str", "full_name": "str", "role": "str" }
    }
  ]
}
```

#### Endpoint 4: Create Family (Player Only)

```
POST /api/family/create

Response:
{
  "success": true,
  "familyCode": "FAM-XXXXXX",
  "familyId": "uuid",
  "familyName": "string"
}
```

#### Endpoint 5: Join Family by Code (Parent Only)

```
POST /api/family/code/join

Body:
{ "familyCode": "FAM-XXXXXX" }

Response:
{ "message": "Successfully joined family" }

Error Codes:
- 400: Invalid request / already a member
- 404: Code not found
- 429: Rate limited (5 min cooldown)
```

#### Endpoint 6: Regenerate Code (Player Only)

```
POST /api/family/code/regenerate

Body:
{ "familyId": "uuid" }

Response:
{ "familyCode": "FAM-XXXXXX" }
```

#### Endpoint 7: Remove Family Member (Player Only)

```
DELETE /api/family/members/:memberId

Response:
{ "success": true }
```

### Authentication

- **Method:** Supabase Auth Token (Bearer in header)
- **Token Storage:** iOS Keychain
- All endpoints require authentication
- Role checks enforced server-side (player-only for create/regenerate/remove)

---

## 5. State Management

### Page-Level State

```swift
// Player state
@State var familyCode: String? = nil
@State var familyId: String? = nil
@State var familyName: String? = nil
@State var codeGeneratedAt: String? = nil
@State var familyMembers: [FamilyMember] = []

// Parent state
@State var parentFamilies: [ParentFamilyData] = []
@State var codeInput: String = ""

// Shared state
@State var isLoading = false
@State var loadingMembers = false
@State var error: String? = nil
@State var successMessage: String? = nil
```

### Shared State (Cross-Page)

- **User role:** Determines which view to show (player vs parent)
- **Active family context:** Updated when parent joins a new family (affects family switcher)

---

## 6. UI/UX Details

### Layout Structure — Player View

```
[Navigation Bar]
  - Title: "Family Management"
  - Back button → Settings

[Family Code Card]
  - Large code display: "FAM-XXXXXX" (monospace, prominent)
  - Generated date: "Created [date]"
  - Action buttons:
    - "Copy Code" (clipboard icon)
    - "Share" (share icon → iOS share sheet)
    - "Regenerate" (refresh icon, destructive secondary style)

[Family Members Section]
  - Section header: "Family Members (N)"
  - List of member cards:
    - Avatar/initials circle
    - Full name (or email if no name)
    - Role badge ("Parent")
    - Added date
    - Swipe-to-delete or trailing "Remove" button
  - Empty state: "No family members yet. Share your code!"
```

### Layout Structure — Parent View

```
[Navigation Bar]
  - Title: "Family Management"
  - Back button → Settings

[Join Family Card]
  - Heading: "Join a Family"
  - Description: "Enter a family code shared by a player"
  - Text input: Placeholder "FAM-XXXXXX" (auto-uppercase, max 10 chars)
  - "Join Family" button (primary CTA)

[My Families Section]
  - Section header: "My Families (N)"
  - List of family cards:
    - Family name
    - Code (monospace, small text)
    - "Joined" badge (green)
  - Empty state: "No families joined yet. Ask a player for their code."
```

### Interactive Elements

#### Family Code Display

- Code text: Large, monospace, selectable
- Copy button: Copies to UIPasteboard, shows brief checkmark animation
- Share button: Opens UIActivityViewController with code text
- Regenerate: Requires confirmation alert before proceeding

#### Code Input (Parent)

- Auto-formats to uppercase
- Validates format client-side (FAM- prefix + 6 alphanumeric)
- Submit button disabled until valid format
- Shows inline error below input on failure

### Loading States

```
First Load:
- Skeleton placeholder for code card
- Skeleton rows for member list

Mutations (Join/Remove/Regenerate):
- Button shows spinner, disabled during operation
- Success: Green banner, auto-dismiss after 3s
- Error: Red banner, persists until dismissed

Empty State (Parent, no families):
- Icon + "No families joined yet"
- Subtext: "Ask a player to share their family code"
```

### Accessibility

- Family code: `.accessibilityLabel("Family code: F A M dash [characters]")`
- Copy button: `.accessibilityLabel("Copy family code to clipboard")`
- Member cards: `.accessibilityLabel("[Name], [Role], joined [date]")`
- Code input: `.accessibilityLabel("Enter family code")`
- All touch targets: 44pt minimum

---

## 7. Dependencies

### Frameworks Required

- SwiftUI (iOS 15+)
- Supabase iOS Client (auth + data queries)
- UniformTypeIdentifiers (for clipboard/share)

### iOS-Specific Features

- `UIPasteboard.general` for code copying
- `UIActivityViewController` for code sharing
- Haptic feedback on copy success

---

## 8. Error Handling & Edge Cases

### Network Errors

- **Timeout:** Show "Connection timed out" + retry button
- **No internet:** Show offline indicator, disable mutations
- **Server error (5xx):** Show "Server error" + retry button

### Data Errors

- **No family exists (player):** Auto-create family on first load
- **Code format invalid (parent):** Inline validation before submit
- **Already a member:** Show "Already a member" message, no action needed

### Edge Cases

- Player with no family_units record: Create on first access
- Parent trying to join same family twice: Server returns 400 "already a member"
- Rate limiting on join: Show cooldown message with retry timer
- Code regeneration: Old code stops working immediately; warn in confirmation
- Very long family names: Truncate with ellipsis
- Multiple families (parent): Show all in scrollable list

---

## 9. Testing Checklist

### Happy Path Tests

- [ ] Player sees their family code on load
- [ ] Player can copy code to clipboard
- [ ] Player can share code via share sheet
- [ ] Player can regenerate code (old code invalidated)
- [ ] Player sees family members list with correct data
- [ ] Player can remove a family member
- [ ] Parent can enter code and join family
- [ ] Parent sees joined families after successful join
- [ ] Role-based views display correctly

### Error Tests

- [ ] Handle network timeout gracefully
- [ ] Handle 401 (redirect to login)
- [ ] Handle 404 (code not found) with clear message
- [ ] Handle 429 (rate limit) with cooldown message
- [ ] Handle 400 (already member) gracefully
- [ ] Handle empty family members list

### Edge Case Tests

- [ ] Auto-create family for player without one
- [ ] Code input auto-uppercases
- [ ] Code input validates format before submission
- [ ] Regeneration confirmation prevents accidental regeneration
- [ ] Remove member confirmation prevents accidental removal
- [ ] VoiceOver works on all elements
- [ ] Page adapts to different device sizes

### Performance Tests

- [ ] Page loads in <2 seconds on 4G
- [ ] Member list scrolls smoothly
- [ ] No memory leaks when navigating away

---

## 10. Known Limitations & Gotchas

### From Web Implementation

- Family code format is `FAM-` + 6 uppercase alphanumeric characters (regex: `^FAM-[A-Z0-9]{6}$`)
- Rate limiting on join: 429 after too many attempts
- Only players can create families, regenerate codes, and remove members
- Only parents can join families

### iOS-Specific Considerations

- `UIPasteboard.general.string` for clipboard (may show iOS paste permission prompt)
- Share sheet via `UIActivityViewController` wrapped in `UIViewControllerRepresentable`
- Consider haptic feedback (`.notification(.success)`) on successful copy/join/remove

---

## 11. Links & References

### Web Implementation

- **Page file:** `/pages/settings/family-management.vue`
- **Composables:** `useFamilyCode`, `useFamilyInvite`, `useFamilyContext`
- **Components:** `FamilyCodeDisplay`, `FamilyCodeInput`, `FamilyMemberCard`
- **API endpoints:** `/api/family/create`, `/api/family/code/join`, `/api/family/code/regenerate`, `/api/family/members/[id]`
- **Database:** `family_units`, `family_members`, `family_code_usage_log`
- **Migration:** `023_add_family_codes.sql`

---

## 12. Sign-Off

**Specification reviewed by:** Chris Andrikanich
**Web implementation verified:** February 8, 2026
**Ready for iOS implementation:** ✅ Yes
**Notes:** The family code system is simpler than the original email invite workflow. The web app now uses codes as the primary join mechanism. The `useFamilyInvite` composable (email-based) still exists but is secondary to `useFamilyCode`.
