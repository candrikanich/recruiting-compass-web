# iOS User Profile Page — Handoff Spec

**Date:** 2026-03-08
**Target:** iOS Claude implementing in SwiftUI
**Web reference:** `pages/settings/profile.vue` (already shipped to `develop`)
**iOS project root:** `/Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios/TheRecruitingCompass/TheRecruitingCompass/`

---

## What This Is

A new **My Profile** screen in Settings that lets all users manage their identity (name, phone, DOB for athletes, email, password, profile photo) and their account (data deletion). Athletes additionally see a bridge card to their Athlete Profile (PlayerDetailsView).

This mirrors the web's `/settings/profile` page exactly in scope. The iOS implementation should follow existing app patterns: `@Observable @MainActor` ViewModels, protocol-based services, Supabase Swift SDK, `PhotosUI` for photo picker.

---

## Mental Model

- **My Profile** → Who you are as an account holder (name, email, photo, password, account)
- **Athlete Profile** → Recruiting data (positions, stats, academics) — existing `PlayerDetailsView`

Do **not** conflate these. The new screen is identity only.

---

## Navigation Entry Point

**File to modify:** `Features/Settings/Views/SettingsView.swift`

Add a new `NavigationLink` **at the top of the "Profile & Player Info" section**, before the existing Home Location row:

```swift
NavigationLink {
    UserProfileView()
} label: {
    SettingsRow(
        icon: "person.crop.circle.fill",
        title: "My Profile",
        description: "Photo, name, email, password, and account settings",
        color: .blue
    )
}
```

Also rename the section header:
```swift
// Before:
Text("Profile & Player Info")
// After:
Text("Account & Profile")
```

---

## Files to Create

```
Features/
└── UserProfile/
    ├── Models/
    │   └── UserProfileUpdatePayload.swift
    ├── Services/
    │   ├── UserProfileManaging.swift      (protocol)
    │   └── UserProfileServiceImpl.swift
    ├── ViewModels/
    │   └── UserProfileViewModel.swift
    └── Views/
        ├── UserProfileView.swift          (main screen)
        ├── Sections/
        │   ├── ProfilePhotoSection.swift
        │   ├── PersonalInfoSection.swift
        │   ├── EmailSection.swift
        │   ├── PasswordSection.swift
        │   ├── AthleteProfileSection.swift
        │   └── DataPrivacySection.swift
```

---

## Data Model

### UserProfileUpdatePayload.swift

```swift
struct UserProfileUpdatePayload: Encodable {
    var fullName: String?
    var phone: String?
    var dateOfBirth: String?    // ISO date string "YYYY-MM-DD" or nil

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case phone
        case dateOfBirth = "date_of_birth"
    }
}
```

---

## Service Layer

### UserProfileManaging.swift (protocol)

```swift
protocol UserProfileManaging: Sendable {
    func updateProfile(_ payload: UserProfileUpdatePayload) async throws
    func updateEmail(newEmail: String) async throws
    func updatePassword(currentPassword: String, newPassword: String) async throws
    func uploadProfilePhoto(_ imageData: Data) async throws -> URL
    func deleteProfilePhoto() async throws
    func requestAccountDeletion() async throws
    func cancelAccountDeletion() async throws
    func fetchDeletionStatus() async throws -> Date?   // nil = not pending
}
```

### UserProfileServiceImpl.swift

**updateProfile** — PATCH to `users` table:
```swift
func updateProfile(_ payload: UserProfileUpdatePayload) async throws {
    try await supabaseManager.client
        .from("users")
        .update(payload)
        .eq("id", value: userId)
        .execute()
}
```

**updateEmail** — Supabase auth update (triggers verification email automatically):
```swift
func updateEmail(newEmail: String) async throws {
    try await supabaseManager.client.auth.update(
        user: UserAttributes(email: newEmail)
    )
}
```

**updatePassword** — Verify current password first by re-signing in, then update:
```swift
func updatePassword(currentPassword: String, newPassword: String) async throws {
    // Step 1: Verify current password
    guard let email = currentUserEmail else {
        throw UserProfileError.notAuthenticated
    }
    _ = try await supabaseManager.client.auth.signIn(
        email: email,
        password: currentPassword
    )
    // Step 2: Update
    try await supabaseManager.client.auth.update(
        user: UserAttributes(password: newPassword)
    )
}
```

**uploadProfilePhoto** — Supabase Storage:
```swift
func uploadProfilePhoto(_ imageData: Data) async throws -> URL {
    let path = "\(userId)/profile-\(Date().timeIntervalSince1970).jpg"
    try await supabaseManager.client.storage
        .from("profile-photos")
        .upload(path, data: imageData, options: FileOptions(contentType: "image/jpeg"))
    let response = try supabaseManager.client.storage
        .from("profile-photos")
        .getPublicURL(path: path)
    // Update users table
    try await supabaseManager.client
        .from("users")
        .update(["profile_photo_url": response.absoluteString])
        .eq("id", value: userId)
        .execute()
    return response
}
```

**requestAccountDeletion / cancelAccountDeletion / fetchDeletionStatus** — Direct `users` table update:
```swift
func requestAccountDeletion() async throws {
    try await supabaseManager.client
        .from("users")
        .update(["deletion_requested_at": ISO8601DateFormatter().string(from: Date())])
        .eq("id", value: userId)
        .execute()
}

func cancelAccountDeletion() async throws {
    try await supabaseManager.client
        .from("users")
        .update(["deletion_requested_at": nil as String?])
        .eq("id", value: userId)
        .execute()
}

func fetchDeletionStatus() async throws -> Date? {
    struct Row: Decodable { let deletionRequestedAt: String?
        enum CodingKeys: String, CodingKey { case deletionRequestedAt = "deletion_requested_at" }
    }
    let row: Row = try await supabaseManager.client
        .from("users")
        .select("deletion_requested_at")
        .eq("id", value: userId)
        .single()
        .execute()
        .value
    guard let raw = row.deletionRequestedAt else { return nil }
    return ISO8601DateFormatter().date(from: raw)
}
```

---

## ViewModel

### UserProfileViewModel.swift

```swift
@Observable
@MainActor
final class UserProfileViewModel {
    // MARK: - State
    var fullName: String = ""
    var phone: String = ""
    var dateOfBirth: Date? = nil
    var profilePhotoURL: URL? = nil

    // Personal info
    var personalInfoSaveStatus: SaveStatus = .idle

    // Email
    var showEmailForm = false
    var newEmail: String = ""
    var emailCurrentPassword: String = ""
    var emailChangePending = false
    var emailSaveStatus: SaveStatus = .idle

    // Password
    var currentPassword: String = ""
    var newPassword: String = ""
    var confirmPassword: String = ""
    var passwordSaveStatus: SaveStatus = .idle

    // Photo
    var isUploadingPhoto = false
    var photoError: String? = nil

    // Account deletion
    var deletionPendingDate: Date? = nil
    var showDeleteConfirm = false
    var deletionStatus: SaveStatus = .idle

    var isLoading = false
    var errorMessage: String? = nil

    // MARK: - Computed
    var isAthlete: Bool { authManager.user?.role == .player }

    var passwordsMatch: Bool {
        !newPassword.isEmpty && newPassword == confirmPassword
    }

    var deletionScheduledDate: Date? {
        deletionPendingDate.map { Calendar.current.date(byAdding: .day, value: 30, to: $0)! }
    }

    // MARK: - Dependencies
    private let service: any UserProfileManaging
    private let authManager: any AuthManaging

    init(
        service: (any UserProfileManaging)? = nil,
        authManager: (any AuthManaging)? = nil
    ) {
        self.authManager = authManager ?? AuthManager.shared
        self.service = service ?? UserProfileServiceImpl(supabaseManager: .shared,
                                                         authManager: AuthManager.shared)
    }

    // MARK: - Load

    func loadFromCurrentUser() {
        guard let user = authManager.user else { return }
        fullName = user.fullName ?? ""
        phone = user.phone ?? ""
        if let dob = user.dateOfBirth {
            dateOfBirth = ISO8601DateFormatter().date(from: dob)
        }
        if let urlStr = user.profilePhotoUrl, let url = URL(string: urlStr) {
            profilePhotoURL = url
        }
    }

    func loadDeletionStatus() async {
        deletionPendingDate = try? await service.fetchDeletionStatus()
    }

    // MARK: - Actions

    func savePersonalInfo() async {
        personalInfoSaveStatus = .saving
        let payload = UserProfileUpdatePayload(
            fullName: fullName.isEmpty ? nil : fullName,
            phone: phone.isEmpty ? nil : phone,
            dateOfBirth: isAthlete ? formatDate(dateOfBirth) : nil
        )
        do {
            try await service.updateProfile(payload)
            // Update local user state
            authManager.updateUserFields(fullName: fullName, phone: phone,
                                         dateOfBirth: formatDate(dateOfBirth))
            personalInfoSaveStatus = .saved
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            personalInfoSaveStatus = .idle
        } catch {
            personalInfoSaveStatus = .error(message: "Failed to save. Please try again.")
        }
    }

    func changeEmail() async {
        emailSaveStatus = .saving
        do {
            try await service.updateEmail(newEmail: newEmail)
            emailChangePending = true
            showEmailForm = false
            newEmail = ""
            emailCurrentPassword = ""
            emailSaveStatus = .idle
        } catch {
            let msg = isWrongPasswordError(error) ? "Current password is incorrect." : "Failed to update email."
            emailSaveStatus = .error(message: msg)
        }
    }

    func changePassword() async {
        guard passwordsMatch else { return }
        passwordSaveStatus = .saving
        do {
            try await service.updatePassword(currentPassword: currentPassword, newPassword: newPassword)
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            passwordSaveStatus = .saved
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            passwordSaveStatus = .idle
        } catch {
            let msg = isWrongPasswordError(error) ? "Current password is incorrect." : "Failed to change password."
            passwordSaveStatus = .error(message: msg)
        }
    }

    func uploadPhoto(_ imageData: Data) async {
        isUploadingPhoto = true
        photoError = nil
        do {
            let url = try await service.uploadProfilePhoto(imageData)
            profilePhotoURL = url
        } catch {
            photoError = "Failed to upload photo. Please try again."
        }
        isUploadingPhoto = false
    }

    func requestDeletion() async {
        deletionStatus = .saving
        do {
            try await service.requestAccountDeletion()
            deletionPendingDate = Date()
            showDeleteConfirm = false
            deletionStatus = .idle
        } catch {
            deletionStatus = .error(message: "Failed to request deletion. Please try again.")
        }
    }

    func cancelDeletion() async {
        deletionStatus = .saving
        do {
            try await service.cancelAccountDeletion()
            deletionPendingDate = nil
            deletionStatus = .idle
        } catch {
            deletionStatus = .error(message: "Failed to cancel deletion. Please try again.")
        }
    }

    // MARK: - Helpers

    private func formatDate(_ date: Date?) -> String? {
        guard let date else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f.string(from: date)
    }

    private func isWrongPasswordError(_ error: Error) -> Bool {
        error.localizedDescription.lowercased().contains("invalid") ||
        error.localizedDescription.lowercased().contains("credentials")
    }

    nonisolated deinit {}
}
```

**Note:** `authManager.updateUserFields(...)` requires a new method on `AuthManaging`/`AuthManager` — see "AuthManager changes" below.

---

## AuthManager Changes

Add one method to `AuthManaging` protocol and `AuthManager`:

```swift
// In AuthManaging protocol:
func updateUserFields(fullName: String, phone: String, dateOfBirth: String?)

// In AuthManager:
func updateUserFields(fullName: String, phone: String, dateOfBirth: String?) {
    guard var updatedUser = user else { return }
    // User is a struct — create new value
    user = User(
        id: updatedUser.id,
        email: updatedUser.email,
        emailConfirmedAt: updatedUser.emailConfirmedAt,
        phone: phone.isEmpty ? nil : phone,
        fullName: fullName,
        createdAt: updatedUser.createdAt,
        updatedAt: ISO8601DateFormatter().string(from: Date()),
        role: updatedUser.role,
        dateOfBirth: dateOfBirth
    )
}
```

Also add `profilePhotoUrl: String?` to the `User` struct if not present:
```swift
// In Core/Models/User.swift — add field:
let profilePhotoUrl: String?

// In CodingKeys:
case profilePhotoUrl = "profile_photo_url"
```

---

## View Structure

### UserProfileView.swift

```swift
struct UserProfileView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: UserProfileViewModel

    init(service: (any UserProfileManaging)? = nil) {
        _viewModel = State(initialValue: UserProfileViewModel(service: service))
    }

    var body: some View {
        List {
            ProfilePhotoSection(viewModel: viewModel)
            PersonalInfoSection(viewModel: viewModel)
            EmailSection(viewModel: viewModel)
            PasswordSection(viewModel: viewModel)
            if viewModel.isAthlete {
                AthleteProfileSection()
            }
            DataPrivacySection(viewModel: viewModel)
        }
        .navigationTitle("My Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            viewModel.loadFromCurrentUser()
            await viewModel.loadDeletionStatus()
        }
    }
}
```

---

## Section Specs

### ProfilePhotoSection

- Shows current photo (async image from `profilePhotoURL`) or initials avatar fallback
- "Change Photo" button triggers `PhotosPicker(selection:matching:.images)`
- On selection: compress to JPEG max 800×800, call `viewModel.uploadPhoto(_:)`
- Shows progress indicator during upload
- Shows `photoError` inline if upload fails
- "Remove Photo" option when photo exists (calls `service.deleteProfilePhoto()`)

```swift
// Initials fallback (no SF Symbol — generate from name):
let initials = viewModel.fullName
    .split(separator: " ")
    .compactMap { $0.first }
    .prefix(2)
    .map(String.init)
    .joined()
```

### PersonalInfoSection

- **Full Name** — `TextField("Your full name", text: $viewModel.fullName)`
- **Phone** — `TextField("555-555-5555", text: $viewModel.phone).keyboardType(.phonePad)`
- **Date of Birth** — `DatePicker` with `.datePickerStyle(.compact)` — **athletes only** (`viewModel.isAthlete`)
  - Reasonable range: `..<Calendar.current.date(byAdding: .year, value: -10, to: Date())!`
- Save button triggers `viewModel.savePersonalInfo()`
- Show SaveStatus feedback inline (checkmark on `.saved`, red text on `.error`)

### EmailSection

- Display current email from `authManager.user?.email` (read-only label)
- If `viewModel.emailChangePending`: show info banner — "Verification email sent. Check your inbox to confirm the change."
- "Change Email" button → expands inline form (same section, no new sheet):
  - New email `TextField`
  - Current password `SecureField` (for re-auth)
  - "Update Email" button → `viewModel.changeEmail()`
  - "Cancel" button collapses form
- 401 error → show "Current password is incorrect." inline

### PasswordSection

- Three `SecureField` inputs: current, new, confirm
- `PasswordStrengthIndicator` component (already exists at `Features/Auth/Components/PasswordStrengthIndicator.swift`) — reuse it for new password
- Client-side mismatch guard: disable submit button if passwords don't match, show "Passwords do not match" inline
- "Change Password" → `viewModel.changePassword()`
- 401 error → show "Current password is incorrect." inline

### AthleteProfileSection (athletes only)

```swift
struct AthleteProfileSection: View {
    var body: some View {
        Section {
            NavigationLink {
                PlayerDetailsView(
                    preferenceService: PreferenceServiceImpl(supabaseManager: .shared),
                    userRole: .player
                )
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "trophy.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .background(Color.green)
                        .cornerRadius(8)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Athlete Profile")
                            .font(.body.weight(.medium))
                        Text("Positions, stats, academics, and social handles for recruiting")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
        } header: {
            Text("Recruiting")
        }
    }
}
```

### DataPrivacySection

Three states — mirror the web's three-state deletion flow:

**State 1 — idle:**
```
Section header: "Data & Privacy"
Button: "Request Account Deletion" (destructive style)
  → sets viewModel.showDeleteConfirm = true
```

**State 2 — confirm (sheet or inline confirm):**
```
Alert/confirmation sheet:
Title: "Delete Account?"
Message: "All your schools, coaches, interactions, and notes will be deleted. Your account will be permanently deleted after 30 days. You may cancel within the 30-day window."
Buttons: "Yes, delete my account" (destructive) / "Cancel"
```

**State 3 — pending:**
```
Warning banner: "Your account is scheduled for deletion on [date 30 days from request]."
Button: "Cancel Deletion Request"
```

Use a SwiftUI `.confirmationDialog` or `.alert` for the confirm step.

---

## Error Handling

| Scenario | UX |
|---|---|
| Wrong current password | Inline field error in that section, no alert |
| Email already in use | Inline error in EmailSection |
| Photo upload failure | Inline error below photo, no alert |
| Network error on save | Inline per-section error |
| Account deletion failure | Inline error in DataPrivacySection |

Use `SaveStatus` enum pattern (already used in app — see `PlayerDetailsViewModel`):
```swift
enum SaveStatus: Equatable {
    case idle
    case saving
    case saved
    case error(message: String)
}
```

---

## SaveStatus exists?

Check if `SaveStatus` is already defined project-wide. If not, define it in `Shared/Models/SaveStatus.swift`.

---

## Photo Compression

Compress before upload:
```swift
import UIKit
func compress(_ image: UIImage, maxDimension: CGFloat = 800) -> Data? {
    let scale = maxDimension / max(image.size.width, image.size.height)
    let newSize = scale < 1
        ? CGSize(width: image.size.width * scale, height: image.size.height * scale)
        : image.size
    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.jpegData(withCompressionQuality: 0.8) { ctx in
        image.draw(in: CGRect(origin: .zero, size: newSize))
    }
}
```

---

## Supabase Storage Note

The `profile-photos` bucket already exists and is configured in the web app. Storage path pattern: `{userId}/profile-{timestamp}.jpg` — use the same pattern on iOS for consistency.

---

## Testing Requirements

Write unit tests for `UserProfileViewModel`:
- `savePersonalInfo()` — calls service with correct payload, updates AuthManager, sets `.saved` status
- `changePassword()` — delegates to service, clears fields on success, sets 401-specific error message
- `changeEmail()` — sets `emailChangePending = true` on success, correct error on 401
- `requestDeletion()` — sets `deletionPendingDate` on success
- `cancelDeletion()` — clears `deletionPendingDate` on success
- DOB not included in payload for parents (`isAthlete == false`)

Follow the existing mock pattern used in `ResetPasswordViewModelTests.swift` and `LoginViewModelTests.swift`.

---

## What NOT to Build

- Do not add social media links (those live in PlayerDetailsView)
- Do not add notification preferences (those live in NotificationPreferencesView)
- Do not build a profile completeness score (that's athlete-profile-specific)
- No "Export my data" feature (not in web version's current scope either)
- Do not redesign SettingsView — only add the new row at the top of the existing section

---

## Checklist Before Marking Done

- [ ] `UserProfileView` accessible from Settings → "My Profile" row
- [ ] Personal info saves to `users` table
- [ ] DOB field hidden for parents, shown for athletes
- [ ] Email change sends verification email and shows banner
- [ ] Password change verifies current password, shows 401 error inline
- [ ] Profile photo upload/remove works (Supabase Storage `profile-photos` bucket)
- [ ] Athlete bridge card links to existing `PlayerDetailsView`
- [ ] Account deletion: request → confirm → 30-day pending → cancel all work
- [ ] Existing tests pass (`xcodebuild test`)
- [ ] New ViewModel tests pass
- [ ] No SwiftUI modifier hallucinations — only use APIs verified in existing codebase
