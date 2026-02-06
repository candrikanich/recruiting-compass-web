# iOS Architecture: Mirroring Nuxt/Vue Structure

**Goal:** Establish iOS patterns that parallel your Nuxt web app, so both teams think in similar mental models.

---

## Web → iOS Architecture Mapping

### Nuxt Web Stack

```
Pages (file-based routing)
  ↓
Composables (business logic, fetch data)
  ↓
Pinia Stores (centralized state)
  ↓
Components (UI only)
  ↓
Supabase (API + Auth)
```

### iOS Equivalent Stack (Recommended)

```
Views (SwiftUI views, file-based organization)
  ↓
ViewModels (business logic, fetch data)
  ↓
AppState / Managers (centralized state, like Pinia)
  ↓
Components (reusable SwiftUI components)
  ↓
Supabase iOS SDK (API + Auth)
```

---

## File Structure Parallel

### Nuxt Web

```
/pages
  /coaches
    [id].vue         ← Coach detail route
    index.vue        ← Coaches list route
    new.vue          ← Add coach route
  /schools
    [id].vue
    index.vue
    new.vue
  dashboard.vue      ← Root dashboard
  login.vue
  signup.vue

/composables
  useCoaches.ts      ← Coaches business logic
  useSchools.ts
  useInteractions.ts
  useAuth.ts
  useSupabase.ts     ← Supabase client wrapper

/stores
  coachStore.ts      ← Centralized coach state
  schoolStore.ts
  authStore.ts

/components
  CoachCard.vue
  SchoolList.vue
  SearchBar.vue
```

### iOS Equivalent

```
/Views
  /Coaches
    CoachesList.swift        ← Equivalent to pages/coaches/index.vue
    CoachDetail.swift        ← Equivalent to pages/coaches/[id].vue
    AddCoach.swift           ← Equivalent to pages/coaches/new.vue
  /Schools
    SchoolsList.swift
    SchoolDetail.swift
    AddSchool.swift
  DashboardView.swift        ← Equivalent to pages/dashboard.vue
  LoginView.swift
  SignupView.swift

/ViewModels
  CoachesViewModel.swift     ← Equivalent to composables/useCoaches.ts
  SchoolsViewModel.swift
  InteractionsViewModel.swift
  AuthViewModel.swift
  SupabaseManager.swift      ← Equivalent to composables/useSupabase.ts

/Managers
  AuthManager.swift          ← Equivalent to authStore.ts
  CoachManager.swift         ← Equivalent to coachStore.ts
  SchoolManager.swift
  AppStateManager.swift      ← Global app state

/Components
  CoachCard.swift
  SchoolList.swift
  SearchBar.swift
```

---

## Key Concepts: Side-by-Side Comparison

### 1. Composition & Business Logic

**Nuxt (Composables)**

```typescript
export const useCoaches = () => {
  const coaches = ref<Coach[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchCoaches = async (schoolId?: string) => {
    loading.value = true;
    try {
      coaches.value = await $fetch("/api/coaches", {
        query: { schoolId },
      });
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  const addCoach = async (data: CreateCoachDTO) => {
    const created = await $fetch("/api/coaches", {
      method: "POST",
      body: data,
    });
    coaches.value.push(created);
    return created;
  };

  onMounted(() => fetchCoaches());

  return { coaches, loading, error, fetchCoaches, addCoach };
};
```

**iOS (ViewModel)**

```swift
@MainActor
class CoachesViewModel: ObservableObject {
  @Published var coaches: [Coach] = []
  @Published var isLoading = false
  @Published var error: String? = nil

  private let supabaseClient: SupabaseManager

  init(supabaseClient: SupabaseManager) {
    self.supabaseClient = supabaseClient
  }

  func fetchCoaches(schoolId: String? = nil) async {
    isLoading = true
    defer { isLoading = false }

    do {
      coaches = try await supabaseClient.getCoaches(schoolId: schoolId)
    } catch {
      self.error = error.localizedDescription
    }
  }

  func addCoach(_ data: CreateCoachDTO) async throws -> Coach {
    let created = try await supabaseClient.createCoach(data)
    coaches.append(created)
    return created
  }
}

// Usage in View
@StateObject var viewModel = CoachesViewModel(supabaseClient: SupabaseManager.shared)

.task {
  await viewModel.fetchCoaches()
}
```

**Pattern Match:**

- Composable `ref()` → ViewModel `@Published`
- Composable function → ViewModel method
- `onMounted()` hook → `.task()` or `.onAppear()`

---

### 2. Centralized State Management

**Nuxt (Pinia Store)**

```typescript
export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  const login = async (email: string, password: string) => {
    const { data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    user.value = data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    user.value = null;
  };

  return { user, isAuthenticated, login, logout };
});

// Usage
const authStore = useAuthStore();
await authStore.login(email, password);
```

**iOS (Manager/AppState)**

```swift
@MainActor
class AuthManager: ObservableObject {
  @Published var user: User? = nil
  var isAuthenticated: Bool { user != nil }

  private let supabaseClient: SupabaseClient

  static let shared = AuthManager()

  func login(email: String, password: String) async throws {
    let session = try await supabaseClient.auth.signIn(
      email: email,
      password: password
    )
    self.user = User(from: session.user)
  }

  func logout() async throws {
    try await supabaseClient.auth.signOut()
    self.user = nil
  }
}

// Usage
@EnvironmentObject var authManager: AuthManager

try await authManager.login(email: email, password: password)
```

**Pattern Match:**

- Pinia `defineStore()` → Manager class with `@Published` properties
- Pinia action → Manager method
- Component `useAuthStore()` → View `@EnvironmentObject var authManager`

---

### 3. Async Data Fetching

**Nuxt Pattern**

```typescript
// composables/useCoaches.ts
export const useCoaches = () => {
  const coaches = ref<Coach[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchCoaches = async () => {
    loading.value = true;
    error.value = null;
    try {
      coaches.value = await $fetch("/api/coaches");
    } catch (err) {
      error.value = "Failed to load coaches";
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchCoaches();
  });

  return { coaches, loading, error, fetchCoaches };
};

// pages/coaches/index.vue
const { coaches, loading, error, fetchCoaches } = useCoaches();
```

**iOS Pattern**

```swift
// ViewModels/CoachesViewModel.swift
@MainActor
class CoachesViewModel: ObservableObject {
  @Published var coaches: [Coach] = []
  @Published var isLoading = false
  @Published var error: String? = nil

  func fetchCoaches() async {
    isLoading = true
    error = nil
    defer { isLoading = false }

    do {
      coaches = try await supabaseClient.getCoaches()
    } catch {
      self.error = "Failed to load coaches"
    }
  }
}

// Views/CoachesList.swift
@StateObject var viewModel = CoachesViewModel()

var body: some View {
  List {
    ForEach(viewModel.coaches) { coach in
      CoachRow(coach: coach)
    }
  }
  .overlay {
    if viewModel.isLoading {
      ProgressView()
    }
  }
  .alert("Error", isPresented: .constant(viewModel.error != nil)) {
    Button("Retry") {
      Task { await viewModel.fetchCoaches() }
    }
  }
  .task {
    await viewModel.fetchCoaches()
  }
}
```

**Pattern Match:**

- `ref()` with `ref.value` assignment → `@Published` property with `self.` assignment
- `.finally { loading.value = false }` → `defer { isLoading = false }`
- `onMounted()` → `.task()`
- Template `v-if="loading"` → `.overlay()` or `.isLoading ? SomeView : nil`

---

### 4. Parent Preview Mode (Multi-User)

**Nuxt (Composables + Store)**

```typescript
// composables/useActiveFamily.ts
export const useActiveFamily = () => {
  const authStore = useAuthStore()
  const familyStore = useFamilyStore()

  const activeAthleteId = ref<string | null>(null)
  const isViewingAsParent = computed(() => {
    return authStore.user?.role === 'parent' && activeAthleteId.value
  })

  const switchAthlete = (athleteId: string) => {
    activeAthleteId.value = athleteId
    // Reload data for this athlete
  }

  return { activeAthleteId, isViewingAsParent, switchAthlete }
}

// pages/dashboard.vue
const { activeAthleteId, isViewingAsParent } = useActiveFamily()

<div v-if="isViewingAsParent" class="banner">
  Viewing {{ activeAthleteId }}'s data
</div>
```

**iOS Pattern**

```swift
// Managers/FamilyManager.swift
@MainActor
class FamilyManager: ObservableObject {
  @Published var activeAthleteId: String? = nil
  @Published var accessibleAthletes: [Athlete] = []

  @Injected var authManager: AuthManager

  var isViewingAsParent: Bool {
    authManager.user?.role == .parent && activeAthleteId != nil
  }

  func switchAthlete(_ athleteId: String) async {
    activeAthleteId = athleteId
    // Reload data for this athlete
    await reloadData()
  }
}

// Views/DashboardView.swift
@EnvironmentObject var familyManager: FamilyManager

var body: some View {
  VStack {
    if familyManager.isViewingAsParent {
      HStack {
        Image(systemName: "eye")
        Text("Viewing \(familyManager.activeAthleteId ?? "athlete")'s data")
      }
      .padding()
      .background(Color.blue.opacity(0.1))
    }
  }
}
```

**Pattern Match:**

- Composable function → Manager class
- `computed()` → Computed property
- Component receives via `useXxx()` → View receives via `@EnvironmentObject`

---

### 5. Error Handling Pattern

**Nuxt Pattern**

```typescript
// composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  };

  return { handleError };
};

// Usage
const { handleError } = useErrorHandler();
try {
  await fetchData();
} catch (error) {
  const message = handleError(error);
  // Show message to user
}
```

**iOS Pattern**

```swift
// Utilities/ErrorHandler.swift
enum AppError: LocalizedError {
  case networkError
  case authenticationFailed
  case unknown(Error)

  var errorDescription: String? {
    switch self {
    case .networkError:
      return "Network connection failed. Please try again."
    case .authenticationFailed:
      return "Invalid email or password."
    case .unknown(let error):
      return error.localizedDescription
    }
  }
}

// Usage
do {
  try await fetchData()
} catch {
  let appError = error as? AppError ?? .unknown(error)
  // Show appError.errorDescription to user
}
```

**Pattern Match:**

- Try/catch with error message → Try/catch with AppError enum
- Both return user-friendly messages

---

## State Management Layers

### Nuxt Web

```
┌─────────────────────────────────────┐
│  Components (UI only)               │
│  - Display props                    │
│  - Emit user events                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Composables (Business logic)       │
│  - Fetch from API                   │
│  - Transform data                   │
│  - Manage loading/error state       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Pinia Store (Centralized state)    │
│  - User data                        │
│  - Cached entities                  │
│  - Global preferences               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Supabase (API + Auth)              │
│  - PostgreSQL data                  │
│  - Authentication                   │
│  - File storage                     │
└─────────────────────────────────────┘
```

### iOS Equivalent

```
┌─────────────────────────────────────┐
│  Views (UI only)                    │
│  - Display state from ViewModel     │
│  - Call ViewModel methods on action │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ViewModels (Business logic)        │
│  - Fetch from SupabaseManager       │
│  - Transform data                   │
│  - Manage loading/error state       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Managers (Centralized state)       │
│  - AuthManager                      │
│  - FamilyManager                    │
│  - AppStateManager                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  SupabaseManager (API + Auth)       │
│  - Wraps SupabaseClient             │
│  - Handles authentication           │
│  - Storage operations               │
└─────────────────────────────────────┘
```

---

## Recommended iOS Architecture Pattern

```swift
// MARK: - 1. App Entry Point (SceneDelegate equivalent)
@main
struct RecruitingCompassApp: App {
  @StateObject var authManager = AuthManager.shared
  @StateObject var familyManager = FamilyManager.shared
  @StateObject var appState = AppStateManager.shared

  var body: some Scene {
    WindowGroup {
      if authManager.isAuthenticated {
        TabView {
          DashboardView()
            .environmentObject(authManager)
            .environmentObject(familyManager)
            .tabItem { Label("Dashboard", systemImage: "house.fill") }

          CoachesListView()
            .environmentObject(authManager)
            .tabItem { Label("Coaches", systemImage: "person.fill") }

          SchoolsListView()
            .environmentObject(authManager)
            .tabItem { Label("Schools", systemImage: "building.2") }

          SettingsView()
            .environmentObject(authManager)
            .tabItem { Label("Settings", systemImage: "gear") }
        }
      } else {
        LoginView()
          .environmentObject(authManager)
      }
    }
  }
}

// MARK: - 2. View (equivalent to pages/*.vue)
struct CoachesListView: View {
  @StateObject var viewModel = CoachesViewModel()
  @EnvironmentObject var authManager: AuthManager

  var body: some View {
    NavigationStack {
      List {
        ForEach(viewModel.coaches) { coach in
          NavigationLink(value: coach.id) {
            CoachRow(coach: coach)
          }
        }
      }
      .navigationDestination(for: String.self) { coachId in
        CoachDetailView(coachId: coachId)
      }
      .navigationTitle("Coaches")
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          NavigationLink(value: "new-coach") {
            Image(systemName: "plus")
          }
        }
      }
      .task {
        await viewModel.fetchCoaches()
      }
    }
  }
}

// MARK: - 3. ViewModel (equivalent to composables/useXxx.ts)
@MainActor
class CoachesViewModel: ObservableObject {
  @Published var coaches: [Coach] = []
  @Published var isLoading = false
  @Published var error: String? = nil

  private let supabaseManager: SupabaseManager

  init(supabaseManager: SupabaseManager = .shared) {
    self.supabaseManager = supabaseManager
  }

  func fetchCoaches(schoolId: String? = nil) async {
    isLoading = true
    defer { isLoading = false }

    do {
      coaches = try await supabaseManager.fetchCoaches(schoolId: schoolId)
    } catch {
      self.error = error.localizedDescription
    }
  }

  func deleteCoach(_ id: String) async throws {
    try await supabaseManager.deleteCoach(id)
    coaches.removeAll { $0.id == id }
  }
}

// MARK: - 4. Manager (equivalent to Pinia store)
@MainActor
class AuthManager: ObservableObject {
  @Published var user: User? = nil
  @Published var isAuthenticated = false

  static let shared = AuthManager()

  private let supabaseClient: SupabaseClient

  init() {
    self.supabaseClient = SupabaseManager.shared.client
    Task { await checkAuthStatus() }
  }

  func login(email: String, password: String) async throws {
    let user = try await supabaseClient.auth.signIn(email: email, password: password)
    self.user = user
    self.isAuthenticated = true
  }

  func checkAuthStatus() async {
    if let session = try? await supabaseClient.auth.session {
      self.user = session.user
      self.isAuthenticated = true
    }
  }
}

// MARK: - 5. Supabase Manager (API layer)
class SupabaseManager {
  static let shared = SupabaseManager()

  let client: SupabaseClient

  init() {
    self.client = SupabaseClient(
      url: URL(string: "YOUR_SUPABASE_URL")!,
      key: "YOUR_SUPABASE_KEY"
    )
  }

  func fetchCoaches(schoolId: String? = nil) async throws -> [Coach] {
    var query = client.database.from("coaches").select()

    if let schoolId = schoolId {
      query = query.eq("school_id", value: schoolId)
    }

    let response = try await query.execute()
    return try JSONDecoder().decode([Coach].self, from: response.data)
  }
}

// MARK: - 6. Component (reusable UI)
struct CoachRow: View {
  let coach: Coach

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(coach.fullName)
        .font(.headline)
      Text(coach.title ?? "Coach")
        .font(.caption)
        .foregroundColor(.secondary)
    }
    .padding(.vertical, 8)
  }
}
```

---

## Key Architectural Rules

### ✅ Data Flow

1. **View** displays state from **ViewModel**
2. **ViewModel** fetches/transforms data via **Manager** or **SupabaseManager**
3. **Manager** holds global state (auth, family context)
4. **SupabaseManager** wraps Supabase API calls

### ✅ Mutation Rules

- Only **Managers** and **ViewModels** can modify state
- Views are read-only (they display and trigger actions)
- No direct Supabase calls from Views

### ✅ Navigation

- Use `NavigationStack` (iOS 16+) or `NavigationView`
- Pass IDs via `navigationDestination(for:destination:)`
- Each destination view creates its own ViewModel

### ✅ Error Handling

- Try/catch in ViewModel methods
- Store `@Published var error: String?` in ViewModel
- Display error in View with `.alert()` or custom UI
- Provide retry action to user

### ✅ Async Operations

- Use `async/await` (modern)
- Mark ViewModels with `@MainActor` for UI thread safety
- Use `.task()` in Views to trigger async operations
- Avoid `dispatch_async` or completion handlers

---

## File Organization Recommendation

```
RecruitingCompass/
├── App/
│   ├── RecruitingCompassApp.swift    (entry point)
│   └── TabBarView.swift
│
├── Features/
│   ├── Auth/
│   │   ├── Views/
│   │   │   ├── LoginView.swift
│   │   │   ├── SignupView.swift
│   │   │   └── ForgotPasswordView.swift
│   │   └── ViewModels/
│   │       └── AuthViewModel.swift
│   │
│   ├── Coaches/
│   │   ├── Views/
│   │   │   ├── CoachesListView.swift
│   │   │   ├── CoachDetailView.swift
│   │   │   └── AddCoachView.swift
│   │   ├── ViewModels/
│   │   │   └── CoachesViewModel.swift
│   │   └── Components/
│   │       ├── CoachRow.swift
│   │       └── CoachCard.swift
│   │
│   ├── Schools/
│   │   └── (same structure as Coaches)
│   │
│   ├── Dashboard/
│   │   ├── Views/
│   │   │   └── DashboardView.swift
│   │   ├── ViewModels/
│   │   │   └── DashboardViewModel.swift
│   │   └── Components/
│   │       ├── StatsCard.swift
│   │       └── RecentActivityCard.swift
│   │
│   └── Settings/
│       └── (same structure)
│
├── Core/
│   ├── Managers/
│   │   ├── AuthManager.swift
│   │   ├── FamilyManager.swift
│   │   └── AppStateManager.swift
│   │
│   ├── Services/
│   │   └── SupabaseManager.swift
│   │
│   └── Models/
│       ├── Coach.swift
│       ├── School.swift
│       ├── Interaction.swift
│       ├── User.swift
│       └── Family.swift
│
├── Shared/
│   ├── Components/
│   │   ├── LoadingView.swift
│   │   ├── ErrorView.swift
│   │   └── EmptyStateView.swift
│   │
│   └── Utilities/
│       ├── ErrorHandler.swift
│       └── Constants.swift
│
└── Resources/
    ├── Localizable.strings
    └── Assets.xcassets
```

---

## Summary: Mental Model Alignment

| Concept            | Nuxt Web                      | iOS                                            |
| ------------------ | ----------------------------- | ---------------------------------------------- |
| **Route/Page**     | `/pages/coaches/[id].vue`     | `CoachDetailView` in `Features/Coaches/Views/` |
| **Business Logic** | `composables/useCoaches.ts`   | `CoachesViewModel`                             |
| **Fetch Data**     | `useSupabase()` + `$fetch()`  | `SupabaseManager.shared`                       |
| **Global State**   | Pinia `useAuthStore()`        | `AuthManager.shared` (@EnvironmentObject)      |
| **Component**      | `.vue` file with `<template>` | SwiftUI `View` struct                          |
| **Lifecycle**      | `onMounted()`, `watch()`      | `.task()`, `.onAppear()`                       |
| **UI Reactivity**  | `ref()`, `computed()`         | `@Published`, computed properties              |
| **Props**          | `defineProps()`               | Initializer parameters or `@EnvironmentObject` |
| **Emit Events**    | `emit('event-name')`          | Closure callbacks or ViewModel methods         |
| **Navigation**     | `useRouter().push()`          | `NavigationStack`, `NavigationLink`            |
| **Error Handling** | Try/catch + error state       | Try/catch + error state                        |

By keeping these patterns consistent, you and your iOS team will have a shared language for discussing architecture, and iOS developers can more easily understand the web app's design decisions.
