# iOS Family Unit Symmetric Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the iOS app to match the symmetric family unit redesign shipped in the web app — either role can create a family, and email invite links (`/join?token=`) are handled natively.

**Architecture:** The web API endpoints and DB schema are already live. iOS calls them using the existing `URLSession` + `SupabaseConfig.apiBaseURL` pattern (same as `DashboardServiceImpl`). New `InviteJoinView` handles universal links intercepted from `https://recruiting-compass.com/join?token=...`.

**Tech Stack:** SwiftUI, Swift Concurrency (`async/await`), Supabase Swift SDK, XCTest

---

## Infrastructure Already Done (Web App)

These are **complete** — iOS only needs to call them:

| Endpoint | Method | What it does |
|----------|--------|--------------|
| `/api/family/invite` | POST | Sends email invite, creates `family_invitations` row |
| `/api/family/invite/:token` | GET | Public lookup — returns invite details (uses service role) |
| `/api/family/invite/:token/accept` | POST | Accepts invite, inserts into `family_members` |
| `/api/family/invitations` | GET | Lists pending invitations for current user's family |
| `/api/family/invitations/:id` | DELETE | Revokes a pending invitation |
| `/api/family/code/join` | POST | Joins family by code (Nitro route, replaces edge function) |
| `/api/family/player-details` | POST | Stores parent-entered player pre-fill data |

DB schema already migrated: `player_user_id` dropped, `created_by_user_id` added, `family_invitations` table created.

---

## iOS Files to Change/Create

**iOS project root (for all paths below):**
`/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass/TheRecruitingCompass/`

**Test root:**
`/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass/TheRecruitingCompassTests/`

---

## Task 1: Fix `FamilyUnit` model — `playerUserId` → `createdByUserId`

**Files:**
- Modify: `Features/Family/Models/FamilyUnit.swift`
- Modify: `TheRecruitingCompassTests/Features/Family/ViewModels/FamilyManagementViewModelTests.swift` (helper method)

The column `player_user_id` was dropped from the DB. The iOS model still decodes it and will crash or return nil on every fetch.

**Step 1: Write the failing test**

In `FamilyManagementViewModelTests.swift`, update the `makeFamilyUnit` helper:

```swift
private func makeFamilyUnit(
    id: String = "family-1",
    createdByUserId: String = "user-1",  // was: playerUserId
    familyCode: String = "FAM-ABC123",
    familyName: String = "Test Family",
    codeGeneratedAt: String = "2024-01-01T00:00:00Z"
) -> FamilyUnit {
    FamilyUnit(
        id: id,
        createdByUserId: createdByUserId,  // was: playerUserId
        familyName: familyName,
        familyCode: familyCode,
        codeGeneratedAt: codeGeneratedAt,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        homeLatitude: nil,
        homeLongitude: nil
    )
}
```

**Step 2: Run tests to confirm compilation failure**

Build the test target. Expected: compile errors about `playerUserId` not existing.

**Step 3: Update `FamilyUnit.swift`**

```swift
import Foundation

struct FamilyUnit: Codable, Identifiable, Sendable {
    let id: String
    let createdByUserId: String           // was: playerUserId
    let familyName: String?
    let familyCode: String?
    let codeGeneratedAt: String?
    let createdAt: String?
    let updatedAt: String?
    let homeLatitude: Double?
    let homeLongitude: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case createdByUserId = "created_by_user_id"  // was: "player_user_id"
        case familyName = "family_name"
        case familyCode = "family_code"
        case codeGeneratedAt = "code_generated_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case homeLatitude = "home_latitude"
        case homeLongitude = "home_longitude"
    }
}
```

**Step 4: Fix compilation errors in tests and code that referenced `playerUserId`**

Search for `playerUserId` across the project:
```bash
grep -r "playerUserId\|player_user_id" \
  /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios \
  --include="*.swift"
```

Update each reference. The mock's `lastPlayerUserIdFetched` → `lastUserIdFetched` (or remove).

**Step 5: Run tests**

```bash
xcodebuild test \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | grep -E "PASS|FAIL|error:"
```

Expected: all existing tests pass.

**Step 6: Commit**

```bash
git -C /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios \
  add -A && git commit -m "fix(family): replace playerUserId with createdByUserId in FamilyUnit model"
```

---

## Task 2: Fix `FamilyServiceImpl` — broken schema queries

**Files:**
- Modify: `Features/Family/Services/FamilyServiceImpl.swift`
- Modify: `Features/Family/Services/FamilyManaging.swift`
- Modify: `TheRecruitingCompassTests/Mocks/MockFamilyManager.swift`
- Modify: `Features/Family/ViewModels/FamilyManagementViewModel.swift`

Two methods write/query the old `player_user_id` column which no longer exists:
1. `getFamilyUnit(forPlayerUserId:)` — queries `player_user_id`
2. `createFamily()` — inserts `player_user_id`

Also: `createFamily()` always inserts the member with `role: "player"`, but now parents can also create families.

**Step 1: Write the failing test**

In `FamilyManagementViewModelTests.swift`, add:

```swift
func test_loadData_asParent_withNoFamily_createsFamily() async {
    // GIVEN a parent with no existing family
    mockAuthManager.stubbedUser = makeUser(id: "parent-1", role: .parent)
    mockFamilyService.stubbedFamilyUnit = nil

    // WHEN loading data
    await sut.loadData()

    // THEN createFamily was called
    XCTAssertEqual(mockFamilyService.createFamilyCallCount, 1)
    // AND the captured role was .parent
    XCTAssertEqual(mockFamilyService.lastCreatedFamilyRole, UserRole.parent)
}
```

**Step 2: Run test to confirm failure**

Expected: compile error — `lastCreatedFamilyRole` doesn't exist on mock, `createFamily()` has no role parameter.

**Step 3: Update `FamilyManaging.swift` protocol**

```swift
import Foundation

protocol FamilyManaging: Sendable {
    func fetchFamilyMembers(familyUnitId: String) async throws -> [FamilyMember]
    func getCurrentMember(userId: String) async throws -> FamilyMember?
    // Renamed: queries via family_members.user_id (works for all roles)
    func getFamilyUnit(forUserId userId: String) async throws -> FamilyUnit?

    // Player + Parent
    func createFamily(role: UserRole) async throws -> CreateFamilyResponse
    func regenerateCode(familyId: String) async throws -> RegenerateFamilyCodeResponse
    func removeFamilyMember(memberId: String) async throws

    // Parent
    func joinFamilyWithCode(familyCode: String) async throws
    func getParentFamilies() async throws -> [ParentFamilyData]
}
```

**Step 4: Update `FamilyServiceImpl.swift` — fix the two broken methods**

Replace `getFamilyUnit(forPlayerUserId:)`:

```swift
func getFamilyUnit(forUserId userId: String) async throws -> FamilyUnit? {
    // Look up via family_members (works for all roles — players and parents)
    struct MemberRow: Codable {
        let familyUnitId: String
        enum CodingKeys: String, CodingKey {
            case familyUnitId = "family_unit_id"
        }
    }
    let rows: [MemberRow] = try await supabaseManager.client
        .from("family_members")
        .select("family_unit_id")
        .eq("user_id", value: userId)
        .limit(1)
        .execute()
        .value

    guard let row = rows.first else { return nil }

    let units: [FamilyUnit] = try await supabaseManager.client
        .from("family_units")
        .select()
        .eq("id", value: row.familyUnitId)
        .limit(1)
        .execute()
        .value

    return units.first
}
```

Update `createFamily(role:)`:

```swift
func createFamily(role: UserRole) async throws -> CreateFamilyResponse {
    let userId = try await supabaseManager.client.auth.session.user.id.uuidString

    // Idempotent: return existing family if present
    if let existing = try await getFamilyUnit(forUserId: userId),
       let code = existing.familyCode {
        return CreateFamilyResponse(
            success: true,
            familyCode: code,
            familyId: existing.id,
            familyName: existing.familyName
        )
    }

    let familyId = UUID().uuidString
    let memberId = UUID().uuidString
    let now = ISO8601DateFormatter().string(from: Date())
    let familyCode = "FAM-" + String((0..<6).map { _ in
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".randomElement()!
    })

    struct FamilyUnitInsert: Encodable {
        let id: String
        let createdByUserId: String
        let familyCode: String
        let codeGeneratedAt: String
        let createdAt: String
        let updatedAt: String

        enum CodingKeys: String, CodingKey {
            case id
            case createdByUserId = "created_by_user_id"
            case familyCode = "family_code"
            case codeGeneratedAt = "code_generated_at"
            case createdAt = "created_at"
            case updatedAt = "updated_at"
        }
    }

    struct FamilyMemberInsert: Encodable {
        let id: String
        let userId: String
        let familyUnitId: String
        let role: String
        let addedAt: String

        enum CodingKeys: String, CodingKey {
            case id
            case userId = "user_id"
            case familyUnitId = "family_unit_id"
            case role
            case addedAt = "added_at"
        }
    }

    try await supabaseManager.client
        .from("family_units")
        .insert(FamilyUnitInsert(
            id: familyId,
            createdByUserId: userId,
            familyCode: familyCode,
            codeGeneratedAt: now,
            createdAt: now,
            updatedAt: now
        ))
        .execute()

    try await supabaseManager.client
        .from("family_members")
        .insert(FamilyMemberInsert(
            id: memberId,
            userId: userId,
            familyUnitId: familyId,
            role: role.rawValue,
            addedAt: now
        ))
        .execute()

    logger.info("Family created: familyId=\(familyId), role=\(role.rawValue)")
    return CreateFamilyResponse(
        success: true,
        familyCode: familyCode,
        familyId: familyId,
        familyName: nil
    )
}
```

**Step 5: Update `FamilyManagementViewModel`**

Replace `getFamilyUnit(forPlayerUserId:)` callsite:

```swift
// In loadPlayerData()
if let familyUnit = try await familyService.getFamilyUnit(forUserId: userId) {
    // ...
} else {
    await createFamily()
}

// In createFamily() action
func createFamily() async {
    // ...
    let role = isPlayer ? UserRole.player : UserRole.parent
    let response = try await familyService.createFamily(role: role)
    // ...
}
```

**Step 6: Update `MockFamilyService`**

```swift
var lastCreatedFamilyRole: UserRole?

func getFamilyUnit(forUserId userId: String) async throws -> FamilyUnit? {
    getFamilyUnitCallCount += 1
    lastUserIdFetched = userId
    if !shouldSucceed { throw mockError }
    return stubbedFamilyUnit
}

func createFamily(role: UserRole) async throws -> CreateFamilyResponse {
    createFamilyCallCount += 1
    lastCreatedFamilyRole = role
    if !shouldSucceed { throw mockError }
    return mockCreateFamilyResponse
}
```

Also add `lastCreatedFamilyRole = nil` to `reset()`.

**Step 7: Run tests**

Expected: all tests pass, including the new one.

**Step 8: Commit**

```bash
git commit -m "fix(family): fix schema queries and createFamily signature for symmetric redesign"
```

---

## Task 3: Add `FamilyInvitation` model

**Files:**
- Create: `Features/Family/Models/FamilyInvitation.swift`

**Step 1: Create the file**

```swift
import Foundation

struct FamilyInvitation: Codable, Identifiable, Sendable {
    let id: String
    let familyUnitId: String
    let invitedBy: String
    let invitedEmail: String
    let role: String
    let token: String
    let status: String
    let expiresAt: String
    let createdAt: String
    let acceptedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case familyUnitId = "family_unit_id"
        case invitedBy = "invited_by"
        case invitedEmail = "invited_email"
        case role
        case token
        case status
        case expiresAt = "expires_at"
        case createdAt = "created_at"
        case acceptedAt = "accepted_at"
    }

    var isPending: Bool { status == "pending" }
    var isExpired: Bool {
        guard let date = ISO8601DateFormatter().date(from: expiresAt) else { return false }
        return date < Date()
    }
}

/// Response from GET /api/family/invite/:token (public endpoint)
struct InviteDetails: Codable, Sendable {
    let invitationId: String
    let email: String
    let role: String
    let familyName: String
    let inviterName: String
}

/// Errors from the invite join flow
enum InviteError: Error, LocalizedError {
    case expired
    case alreadyAccepted
    case notFound
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .expired:       return "This invite link has expired. Ask the sender to resend."
        case .alreadyAccepted: return "You're already connected to this family."
        case .notFound:      return "This invite link is invalid or has already been used."
        case .serverError(let msg): return msg
        }
    }
}
```

**Step 2: Build to confirm no errors**

```bash
xcodebuild build \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | grep -E "error:|BUILD"
```

Expected: `BUILD SUCCEEDED`

**Step 3: Commit**

```bash
git commit -m "feat(family): add FamilyInvitation and InviteDetails models"
```

---

## Task 4: Add invite methods to `FamilyManaging` + implement in `FamilyServiceImpl`

**Files:**
- Modify: `Features/Family/Services/FamilyManaging.swift`
- Modify: `Features/Family/Services/FamilyServiceImpl.swift`

Some operations go through the Nitro API (email sending, token lookup, token acceptance); simple CRUD goes direct to Supabase.

**Step 1: Extend the protocol**

Add to `FamilyManaging.swift`:

```swift
// Invite operations (email-based)
func sendEmailInvite(email: String, role: String, familyUnitId: String) async throws
func fetchPendingInvitations(familyUnitId: String) async throws -> [FamilyInvitation]
func revokeInvitation(id: String) async throws
func lookupInviteByToken(_ token: String) async throws -> InviteDetails
func acceptInvite(token: String) async throws
```

**Step 2: Write tests for new methods on the ViewModel (drives the mock)**

In `FamilyManagementViewModelTests.swift`:

```swift
func test_sendEmailInvite_success_showsToast() async {
    mockAuthManager.stubbedUser = makeUser(id: "player-1", role: .player)
    sut.familyId = "family-1"
    sut.inviteEmail = "parent@example.com"

    await sut.sendEmailInvite()

    XCTAssertEqual(mockFamilyService.sendEmailInviteCallCount, 1)
    XCTAssertEqual(mockFamilyService.lastInviteEmail, "parent@example.com")
    XCTAssertTrue(sut.showSuccessToast)
    XCTAssertEqual(sut.inviteEmail, "")  // cleared after send
}

func test_sendEmailInvite_failure_showsError() async {
    mockAuthManager.stubbedUser = makeUser(id: "player-1", role: .player)
    mockFamilyService.shouldSucceed = false
    sut.familyId = "family-1"
    sut.inviteEmail = "parent@example.com"

    await sut.sendEmailInvite()

    XCTAssertNotNil(sut.errorMessage)
}

func test_loadData_loadsInvitations() async {
    mockAuthManager.stubbedUser = makeUser(id: "player-1", role: .player)
    let invite = FamilyInvitation(
        id: "inv-1", familyUnitId: "family-1", invitedBy: "player-1",
        invitedEmail: "parent@example.com", role: "parent",
        token: "tok-abc", status: "pending",
        expiresAt: "2030-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z", acceptedAt: nil
    )
    mockFamilyService.stubbedFamilyUnit = makeFamilyUnit()
    mockFamilyService.stubbedPendingInvitations = [invite]

    await sut.loadData()

    XCTAssertEqual(sut.pendingInvitations.count, 1)
}

func test_revokeInvitation_removesFromList() async {
    let invite = FamilyInvitation(
        id: "inv-1", familyUnitId: "family-1", invitedBy: "player-1",
        invitedEmail: "parent@example.com", role: "parent",
        token: "tok-abc", status: "pending",
        expiresAt: "2030-01-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z", acceptedAt: nil
    )
    sut.pendingInvitations = [invite]

    await sut.revokeInvitation(invite)

    XCTAssertEqual(mockFamilyService.revokeInvitationCallCount, 1)
    XCTAssertTrue(sut.pendingInvitations.isEmpty)
}
```

**Step 3: Run tests — confirm failures** (compile errors on missing mock stubs)

**Step 4: Implement in `FamilyServiceImpl.swift`**

Add these methods. They follow the same pattern as `DashboardServiceImpl.fetchSuggestions`:

```swift
// MARK: - Invite Methods

func sendEmailInvite(email: String, role: String, familyUnitId: String) async throws {
    guard let baseURL = SupabaseConfig.apiBaseURL else {
        throw FamilyError.serverError("API base URL not configured")
    }
    let token = try await supabaseManager.client.auth.session.accessToken

    struct Body: Encodable {
        let email: String
        let role: String
        let familyUnitId: String
        enum CodingKeys: String, CodingKey {
            case email, role
            case familyUnitId = "familyUnitId"
        }
    }

    var request = URLRequest(url: baseURL.appendingPathComponent("api/family/invite"))
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(Body(email: email, role: role, familyUnitId: familyUnitId))

    let (_, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
        throw FamilyError.serverError("Failed to send invite")
    }
}

func fetchPendingInvitations(familyUnitId: String) async throws -> [FamilyInvitation] {
    // Direct Supabase — RLS allows family members to read their family's invitations
    let invitations: [FamilyInvitation] = try await supabaseManager.client
        .from("family_invitations")
        .select()
        .eq("family_unit_id", value: familyUnitId)
        .eq("status", value: "pending")
        .order("created_at", ascending: false)
        .execute()
        .value
    return invitations
}

func revokeInvitation(id: String) async throws {
    // Direct Supabase — RLS allows invited_by user to delete
    try await supabaseManager.client
        .from("family_invitations")
        .delete()
        .eq("id", value: id)
        .execute()
}

func lookupInviteByToken(_ token: String) async throws -> InviteDetails {
    // Public endpoint — no auth header needed
    guard let baseURL = SupabaseConfig.apiBaseURL else {
        throw FamilyError.serverError("API base URL not configured")
    }

    let url = baseURL.appendingPathComponent("api/family/invite/\(token)")
    let (data, response) = try await URLSession.shared.data(from: url)

    guard let http = response as? HTTPURLResponse else {
        throw FamilyError.serverError("Invalid response")
    }
    switch http.statusCode {
    case 200:
        return try JSONDecoder().decode(InviteDetails.self, from: data)
    case 404:
        throw InviteError.notFound
    case 409:
        throw InviteError.alreadyAccepted
    case 410:
        throw InviteError.expired
    default:
        throw FamilyError.serverError("Unexpected status \(http.statusCode)")
    }
}

func acceptInvite(token: String) async throws {
    guard let baseURL = SupabaseConfig.apiBaseURL else {
        throw FamilyError.serverError("API base URL not configured")
    }
    let accessToken = try await supabaseManager.client.auth.session.accessToken

    var request = URLRequest(
        url: baseURL.appendingPathComponent("api/family/invite/\(token)/accept")
    )
    request.httpMethod = "POST"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = Data("{}".utf8)

    let (_, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        throw FamilyError.serverError("Failed to accept invite")
    }
}
```

**Step 5: Update `MockFamilyService`**

```swift
var sendEmailInviteCallCount = 0
var revokeInvitationCallCount = 0
var lookupInviteCallCount = 0
var acceptInviteCallCount = 0

var lastInviteEmail: String?
var lastRevokedInvitationId: String?
var lastLookedUpToken: String?
var lastAcceptedToken: String?

var stubbedPendingInvitations: [FamilyInvitation] = []
var stubbedInviteDetails = InviteDetails(
    invitationId: "inv-1",
    email: "invited@example.com",
    role: "parent",
    familyName: "Test Family",
    inviterName: "Test Player"
)

func sendEmailInvite(email: String, role: String, familyUnitId: String) async throws {
    sendEmailInviteCallCount += 1
    lastInviteEmail = email
    if !shouldSucceed { throw mockError }
}

func fetchPendingInvitations(familyUnitId: String) async throws -> [FamilyInvitation] {
    if !shouldSucceed { throw mockError }
    return stubbedPendingInvitations
}

func revokeInvitation(id: String) async throws {
    revokeInvitationCallCount += 1
    lastRevokedInvitationId = id
    if !shouldSucceed { throw mockError }
}

func lookupInviteByToken(_ token: String) async throws -> InviteDetails {
    lookupInviteCallCount += 1
    lastLookedUpToken = token
    if !shouldSucceed { throw mockError }
    return stubbedInviteDetails
}

func acceptInvite(token: String) async throws {
    acceptInviteCallCount += 1
    lastAcceptedToken = token
    if !shouldSucceed { throw mockError }
}
```

Add all new `= 0` / `= nil` resets to `reset()`.

**Step 6: Update `FamilyManagementViewModel` to add invite state/actions**

```swift
// Add to MARK: - Player State
var pendingInvitations: [FamilyInvitation] = []
var inviteEmail: String = ""
var isEmailInviteValid: Bool {
    let trimmed = inviteEmail.trimmingCharacters(in: .whitespaces)
    return trimmed.contains("@") && trimmed.contains(".")
}

// In loadPlayerData(), after loading family members:
if let id = familyId {
    await loadPendingInvitations(familyUnitId: id)
}

// Add new actions:
private func loadPendingInvitations(familyUnitId: String) async {
    do {
        pendingInvitations = try await familyService.fetchPendingInvitations(
            familyUnitId: familyUnitId
        )
    } catch {
        logger.error("Failed to load pending invitations: \(error.localizedDescription)")
    }
}

func sendEmailInvite() async {
    guard let familyId = familyId, isEmailInviteValid else {
        errorMessage = "Please enter a valid email address"
        return
    }

    let email = inviteEmail.trimmingCharacters(in: .whitespaces)
    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
        // Player invites parent; parent invites player
        let inviteRole = isPlayer ? "parent" : "player"
        try await familyService.sendEmailInvite(
            email: email, role: inviteRole, familyUnitId: familyId
        )
        inviteEmail = ""
        await loadPendingInvitations(familyUnitId: familyId)
        showSuccess("Invite sent to \(email)!")
    } catch {
        logger.error("Failed to send invite: \(error.localizedDescription)")
        errorMessage = "Failed to send invite. Please try again."
    }
}

func revokeInvitation(_ invitation: FamilyInvitation) async {
    isLoading = true
    defer { isLoading = false }

    do {
        try await familyService.revokeInvitation(id: invitation.id)
        pendingInvitations.removeAll { $0.id == invitation.id }
        showSuccess("Invite revoked.")
    } catch {
        errorMessage = "Failed to revoke invite. Please try again."
    }
}
```

**Step 7: Run all tests**

Expected: all pass, including the 4 new ones.

**Step 8: Commit**

```bash
git commit -m "feat(family): add email invite methods to FamilyManaging and FamilyManagementViewModel"
```

---

## Task 5: Migrate `joinFamilyWithCode` from Edge Function to Nitro API

**Files:**
- Modify: `Features/Family/Services/FamilyServiceImpl.swift`

The current implementation calls Supabase Edge Function `family-code-join`. The web app uses Nitro API route `POST /api/family/code/join`. Migrating ensures iOS uses the same business logic and removes the Edge Function dependency.

**Step 1: Write the test**

In `FamilyManagementViewModelTests.swift`:

```swift
func test_joinFamily_callsServiceWithCode() async {
    mockAuthManager.stubbedUser = makeUser(id: "parent-1", role: .parent)
    sut.codeInput = "FAM-ABC123"

    await sut.joinFamily()

    XCTAssertEqual(mockFamilyService.joinFamilyWithCodeCallCount, 1)
    XCTAssertEqual(mockFamilyService.lastFamilyCodeJoined, "FAM-ABC123")
    XCTAssertTrue(sut.showSuccessToast)
}
```

**Step 2: Run the test — confirm it passes** (mock already stubs this, so it should pass now; this is a regression guard)

**Step 3: Update the implementation in `FamilyServiceImpl`**

Replace the Supabase edge function call with a Nitro API call:

```swift
func joinFamilyWithCode(familyCode: String) async throws {
    guard let baseURL = SupabaseConfig.apiBaseURL else {
        // Fallback: edge function (for local dev without API_BASE_URL)
        struct JoinBody: Encodable { let familyCode: String }
        struct JoinResponse: Codable { let message: String }
        let _: JoinResponse = try await supabaseManager.client.functions
            .invoke("family-code-join",
                    options: FunctionInvokeOptions(body: JoinBody(familyCode: familyCode)))
        return
    }

    let token = try await supabaseManager.client.auth.session.accessToken

    struct Body: Encodable {
        let familyCode: String
        enum CodingKeys: String, CodingKey { case familyCode }
    }

    var request = URLRequest(
        url: baseURL.appendingPathComponent("api/family/code/join")
    )
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(Body(familyCode: familyCode))

    let (_, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        throw FamilyError.serverError("Failed to join family")
    }
}
```

**Step 4: Run all tests. Confirm pass.**

**Step 5: Commit**

```bash
git commit -m "feat(family): migrate joinFamilyWithCode from Edge Function to Nitro API"
```

---

## Task 6: Update `DeepLinkHandler` for universal links

**Files:**
- Modify: `Core/Utilities/DeepLinkHandler.swift`
- Modify: `TheRecruitingCompassApp.swift`

When a user taps a `/join?token=...` link, iOS intercepts it as a universal link. `onOpenURL` fires with `https://recruiting-compass.com/join?token=abc123`. The current handler rejects non-custom-scheme URLs.

**Step 1: Write the test**

Create `TheRecruitingCompassTests/Core/Utilities/DeepLinkHandlerTests.swift`:

```swift
import XCTest
@testable import TheRecruitingCompass

final class DeepLinkHandlerTests: XCTestCase {

    func test_parse_joinInviteUniversalLink() {
        let url = URL(string: "https://recruiting-compass.com/join?token=abc123")!
        let route = DeepLinkHandler.parse(url)
        XCTAssertEqual(route, .joinInvite(token: "abc123"))
    }

    func test_parse_joinInviteLocalhost() {
        let url = URL(string: "http://localhost:3003/join?token=test-tok")!
        let route = DeepLinkHandler.parse(url)
        XCTAssertEqual(route, .joinInvite(token: "test-tok"))
    }

    func test_parse_joinInviteMissingToken() {
        let url = URL(string: "https://recruiting-compass.com/join")!
        let route = DeepLinkHandler.parse(url)
        XCTAssertEqual(route, .unknown)
    }

    func test_parse_resetPassword_customScheme() {
        let url = URL(string: "recruiting-compass://reset-password?token=reset-tok")!
        let route = DeepLinkHandler.parse(url)
        XCTAssertEqual(route, .resetPassword(token: "reset-tok"))
    }

    func test_parse_unknown_returnsUnknown() {
        let url = URL(string: "https://example.com/other")!
        XCTAssertEqual(DeepLinkHandler.parse(url), .unknown)
    }
}
```

**Step 2: Run tests — confirm failures** (`joinInvite` case doesn't exist yet)

**Step 3: Update `DeepLinkHandler.swift`**

```swift
import Foundation

enum DeepLinkRoute: Equatable {
    case resetPassword(token: String)
    case joinInvite(token: String)
    case unknown
}

enum DeepLinkHandler {
    static let scheme = "recruiting-compass"
    static let universalLinkHosts: Set<String> = [
        "recruiting-compass.com",
        "www.recruiting-compass.com",
        // Also match Vercel preview URLs:
        "localhost",
        "127.0.0.1"
    ]

    static func parse(_ url: URL) -> DeepLinkRoute {
        // Custom scheme: recruiting-compass://reset-password?token=...
        if url.scheme == scheme {
            guard url.host == "reset-password",
                  let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
                  !token.isEmpty else { return .unknown }
            return .resetPassword(token: token)
        }

        // Universal links: https://recruiting-compass.com/join?token=...
        guard url.scheme == "http" || url.scheme == "https",
              let host = url.host,
              universalLinkHosts.contains(host) else { return .unknown }

        guard url.path == "/join",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
              !token.isEmpty else { return .unknown }

        return .joinInvite(token: token)
    }
}
```

**Step 4: Run tests — confirm all pass.**

**Step 5: Commit**

```bash
git commit -m "feat(deeplink): add joinInvite route for universal links from /join?token="
```

---

## Task 7: Create `InviteJoinViewModel`

**Files:**
- Create: `Features/Family/ViewModels/InviteJoinViewModel.swift`
- Create: `TheRecruitingCompassTests/Features/Family/ViewModels/InviteJoinViewModelTests.swift`

**Step 1: Write the tests first**

```swift
import XCTest
@testable import TheRecruitingCompass

@MainActor
final class InviteJoinViewModelTests: XCTestCase {

    private var sut: InviteJoinViewModel!
    private var mockFamilyService: MockFamilyService!
    private var mockAuthManager: MockAuthManager!

    override func setUp() async throws {
        mockFamilyService = MockFamilyService()
        mockAuthManager = MockAuthManager()
        sut = InviteJoinViewModel(
            token: "test-token",
            familyService: mockFamilyService,
            authManager: mockAuthManager
        )
    }

    override func tearDown() async throws {
        sut = nil
        mockFamilyService = nil
        mockAuthManager = nil
    }

    func test_loadInvite_success_storesDetails() async {
        await sut.loadInvite()

        XCTAssertEqual(sut.state, .loaded(mockFamilyService.stubbedInviteDetails))
        XCTAssertEqual(mockFamilyService.lookupInviteCallCount, 1)
    }

    func test_loadInvite_notFound_setsErrorState() async {
        mockFamilyService.shouldSucceed = false
        mockFamilyService.mockError = InviteError.notFound

        await sut.loadInvite()

        XCTAssertEqual(sut.state, .error(.notFound))
    }

    func test_loadInvite_expired_setsExpiredState() async {
        mockFamilyService.shouldSucceed = false
        mockFamilyService.mockError = InviteError.expired

        await sut.loadInvite()

        XCTAssertEqual(sut.state, .error(.expired))
    }

    func test_accept_authenticated_callsAcceptInvite() async {
        mockAuthManager.stubbedIsAuthenticated = true
        sut.state = .loaded(mockFamilyService.stubbedInviteDetails)

        await sut.accept()

        XCTAssertEqual(mockFamilyService.acceptInviteCallCount, 1)
        XCTAssertEqual(mockFamilyService.lastAcceptedToken, "test-token")
        XCTAssertTrue(sut.navigateToDashboard)
    }

    func test_accept_notAuthenticated_loginFirst() async {
        mockAuthManager.stubbedIsAuthenticated = false
        mockAuthManager.stubbedLoginSuccess = true
        sut.loginEmail = "user@example.com"
        sut.loginPassword = "Password123!"
        sut.state = .loaded(mockFamilyService.stubbedInviteDetails)

        await sut.accept()

        XCTAssertEqual(mockAuthManager.loginCallCount, 1)
        XCTAssertEqual(mockFamilyService.acceptInviteCallCount, 1)
        XCTAssertTrue(sut.navigateToDashboard)
    }

    func test_accept_loginFails_showsError() async {
        mockAuthManager.stubbedIsAuthenticated = false
        mockAuthManager.stubbedLoginSuccess = false
        sut.loginEmail = "user@example.com"
        sut.loginPassword = "wrongpass"
        sut.state = .loaded(mockFamilyService.stubbedInviteDetails)

        await sut.accept()

        XCTAssertNotNil(sut.errorMessage)
        XCTAssertFalse(sut.navigateToDashboard)
    }
}
```

You'll need to add `stubbedIsAuthenticated`, `stubbedLoginSuccess`, and `loginCallCount` to `MockAuthManager`. Check the existing `MockAuthManager.swift` and add missing stubs.

**Step 2: Run tests — confirm failures** (ViewModel doesn't exist yet)

**Step 3: Create `InviteJoinViewModel.swift`**

```swift
import Foundation
import Observation
import OSLog

private let logger = Logger(
    subsystem: "com.chrisandrikanich.TheRecruitingCompass",
    category: "InviteJoinViewModel"
)

enum InviteJoinState: Equatable {
    case loading
    case loaded(InviteDetails)
    case error(InviteError)
}

@Observable
@MainActor
final class InviteJoinViewModel {
    var state: InviteJoinState = .loading
    var isAccepting = false
    var navigateToDashboard = false
    var errorMessage: String?

    // Login form fields (unauthenticated path)
    var loginEmail: String = ""
    var loginPassword: String = ""

    private let token: String
    private let familyService: any FamilyManaging
    private let authManager: any AuthManaging

    var isAuthenticated: Bool { authManager.isAuthenticated }

    var inviteDetails: InviteDetails? {
        if case .loaded(let d) = state { return d }
        return nil
    }

    init(
        token: String,
        familyService: (any FamilyManaging)? = nil,
        authManager: (any AuthManaging)? = nil
    ) {
        self.token = token
        self.familyService = familyService ?? FamilyServiceImpl(supabaseManager: .shared)
        self.authManager = authManager ?? AuthManager.shared
    }

    func loadInvite() async {
        state = .loading
        do {
            let details = try await familyService.lookupInviteByToken(token)
            state = .loaded(details)
        } catch let err as InviteError {
            state = .error(err)
        } catch {
            logger.error("lookupInviteByToken: \(error.localizedDescription)")
            state = .error(.serverError(error.localizedDescription))
        }
    }

    func accept() async {
        errorMessage = nil
        isAccepting = true
        defer { isAccepting = false }

        do {
            if !authManager.isAuthenticated {
                try await authManager.login(
                    email: loginEmail,
                    password: loginPassword
                )
            }
            try await familyService.acceptInvite(token: token)
            navigateToDashboard = true
        } catch let err as InviteError {
            errorMessage = err.errorDescription
        } catch {
            logger.error("acceptInvite: \(error.localizedDescription)")
            errorMessage = "Failed to connect to family. Please try again."
        }
    }

    nonisolated deinit {}
}
```

> **Note:** `authManager.login(email:password:)` — check `AuthManaging` protocol to confirm the method name. It may be `signIn` or `login`. Use whatever the protocol declares.

**Step 4: Run tests — all pass.**

**Step 5: Commit**

```bash
git commit -m "feat(family): add InviteJoinViewModel for /join token flow"
```

---

## Task 8: Create `InviteJoinView`

**Files:**
- Create: `Features/Family/Views/InviteJoinView.swift`

Mirrors web `pages/join.vue`. All states: loading, expired, already accepted, not found, and valid invite (authenticated and unauthenticated paths).

**Step 1: Create `InviteJoinView.swift`**

```swift
import SwiftUI

struct InviteJoinView: View {
    @State var viewModel: InviteJoinViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.state {
                case .loading:
                    loadingView
                case .error(let err):
                    errorView(err)
                case .loaded(let invite):
                    inviteView(invite)
                }
            }
            .navigationTitle("Join Family")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .task { await viewModel.loadInvite() }
        .onChange(of: viewModel.navigateToDashboard) { _, navigates in
            if navigates { dismiss() }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading invite...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error States

    @ViewBuilder
    private func errorView(_ error: InviteError) -> some View {
        VStack(spacing: 16) {
            Image(systemName: iconForError(error))
                .font(.system(size: 48))
                .foregroundStyle(colorForError(error))
                .accessibilityHidden(true)

            Text(titleForError(error))
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)

            Text(error.errorDescription ?? "")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            if error == .alreadyAccepted {
                Button("Go to Dashboard") { dismiss() }
                    .buttonStyle(.borderedProminent)
                    .padding(.top, 8)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func iconForError(_ error: InviteError) -> String {
        switch error {
        case .expired:         return "clock.badge.xmark"
        case .alreadyAccepted: return "checkmark.circle"
        case .notFound:        return "link.badge.plus"
        case .serverError:     return "exclamationmark.triangle"
        }
    }

    private func colorForError(_ error: InviteError) -> Color {
        switch error {
        case .alreadyAccepted: return .green
        default:               return .orange
        }
    }

    private func titleForError(_ error: InviteError) -> String {
        switch error {
        case .expired:         return "This invite has expired"
        case .alreadyAccepted: return "Already connected"
        case .notFound:        return "Invite not found"
        case .serverError:     return "Something went wrong"
        }
    }

    // MARK: - Valid Invite

    @ViewBuilder
    private func inviteView(_ invite: InviteDetails) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Heading
                VStack(spacing: 8) {
                    Text("You're invited to join")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("\(invite.familyName)'s recruiting journey")
                        .font(.title2.weight(.bold))
                        .multilineTextAlignment(.center)
                    Text("\(invite.inviterName) invited you as a \(invite.role).")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 16)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                if viewModel.isAuthenticated {
                    authenticatedConnectSection(invite: invite)
                } else {
                    unauthenticatedLoginSection(invite: invite)
                }
            }
            .padding(24)
        }
    }

    // Authenticated: just a "Connect" button
    private func authenticatedConnectSection(invite: InviteDetails) -> some View {
        VStack(spacing: 12) {
            Button {
                Task { await viewModel.accept() }
            } label: {
                Group {
                    if viewModel.isAccepting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Connect to \(invite.familyName)")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isAccepting)
        }
    }

    // Unauthenticated: login form + "Log in and connect"
    private func unauthenticatedLoginSection(invite: InviteDetails) -> some View {
        VStack(spacing: 16) {
            Text("Log in to connect, or create an account.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                TextField("Email", text: $viewModel.loginEmail)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)

                SecureField("Password", text: $viewModel.loginPassword)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.password)
            }

            Button {
                Task { await viewModel.accept() }
            } label: {
                Group {
                    if viewModel.isAccepting {
                        ProgressView().tint(.white)
                    } else {
                        Text("Log in and connect")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isAccepting)
        }
    }
}
```

**Step 2: Build only (no unit tests for View layer)**

```bash
xcodebuild build \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | grep -E "error:|BUILD"
```

Expected: `BUILD SUCCEEDED`

**Step 3: Commit**

```bash
git commit -m "feat(family): add InviteJoinView for /join universal link handling"
```

---

## Task 9: Wire `InviteJoinView` into `TheRecruitingCompassApp`

**Files:**
- Modify: `TheRecruitingCompassApp.swift`

**Step 1: Update `TheRecruitingCompassApp.swift`**

```swift
// Add state variable
@State private var pendingInviteToken: String?

// Replace handleDeepLink
private func handleDeepLink(_ url: URL) {
    let route = DeepLinkHandler.parse(url)
    switch route {
    case .resetPassword:
        showResetPassword = true
    case .joinInvite(let token):
        pendingInviteToken = token
    case .unknown:
        break
    }
}

// Add sheet presentation after the reset password sheet:
.sheet(item: $pendingInviteToken) { token in
    InviteJoinView(
        viewModel: InviteJoinViewModel(token: token)
    )
}
```

> `item: $pendingInviteToken` requires `String` to conform to `Identifiable`. Either use `.sheet(isPresented:)` with a separate Bool, OR wrap the token in a small struct, OR use the `Identifiable` conformance: `extension String: @retroactive Identifiable { public var id: String { self } }` — check project conventions first. A `IdentifiedString` wrapper struct is cleaner if retroactive conformances are avoided.

**Preferred approach (no retroactive conformance):**

```swift
struct PendingInvite: Identifiable {
    let id: String  // = token
}

@State private var pendingInvite: PendingInvite?

// In handleDeepLink:
case .joinInvite(let token):
    pendingInvite = PendingInvite(id: token)

// Sheet:
.sheet(item: $pendingInvite) { pending in
    InviteJoinView(viewModel: InviteJoinViewModel(token: pending.id))
}
```

**Step 2: Build and confirm no errors.**

**Step 3: Commit**

```bash
git commit -m "feat(deeplink): wire InviteJoinView into app for /join universal links"
```

---

## Task 10: Update `FamilyManagementPlayerView` — invite section + pending list

**Files:**
- Modify: `Features/Family/Views/FamilyManagementPlayerView.swift`

Add two new UI sections for player's family management:
1. **Invite by email** — text field + "Send Invite" button
2. **Pending invitations** — list of sent invites with revoke buttons

**Step 1: Add the invite section to `FamilyManagementPlayerView`**

In `var body`, add to the `VStack`:

```swift
ScrollView {
    VStack(spacing: FamilyConstants.Spacing.large) {
        familyCodeCard
        inviteByEmailCard     // NEW
        pendingInvitationsSection  // NEW
        familyMembersSection
    }
    // ...
}
```

**Add the invite card:**

```swift
private var inviteByEmailCard: some View {
    VStack(alignment: .leading, spacing: FamilyConstants.Spacing.medium) {
        Text("Invite Parent by Email")
            .font(.headline)

        Text("They'll receive a link to join your family.")
            .font(.subheadline)
            .foregroundColor(.secondary)

        HStack(spacing: FamilyConstants.Spacing.small) {
            TextField("parent@example.com", text: $viewModel.inviteEmail)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .accessibilityLabel("Parent email address")

            Button {
                Task { await viewModel.sendEmailInvite() }
            } label: {
                if viewModel.isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text("Send")
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(viewModel.isEmailInviteValid ? Color.blue : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(8)
            .disabled(!viewModel.isEmailInviteValid || viewModel.isLoading)
            .accessibilityLabel("Send invite")
            .accessibilityHint(viewModel.isEmailInviteValid
                ? "Send email invite to the entered address"
                : "Enter a valid email to enable")
        }
    }
    .padding(FamilyConstants.Spacing.medium)
    .background(Color(.systemBackground))
    .cornerRadius(12)
    .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
}
```

**Add the pending invitations section:**

```swift
@ViewBuilder
private var pendingInvitationsSection: some View {
    if !viewModel.pendingInvitations.isEmpty {
        VStack(spacing: FamilyConstants.Spacing.medium) {
            HStack {
                Text("Pending Invitations")
                    .font(.headline)
                Spacer()
                Text("\(viewModel.pendingInvitations.count)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            ForEach(viewModel.pendingInvitations) { invite in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(invite.invitedEmail)
                            .font(.subheadline.weight(.medium))
                        Text("Expires \(formattedExpiry(invite.expiresAt))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Revoke") {
                        Task { await viewModel.revokeInvitation(invite) }
                    }
                    .font(.caption)
                    .foregroundColor(.red)
                    .buttonStyle(.bordered)
                    .tint(.red)
                    .accessibilityLabel("Revoke invite to \(invite.invitedEmail)")
                }
                .padding(.vertical, 4)
            }
        }
        .padding(FamilyConstants.Spacing.medium)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

private func formattedExpiry(_ isoString: String) -> String {
    guard let date = ISO8601DateFormatter().date(from: isoString) else { return "unknown" }
    return DateFormatter.familyCodeDate.string(from: date)
}
```

**Step 2: Build to confirm no errors.**

**Step 3: Commit**

```bash
git commit -m "feat(family): add invite-by-email and pending invitations sections to player view"
```

---

## Task 11: Remove `requiresFamilyCode` from parent signup

**Files:**
- Modify: `Core/Models/UserRole.swift`
- Modify: `Features/Auth/ViewModels/SignupViewModel.swift` (remove familyCode field from validation)

Parents no longer enter a family code during signup. They join post-signup via invite link or code in Family Management.

**Step 1: Write the test**

In a new `SignupViewModelTests.swift` (or add to existing):

```swift
func test_parentSignup_doesNotRequireFamilyCode() {
    sut.selectedRole = .parent
    sut.fullName = "Jane Parent"
    sut.email = "jane@example.com"
    sut.password = "StrongPass123!"
    sut.confirmPassword = "StrongPass123!"
    sut.termsAccepted = true
    // No familyCode set

    XCTAssertTrue(sut.isFormValid)
}
```

**Step 2: Run test — confirm it passes** (family code is already optional for parents). If it fails, the `requiresFamilyCode` check is blocking.

**Step 3: Update `UserRole.swift`**

```swift
var requiresFamilyCode: Bool {
    false  // was: self == .parent
}
```

This causes the `familyCodeField` view to never render (it's already conditional on `requiresFamilyCode == true`).

**Step 4: Remove the `familyCode` from signup's Supabase metadata** in `SupabaseManager.signUp()`

The `family_code` in auth metadata was used to auto-join a family on signup. With the redesign, this should not happen. Remove the metadata injection:

In `SupabaseManager.swift`, remove:
```swift
// DELETE THESE LINES:
if let familyCode = familyCode, !familyCode.trimmingCharacters(in: .whitespaces).isEmpty {
    metadata["family_code"] = .string(familyCode)
}
```

Also remove the `familyCode: String?` parameter from `signUp(email:password:fullName:role:familyCode:)` — OR keep the parameter but ignore it (safer for backward compat). Keeping and ignoring is lower risk.

**Step 5: Run all tests. Confirm pass.**

**Step 6: Commit**

```bash
git commit -m "feat(auth): remove requiresFamilyCode — parents join family post-signup"
```

---

## Task 12: Update onboarding step 5 — player invite parent

**Files:**
- Modify: `Features/Onboarding/Views/OnboardingView.swift`
- Modify: `Features/Onboarding/ViewModels/OnboardingViewModel.swift`

The web app's onboarding step 5 was updated from "You're All Set!" to show the family code AND an email invite option. Mirror this on iOS.

**Step 1: Update `OnboardingViewModel.swift`**

Add invite state to the ViewModel:

```swift
// Add to OnboardingViewModel:
var inviteEmail: String = ""
var isInviteSent = false
var isEmailInviteValid: Bool {
    let trimmed = inviteEmail.trimmingCharacters(in: .whitespaces)
    return trimmed.contains("@") && trimmed.contains(".")
}

private let familyService: any FamilyManaging

// In init, add:
self.familyService = familyService ?? FamilyServiceImpl(supabaseManager: .shared)

// Add the action:
func sendParentInvite() async {
    guard let userId = authManager.user?.id else { return }
    isLoading = true
    defer { isLoading = false }

    do {
        // Ensure family exists before sending invite
        if let family = try await familyService.getFamilyUnit(forUserId: userId) {
            try await familyService.sendEmailInvite(
                email: inviteEmail,
                role: "parent",
                familyUnitId: family.id
            )
            inviteEmail = ""
            isInviteSent = true
        } else {
            errorMessage = "Family not set up yet. Complete onboarding first."
        }
    } catch {
        errorMessage = "Failed to send invite. You can do this later from Settings."
    }
}
```

**Step 2: Update `OnboardingView.swift` — replace `completeStep`**

```swift
private var completeStep: some View {
    VStack(spacing: 24) {
        Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 56))
            .foregroundStyle(.green)
            .accessibilityHidden(true)

        Text("You're All Set!")
            .font(.title2.weight(.bold))

        Text("Invite a parent or guardian to follow your recruiting journey.")
            .font(.body)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)

        if viewModel.isInviteSent {
            Label("Invite sent!", systemImage: "checkmark.circle")
                .foregroundStyle(.green)
                .font(.subheadline.weight(.medium))
        } else {
            VStack(spacing: 12) {
                TextField("Parent's email", text: $viewModel.inviteEmail)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)

                Button {
                    Task { await viewModel.sendParentInvite() }
                } label: {
                    if viewModel.isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Send Invite")
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(viewModel.isEmailInviteValid ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
                .disabled(!viewModel.isEmailInviteValid || viewModel.isLoading)
            }
        }

        Button("Skip for now") {
            Task { await viewModel.nextScreen() }
        }
        .foregroundStyle(.secondary)
        .font(.subheadline)
    }
    .padding(.vertical, 32)
}
```

Also update the navigation buttons on step 5: the "Complete Onboarding" button should still work to proceed without sending an invite.

**Step 3: Build and verify the onboarding flow renders correctly in a simulator preview.**

**Step 4: Run tests.**

**Step 5: Commit**

```bash
git commit -m "feat(onboarding): update step 5 to invite parent by email"
```

---

## Task 13: Update existing tests for renamed/changed interfaces

**Files:**
- Modify: `TheRecruitingCompassTests/Features/Family/Services/FamilyServiceImplTests.swift`
- Modify: `TheRecruitingCompassTests/Features/Family/ViewModels/FamilyManagementViewModelTests.swift`
- Modify: `TheRecruitingCompassTests/Features/Settings/Accessibility/FamilyManagementAccessibilityTests.swift`

**Step 1: Run the full test suite to find failures**

```bash
xcodebuild test \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | grep -E "FAIL|error:"
```

**Step 2: Fix each failing test**

Common patterns to fix:
- `getFamilyUnit(forPlayerUserId:)` → `getFamilyUnit(forUserId:)`
- `createFamily()` → `createFamily(role:)` — pass `.player` or `.parent` as needed
- `makeFamilyUnit(playerUserId:)` → `makeFamilyUnit(createdByUserId:)`
- `lastPlayerUserIdFetched` → `lastUserIdFetched`
- Any `MockFamilyService` usage missing the new stub methods → add them

**Step 3: Run tests again. Confirm 0 failures.**

**Step 4: Commit**

```bash
git commit -m "test(family): update tests for renamed getFamilyUnit and createFamily(role:)"
```

---

## Task 14: Final verification

**Step 1: Run full test suite**

```bash
xcodebuild test \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | tail -20
```

Expected: all tests pass, 0 failures.

**Step 2: Build release**

```bash
xcodebuild build \
  -project TheRecruitingCompass.xcodeproj \
  -scheme TheRecruitingCompass \
  -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  2>&1 | grep -E "error:|BUILD"
```

Expected: `BUILD SUCCEEDED`

**Step 3: Manual smoke test checklist**

Run app in simulator. Verify:
- [ ] Player signup → onboarding → step 5 shows "Invite a parent" UI
- [ ] Player can enter email and tap "Send Invite" (will fail if `API_BASE_URL` env var not set; set it in Scheme env vars)
- [ ] Family Management → Player view shows "Invite Parent by Email" section
- [ ] Family Management → Player view shows pending invitations (if any exist)
- [ ] Simulate universal link: In simulator, open Safari, navigate to `http://localhost:3003/join?token=test-token` — app should intercept and show `InviteJoinView` (requires dev server running and universal link entitlement configured)
- [ ] Parent signup: no family code field shown
- [ ] Parent can join via code from Family Management settings

**Step 4: Final commit**

```bash
git commit -m "chore(ios): verify family unit symmetric redesign complete"
```

---

## Unresolved Questions

1. **`AuthManaging` login method name** — `InviteJoinViewModel.accept()` calls `authManager.login(email:password:)`. Verify the exact method signature on the `AuthManaging` protocol. It may be `signIn(email:password:)`.

2. **`API_BASE_URL` in Scheme env vars** — For the invite methods to work in DEBUG, `API_BASE_URL` must be set to the running dev server URL (e.g. `http://localhost:3003`). Confirm this is documented in the iOS project README or scheme configuration notes.

3. **Supabase Edge Function `family-code-join`** — Task 5 keeps the edge function as a fallback when `API_BASE_URL` is not set. If the edge function was removed from Supabase, remove the fallback too.

4. **`DateFormatter.familyCodeDate`** — Used in `FamilyManagementPlayerView` and `FamilyManagementViewModel`. Confirm this formatter exists in `FamilyUtilities.swift` or `FamilyConstants.swift`. If not, define it.

5. **OnboardingViewModel `familyService` dependency** — Adding `familyService` as a new dependency requires updating anywhere `OnboardingViewModel` is initialized (e.g., `OnboardingWrapperView`). Check for additional init sites.

6. **`MockAuthManager` stubs** — `InviteJoinViewModelTests` requires `stubbedIsAuthenticated`, `stubbedLoginSuccess`, and `loginCallCount`. Check existing `MockAuthManager.swift` and add missing properties if needed.
