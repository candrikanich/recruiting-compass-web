# iOS App Implementation Priority & Sequencing

**Total Pages to Port:** 57 pages
**Estimated Phases:** 4-5 phases (8-10 weeks)
**Strategy:** Foundation → Core Features → Advanced Features → Polish

---

## Phase 1: Foundation & Auth (Week 1-2)

**Objective:** Get auth working, establish patterns for subsequent pages.

### 🔴 CRITICAL (Start here)

#### 1. Login Page

- **Web Route:** `/login`
- **Complexity:** Medium
- **Dependencies:** None (foundational)
- **Why First:**
  - Users can't enter app without login
  - Establishes Supabase iOS client integration pattern
  - Error handling pattern for auth failures
- **Estimated Time:** 2-3 days
- **Key Composables:** `useAuth`
- **API:** POST `/api/auth/login`
- **Patterns to Establish:**
  - Supabase iOS SDK setup
  - Token storage in Keychain
  - Session management
  - Error display pattern

#### 2. Signup Page

- **Web Route:** `/signup`
- **Complexity:** Medium
- **Dependencies:** Login pattern
- **Why Next:**
  - New users need entry point
  - Similar auth flow to login (established patterns apply)
  - Email verification follows
- **Estimated Time:** 2 days
- **Key Composables:** `useAuth`, `useProfile`
- **Patterns:** Form validation, async submission, error handling

#### 3. Email Verification Page

- **Web Route:** `/verify-email`
- **Complexity:** Low
- **Dependencies:** Signup
- **Why Next:**
  - Part of auth onboarding flow
  - Simple UI (verification code input)
  - Establishes polling pattern (check if verified)
- **Estimated Time:** 1 day

#### 4. Password Reset Flow

- **Web Routes:** `/forgot-password`, `/reset-password`
- **Complexity:** Medium
- **Dependencies:** Auth pattern
- **Why Here:**
  - Completes auth story
  - Self-service recovery pattern
- **Estimated Time:** 2 days

**Phase 1 Output:** Users can log in, sign up, verify email, reset password. Core auth patterns established.

---

## Phase 2: Dashboard & Core Views (Week 2-3)

**Objective:** Give users the main dashboard and ability to see key data.

### 🟠 HIGH PRIORITY

#### 5. Dashboard

- **Web Route:** `/dashboard`
- **Complexity:** Medium
- **Dependencies:** Login
- **Why Here:**
  - Main landing page after auth
  - Shows summary cards (coaches, schools, interactions, offers)
  - Establishes data fetch pattern and composition pattern
  - Parent viewing mode logic (important UX pattern)
- **Estimated Time:** 3 days
- **Key Composables:** `useCoaches`, `useSchools`, `useInteractions`, `useOffers`, `useActiveFamily`
- **API Calls:** Multiple summary endpoints
- **Critical Pattern:** Parent preview mode toggle

#### 6. Coaches List

- **Web Route:** `/coaches`
- **Complexity:** High (lots of filtering)
- **Dependencies:** Login, data fetch pattern
- **Why Next:**
  - Core feature: view all coaches
  - Establishes list UI pattern (scroll, load more, cells)
  - Establishes filter pattern (by school, role, etc.)
- **Estimated Time:** 4-5 days
- **Key Composables:** `useCoaches`, `useSearchFilters`
- **UI Pattern:** Filterable list with search
- **Actions:** Add coach, delete coach, export CSV/PDF (simplify for iOS)

#### 7. Schools List

- **Web Route:** `/schools`
- **Complexity:** High
- **Dependencies:** Login, list pattern
- **Why Here:**
  - Similar to coaches list (reuse pattern)
  - Core feature for athlete recruiting
  - Filtering and search critical
- **Estimated Time:** 4-5 days
- **Key Composables:** `useSchools`, `useSearchFilters`
- **Key Difference:** More filtering options (fit score, division, location)

#### 8. Interactions List

- **Web Route:** `/interactions`
- **Complexity:** Medium
- **Dependencies:** Login, list pattern
- **Why Here:**
  - Shows contact history
  - Supports adding interactions (important workflow)
  - Simpler filtering than coaches/schools
- **Estimated Time:** 3 days
- **Key Composables:** `useInteractions`

**Phase 2 Output:** User sees dashboard and main lists. Can browse coaches, schools, interactions.

---

## Phase 3: Detail Pages & CRUD (Week 4-5)

**Objective:** Users can view details and manage individual entities.

### 🟠 HIGH PRIORITY

#### 9. Coach Detail Page

- **Web Route:** `/coaches/[id]`
- **Complexity:** High
- **Dependencies:** Coach list, CRUD pattern
- **Why Here:**
  - Details + related interactions
  - Edit/delete coach functionality
  - Shows tabs pattern (analytics, availability, communications)
- **Estimated Time:** 5 days
- **Key Composables:** `useCoaches`, `useInteractions`
- **Tabs:** Profile, Interactions, Analytics (start with profile only)

#### 10. School Detail Page

- **Web Route:** `/schools/[id]`
- **Complexity:** High
- **Dependencies:** School list, CRUD pattern
- **Why Here:**
  - Details + coaches at school
  - Edit/delete school functionality
  - Shows relationship pattern (school → coaches)
- **Estimated Time:** 4-5 days
- **Key Composables:** `useSchools`, `useCoaches`

#### 11. Add Coach Page

- **Web Route:** `/coaches/new`
- **Complexity:** High (lots of form fields)
- **Dependencies:** Coach detail, form validation
- **Why Here:**
  - Core workflow: add a coach user's tracking
  - Form pattern (many fields, validation, async submit)
  - Establishes NCAA lookup integration
- **Estimated Time:** 4-5 days
- **Key Composables:** `useCoaches`, `useFormValidation`, `useNcaaLookup`

#### 12. Add School Page

- **Web Route:** `/schools/new`
- **Complexity:** High
- **Dependencies:** School detail, form validation
- **Why Here:**
  - Similar to add coach (form pattern)
  - Slightly simpler (fewer fields)
- **Estimated Time:** 3-4 days

#### 13. Interaction Detail / Add Page

- **Web Route:** `/interactions/add`, `/interactions/[id]`
- **Complexity:** Medium
- **Dependencies:** Interaction list, form pattern
- **Why Here:**
  - Log contact with a coach
  - Form pattern already established
- **Estimated Time:** 3 days
- **Key Composables:** `useInteractions`, `useCommunicationTemplates`

**Phase 3 Output:** Users can view and manage coaches, schools, interactions.

---

## Phase 4: Settings & Advanced Features (Week 5-6)

**Objective:** User preferences, multi-user features, notifications.

### 🟡 MEDIUM PRIORITY

#### 14. Family Management Settings

- **Web Route:** `/settings/family-management`
- **Complexity:** High (multi-step workflow)
- **Dependencies:** Auth
- **Why Here:**
  - Multi-family support (parent + athlete accounts)
  - Invite/acceptance workflow (important pattern)
  - Enables parent preview mode on dashboard
- **Estimated Time:** 4-5 days
- **Key Composables:** `useFamilyInvite`, `useActiveFamily`, `useFamilyContext`
- **Workflow:** Send invite → Receive invite → Accept → Confirm

#### 15. Preferences Pages

- **Web Routes:**
  - `/settings/player-details`
  - `/settings/school-preferences`
  - `/settings/notifications`
  - `/settings/dashboard` (dashboard customization)
- **Complexity:** Medium (forms)
- **Dependencies:** Form validation
- **Why Here:**
  - Personalization
  - Notification preferences
  - Refine recruiting targets
- **Estimated Time:** 4-5 days total
- **Key Composables:** `usePreferenceManager`, `useProfile`

#### 16. Notifications Page

- **Web Route:** `/notifications`
- **Complexity:** Low
- **Dependencies:** Push notifications setup
- **Why Here:**
  - Review notifications (read/unread)
  - Delete notifications
  - Marks notifications as read
- **Estimated Time:** 2 days
- **Key Composables:** `useNotifications`
- **iOS-Specific:** Configure push notification permissions

#### 17. Activity Feed

- **Web Route:** `/activity`
- **Complexity:** Medium
- **Dependencies:** List pattern
- **Why Here:**
  - Timeline of recent activity
  - Similar list pattern to interactions
  - Real-time or polling based
- **Estimated Time:** 2-3 days
- **Key Composables:** `useActivityFeed`

**Phase 4 Output:** Full settings suite, family management, notifications working.

---

## Phase 5: Reports & Analytics (Week 6-7)

**Objective:** Advanced features and insights.

### 🟢 LOWER PRIORITY (Nice-to-Have)

#### 18. Performance/Analytics Pages

- **Web Routes:**
  - `/performance/index` (dashboard with charts)
  - `/analytics/index`
  - `/coaches/[id]/analytics`
- **Complexity:** High (charts, complex data)
- **Dependencies:** Chart library for iOS
- **Why Later:**
  - Charts are complex to implement
  - Users can function without analytics initially
  - Good follow-up after core features stable
- **Estimated Time:** 4-5 days
- **Notes:** May need different chart library than web

#### 19. Offers Tracking

- **Web Route:** `/offers/index`, `/offers/[id]`
- **Complexity:** Medium
- **Dependencies:** CRUD pattern, detail page pattern
- **Why Here:**
  - Track scholarship offers
  - Similar CRUD to coaches/schools
- **Estimated Time:** 3 days
- **Key Composables:** `useOffers`

#### 20. Tasks / Recruiting Timeline

- **Web Route:** `/tasks/index`
- **Complexity:** Medium
- **Dependencies:** List pattern, task completion workflow
- **Why Here:**
  - Phase-based task tracking
  - Workflow pattern (mark complete, etc.)
- **Estimated Time:** 3 days
- **Key Composables:** `useTasks`

#### 21. Communication Templates & History

- **Web Route:** `/settings/communication-templates`
- **Complexity:** Medium
- **Dependencies:** CRUD pattern
- **Why Later:**
  - Advanced workflow
  - Users can manually log interactions without templates
- **Estimated Time:** 3-4 days
- **Key Composables:** `useCommunicationTemplates`

**Phase 5 Output:** Advanced reporting and tracking features complete.

---

## Phase 6: Polish & Edge Cases (Week 7-8)

### 🟢 LOWER PRIORITY

#### Remaining Pages

- Social features (`/social/*`)
- Documents/uploads (`/documents/*`)
- Reports `/reports/*`
- Events (`/events/*`)
- Admin pages (likely skip for iOS)
- Legal pages (`/legal/*`)

---

## Implementation Flow Chart

```
Week 1-2: Foundation
  ├─ Login → Signup → Email Verify → Password Reset
  └─ Core auth pattern established

Week 2-3: Core Dashboard
  ├─ Dashboard (summary)
  ├─ Coaches List (filtering pattern)
  ├─ Schools List
  └─ Interactions List

Week 4-5: Details & CRUD
  ├─ Coach Detail + Edit/Delete
  ├─ School Detail + Edit/Delete
  ├─ Add Coach (forms)
  ├─ Add School
  └─ Add Interaction

Week 5-6: Settings & Family
  ├─ Family Management (multi-user setup)
  ├─ Settings Pages (preferences)
  ├─ Notifications Page
  └─ Activity Feed

Week 6-7: Analytics
  ├─ Performance Analytics
  ├─ Offers Tracking
  ├─ Tasks Timeline
  └─ Communication Templates

Week 7-8: Polish
  └─ Remaining features, edge cases, testing
```

---

## Critical Success Factors

### ✅ Do This First (Week 1)

1. Set up Supabase iOS SDK
2. Implement keychain token storage
3. Build reusable components:
   - TextInput
   - Button
   - List cell
   - Empty state
   - Loading skeleton
4. Establish error handling pattern

### ✅ Establish Patterns Early

- **Data fetching:** Loading → Error → Success states
- **Form submission:** Validation → API call → Feedback
- **Navigation:** Modal vs. push navigation
- **State management:** Single source of truth

### ✅ Test Incrementally

- Each phase should have manual testing before moving on
- Test on different device sizes (SE, 13, 15+)
- Test network interruptions (Xcode network throttling)

---

## Dependencies Between Pages

```
Login/Signup (Foundation)
    ↓
Dashboard (Summary)
    ├→ Coaches List
    ├→ Schools List
    └→ Interactions List
        ├→ Coach Detail
        ├→ School Detail
        ├→ Add Coach (complex form)
        └→ Add School (complex form)
            ├→ Family Management
            └→ Settings Pages
                └→ Analytics Pages
```

**Key Rule:** Don't implement detail page until list is done. Don't implement settings until core CRUD works.

---

## Estimated Timeline

| Phase     | Pages                 | Time        | Week         |
| --------- | --------------------- | ----------- | ------------ |
| 1         | Auth (4)              | 7 days      | W1-2         |
| 2         | Dashboard + Lists (4) | 10 days     | W2-3         |
| 3         | Details + Forms (5)   | 10 days     | W4-5         |
| 4         | Settings (4)          | 8 days      | W5-6         |
| 5         | Analytics (4)         | 8 days      | W6-7         |
| 6         | Polish (5+)           | 5 days      | W7-8         |
| **Total** | **~25 MVP**           | **48 days** | **~8 weeks** |

**Note:** Parallelizable tasks can reduce timeline. Testing and debugging typically add 20-30%.

---

## Questions for Your iOS Team

1. **Supabase iOS SDK:** Already set up, or fresh start?
2. **Design system:** Use SF Design System defaults, or custom design?
3. **Architecture preference:** MVVM with Combine/async-await? SwiftUI @StateObject?
4. **Minimum iOS version:** iOS 15, 16, or 17?
5. **Push notifications:** Set up immediately, or add later?
6. **Offline capability:** Queue requests for sync, or require connectivity?
