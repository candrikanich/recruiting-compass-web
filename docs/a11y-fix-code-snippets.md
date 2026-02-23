# A11y Fix Code Snippets - Ready to Implement

Copy and paste these code blocks directly into your components.

---

## Critical Fix #1: Profile Menu Button

**File:** `/components/Header/HeaderProfile.vue`

### Current Code (Lines 4-40)
```vue
<template>
  <div class="relative">
    <!-- Profile Button -->
    <button
      data-testid="profile-menu"
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
    >
      <!-- Avatar -->
      <div
        class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 flex items-center justify-center"
      >
        <img
          v-if="profilePhotoUrl"
          :src="profilePhotoUrl"
          :alt="userName"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
        <span v-else class="text-white text-sm font-semibold">
          {{ userInitials }}
        </span>
      </div>
      <!-- Chevron -->
      <svg
        class="w-4 h-4 text-slate-600 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
```

### Fixed Code (Add These Lines)
```vue
<template>
  <div class="relative">
    <!-- Profile Button -->
    <button
      data-testid="profile-menu"
      @click="isOpen = !isOpen"
      :aria-label="`User menu for ${userName}, currently ${isOpen ? 'open' : 'closed'}`"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <!-- Avatar -->
      <div
        class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 flex items-center justify-center"
      >
        <img
          v-if="profilePhotoUrl"
          :src="profilePhotoUrl"
          :alt="userName"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
        <span v-else class="text-white text-sm font-semibold">
          {{ userInitials }}
        </span>
      </div>
      <!-- Chevron -->
      <svg
        class="w-4 h-4 text-slate-600 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>

    <!-- Dropdown Menu (update the wrapper div) -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        id="profile-menu"
        role="menu"
        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50"
      >
        <!-- User Info -->
        <div class="px-4 py-3 border-b border-slate-200">
          <p class="text-sm font-medium text-slate-900">{{ userName }}</p>
          <p class="text-xs text-slate-500">{{ userEmail }}</p>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <NuxtLink
            to="/settings"
            role="menuitem"
            class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:bg-slate-50"
            @click="isOpen = false"
          >
            Settings
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            role="menuitem"
            class="block px-4 py-2 text-sm text-brand-blue-600 hover:bg-blue-50 transition-colors font-medium focus:outline-none focus:bg-blue-50"
            @click="isOpen = false"
          >
            Admin Dashboard
          </NuxtLink>
          <button
            data-testid="logout-button"
            role="menuitem"
            @click="handleLogout"
            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:bg-red-50"
          >
            Logout
          </button>
        </div>
      </div>
    </Transition>
```

**What Changed:**
- Added `:aria-label` with dynamic text
- Added `:aria-expanded` to show menu state
- Added `aria-haspopup="true"` to indicate it opens a menu
- Added `id="profile-menu"` to menu wrapper
- Added `role="menu"` to menu container
- Added `role="menuitem"` to each menu link/button
- Added `aria-hidden="true"` to decorative SVG
- Added focus ring to button

---

## Critical Fix #2: Mobile Menu Toggle Button

**File:** `/components/Header.vue`

### Current Code (Lines 34-40)
```vue
<!-- Mobile Menu Button -->
<button
  @click="toggleMobileMenu"
  class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
>
  <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
  <XMarkIcon v-else class="w-6 h-6" />
</button>
```

### Fixed Code
```vue
<!-- Mobile Menu Button -->
<button
  @click="toggleMobileMenu"
  :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
  :aria-expanded="isMobileMenuOpen"
  aria-haspopup="menu"
  aria-controls="mobile-menu"
  class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" aria-hidden="true" />
  <XMarkIcon v-else class="w-6 h-6" aria-hidden="true" />
</button>

<!-- Update the mobile menu wrapper to add id and role -->
<!-- Mobile Menu -->
<Transition
  enter-active-class="transition ease-out duration-200"
  enter-from-class="opacity-0 -translate-y-1"
  enter-to-class="opacity-100 translate-y-0"
  leave-active-class="transition ease-in duration-150"
  leave-from-class="opacity-100 translate-y-0"
  leave-to-class="opacity-0 -translate-y-1"
>
  <div
    v-if="isMobileMenuOpen"
    id="mobile-menu"
    role="menu"
    class="md:hidden py-4 border-t border-slate-200"
  >
```

**What Changed:**
- Added `:aria-label` with dynamic text based on menu state
- Added `:aria-expanded` to show menu state
- Added `aria-haspopup="menu"` to indicate it opens a menu
- Added `aria-controls="mobile-menu"` to link to menu id
- Added `id="mobile-menu"` to the menu wrapper div
- Added `role="menu"` to menu wrapper
- Added `aria-hidden="true"` to icons

---

## Critical Fix #3: Search Button

**File:** `/components/Header.vue`

### Current Code (Lines 22-29)
```vue
<NuxtLink
  to="/search"
  class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
  title="Search"
  data-testid="nav-search-button"
>
  <MagnifyingGlassIcon class="w-5 h-5" />
</NuxtLink>
```

### Fixed Code
```vue
<NuxtLink
  to="/search"
  aria-label="Search coaches and schools"
  title="Search"
  class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  data-testid="nav-search-button"
>
  <MagnifyingGlassIcon class="w-5 h-5" aria-hidden="true" />
</NuxtLink>
```

**What Changed:**
- Added `aria-label="Search coaches and schools"`
- Added `aria-hidden="true"` to decorative icon
- Added focus ring styling

---

## High Priority Fix #1: CoachCard Email Button

**File:** `/components/CoachCard.vue`

### Current Code (Lines 108-115)
```vue
<!-- Icon-only quick actions -->
<div class="flex gap-2">
  <!-- Email -->
  <button
    v-if="coach.email"
    @click="emit('email', coach)"
    title="Send email"
    class="p-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
  >
    Email
  </button>

  <!-- Phone/Text -->
  <button
    v-if="coach.phone"
    @click="emit('text', coach)"
    title="Send text"
    class="p-2 rounded transition bg-green-100 text-green-700 hover:bg-green-200"
  >
    Text
  </button>
```

### Fixed Code
```vue
<!-- Icon-only quick actions -->
<div class="flex gap-2">
  <!-- Email -->
  <button
    v-if="coach.email"
    @click="emit('email', coach)"
    :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
    title="Send email"
    class="px-3 py-2 rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    Email
  </button>

  <!-- Phone/Text -->
  <button
    v-if="coach.phone"
    @click="emit('text', coach)"
    :aria-label="`Send text to ${coach.phone}`"
    title="Send text"
    class="px-3 py-2 rounded transition bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
  >
    Text
  </button>
```

**What Changed:**
- Added `:aria-label` with context (coach name/phone)
- Added focus ring styling
- Increased padding for better touch targets

---

## High Priority Fix #2: Navigation Link Focus States

**File:** `/components/Header/HeaderNav.vue`

### Current Code (Lines 3-17)
```vue
<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :data-testid="`nav-${item.to.replace('/', '')}`"
      :class="[
        'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive(item.to)
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <HeaderNavMore />
  </nav>
</template>
```

### Fixed Code
```vue
<template>
  <nav class="flex items-center gap-1 lg:gap-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :data-testid="`nav-${item.to.replace('/', '')}`"
      :class="[
        'flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-600',
        isActive(item.to)
          ? 'bg-brand-blue-100 text-brand-blue-700'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      ]"
    >
      <component :is="item.icon" class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </NuxtLink>
    <HeaderNavMore />
  </nav>
</template>
```

**What Changed:**
- Added `:aria-current="isActive(item.to) ? 'page' : undefined"`
- Added focus ring classes to the :class binding
- Added `aria-hidden="true"` to decorative icon

---

## High Priority Fix #3: Mobile Navigation Links

**File:** `/components/Header.vue`

### Current Code (Lines 59-74)
```vue
<!-- Navigation -->
<nav class="space-y-1 mb-4">
  <NuxtLink
    v-for="item in navItems"
    :key="item.to"
    :to="item.to"
    :data-testid="`mobile-nav-${item.to.replace('/', '')}`"
    class="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition"
    :class="
      isActive(item.to)
        ? 'bg-blue-50 text-blue-600'
        : 'text-slate-600 hover:bg-slate-50'
    "
    @click="closeMobileMenu"
  >
    <component :is="item.icon" class="w-5 h-5" />
    <span>{{ item.label }}</span>
  </NuxtLink>
</nav>
```

### Fixed Code
```vue
<!-- Navigation -->
<nav class="space-y-1 mb-4">
  <NuxtLink
    v-for="item in navItems"
    :key="item.to"
    :to="item.to"
    :aria-current="isActive(item.to) ? 'page' : undefined"
    :data-testid="`mobile-nav-${item.to.replace('/', '')}`"
    class="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    :class="
      isActive(item.to)
        ? 'bg-blue-50 text-blue-600'
        : 'text-slate-600 hover:bg-slate-50'
    "
    @click="closeMobileMenu"
  >
    <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
    <span>{{ item.label }}</span>
  </NuxtLink>
</nav>
```

**What Changed:**
- Added `:aria-current="isActive(item.to) ? 'page' : undefined"`
- Added focus ring classes
- Added `aria-hidden="true"` to icons

---

## Form Error Aria Linkage Check

**File:** Any form input component

### Verify This Pattern Exists
```vue
<template>
  <div>
    <label :for="inputId" class="block text-sm font-medium...">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    <input
      :id="inputId"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      class="..."
    />
    <DesignSystemFieldError
      v-if="error"
      :id="`${inputId}-error`"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

interface Props {
  modelValue: string
  label: string
  error?: string
  // ... other props
}

const inputId = useId()
</script>
```

**Key Points:**
- Input has `:id="inputId"`
- Input has `:aria-describedby="error ? \`${inputId}-error\` : undefined"`
- Error element has `:id="\`${inputId}-error\`"`
- Error element has `role="alert"` (check FieldError component)

If all three are present, the pattern is correct. If any are missing, add them.

---

## Loading State Announcement Pattern

**File:** Any page with loading state

### Current Pattern
```vue
<div v-if="loading" role="status" aria-live="polite" class="text-center">
  <div class="spinner" aria-hidden="true"></div>
  <p>Loading schools...</p>
</div>
```

### Enhanced Pattern
```vue
<div v-if="loading" role="status" aria-live="polite" aria-busy="true" class="text-center">
  <div class="spinner" aria-hidden="true"></div>
  <p>Loading schools...</p>
</div>

<!-- Add this announcement when loading completes -->
<div v-if="!loading && items.length > 0" role="status" aria-live="polite" class="sr-only">
  {{ items.length }} items loaded and displayed
</div>

<!-- Or use this simpler version if announcing counts -->
<div v-if="!loading" role="status" aria-live="polite" class="sr-only">
  {{ items.length }} schools available
</div>
```

**What Changed:**
- Added `aria-busy="true"` during loading
- Added second announcement when loading completes
- Uses `.sr-only` so screen readers see it but sighted users don't see duplicate text

---

## Icon-Only Button Universal Pattern

Use this pattern for ANY icon-only button in the app:

```vue
<button
  :aria-label="labelText"  <!-- REQUIRED for accessibility -->
  :title="labelText"        <!-- Optional: appears on hover -->
  class="p-2 rounded transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <IconComponent class="w-5 h-5" aria-hidden="true" />  <!-- aria-hidden required -->
</button>
```

**Checklist for Icon-Only Buttons:**
- [ ] Has `aria-label`
- [ ] Has `aria-hidden="true"` on icon
- [ ] Has focus ring styling
- [ ] Optional: Has `title` attribute for mouse users

---

## SkipLink Standardization

Use this everywhere you have a skip link:

```vue
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
>
  Skip to main content
</a>
```

Replace all inline skip link definitions with a single component call:

```vue
<SkipLink to="#main-content" text="Skip to main content" />
```

---

## Testing After Implementation

### Keyboard Test Script
```
1. Press Tab repeatedly - can you reach every button?
2. Can you see which element has focus? (ring visible?)
3. Press Enter on buttons - do they activate?
4. Press Escape in modals - does it close?
5. Press arrow keys in dropdowns - do menu items navigate?
```

### Screen Reader Test Script (NVDA / VoiceOver)
```
1. Focus the mobile menu button
   Expected: "Open menu, button, collapsed"

2. Press Enter to open
   Expected: "Close menu, button, expanded"

3. Press Tab to navigate
   Expected: Each item announced with label

4. Focus a form field with error
   Expected: "Input, email, invalid, required. Error: Email is required"
```

### Automated Test
```bash
# Run these in browser console or use axe DevTools extension
# Check for accessibility violations
```

---

## Quick Diff Reference

### What to Add to Most Buttons
```diff
  <button
    @click="handleClick"
+   :aria-label="descriptiveLabel"
+   :aria-expanded="isOpen ? 'true' : 'false'" <!-- if toggle -->
    class="...
+   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    ..."
  >
    <Icon aria-hidden="true" />
  </button>
```

### What to Add to Form Inputs
```diff
  <input
    :id="inputId"
+   :aria-invalid="!!error"
+   :aria-describedby="error ? `${inputId}-error` : undefined"
  />
  <div
+   v-if="error"
+   :id="`${inputId}-error`"
+   role="alert"
    class="..."
  >
    {{ error }}
  </div>
```

### What to Add to Navigation Links
```diff
  <NuxtLink
    :to="path"
+   :aria-current="isActive ? 'page' : undefined"
    class="...
+   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ..."
  >
    <Icon aria-hidden="true" />
    <span>{{ label }}</span>
  </NuxtLink>
```

---

**Total Code Changes:** ~50 lines of additions/modifications
**Estimated Implementation Time:** 2-3 hours
**Tools Needed:** Text editor, 5 minutes per fix
**Testing Time:** 15 minutes (keyboard + screen reader)

All code is copy-paste ready. Adjust colors and classes to match your theme.
