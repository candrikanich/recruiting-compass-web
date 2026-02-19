# A11y Quick Reference & Fix Checklist

## Critical Fixes (Must Complete for WCAG AA)

### Fix 1: Profile Menu Button `aria-label` & `aria-expanded`
**File:** `/components/Header/HeaderProfile.vue`
**Lines:** 4-40
**Time:** 10 min

```diff
  <button
    data-testid="profile-menu"
    @click="isOpen = !isOpen"
+   :aria-label="`User menu for ${userName}, currently ${isOpen ? 'open' : 'closed'}`"
+   :aria-expanded="isOpen"
+   aria-haspopup="true"
    class="flex items-center gap-2 px-3 py-2..."
  >
```

### Fix 2: Mobile Menu Button `aria-label` & `aria-expanded`
**File:** `/components/Header.vue`
**Lines:** 34-40
**Time:** 10 min

```diff
  <button
    @click="toggleMobileMenu"
+   :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
+   :aria-expanded="isMobileMenuOpen"
+   aria-controls="mobile-menu"
    class="md:hidden p-2..."
  >
    <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
    <XMarkIcon v-else class="w-6 h-6" />
  </button>

- <div v-if="isMobileMenuOpen" class="md:hidden...">
+ <div id="mobile-menu" v-if="isMobileMenuOpen" class="md:hidden...">
```

### Fix 3: Search Button `aria-label`
**File:** `/components/Header.vue`
**Lines:** 22-29
**Time:** 5 min

```diff
  <NuxtLink
    to="/search"
+   aria-label="Search coaches and schools"
    title="Search"
    class="p-2..."
  >
    <MagnifyingGlassIcon class="w-5 h-5" />
  </NuxtLink>
```

### Fix 4: Icon-Only Buttons Throughout
**Files:** `/components/CoachCard.vue`, similar patterns
**Scope:** All icon-only buttons in card components
**Time:** 30 min

```diff
  <button
    @click="emit('email', coach)"
-   title="Send email"
+   :aria-label="`Send email to ${coach.first_name} ${coach.last_name}`"
    class="p-2..."
  >
    Email
  </button>
```

### Fix 5: Form Field `aria-describedby` Verification
**Files:** All form components under `/components/DesignSystem/Form/`
**Time:** 15 min (verification only)

**Pattern to verify:**
```vue
<input
  :id="inputId"
  :aria-invalid="!!error"
  :aria-describedby="error ? `${inputId}-error` : undefined"
/>
<DesignSystemFieldError v-if="error" :id="`${inputId}-error`" :error="error" />
```

---

## High Priority Fixes (Complete This Week)

### 1. Focus Indicators Enhancement
**Files:** Global Tailwind utilities
**Time:** 2 hours

Add to `tailwind.config.js` or create global style:
```css
@layer utilities {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500;
}
```

Apply to navigation links in `/components/Header/HeaderNav.vue`:
```diff
- :class="[
-   'flex items-center...',
-   isActive(item.to)
-     ? 'bg-brand-blue-100 text-brand-blue-700'
-     : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
- ]"
+ :class="[
+   'flex items-center... focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-600',
+   isActive(item.to)
+     ? 'bg-brand-blue-100 text-brand-blue-700'
+     : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
+ ]"
```

### 2. Dropdown Menu Keyboard Navigation
**File:** `/components/Header/HeaderProfile.vue`
**Time:** 3-4 hours

Key additions needed:
```typescript
const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) {
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      isOpen.value = true;
    }
    return;
  }

  const items = menuRef.value?.querySelectorAll('a, button') || [];
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, items.length - 1);
      (items[selectedIndex.value] as HTMLElement).focus();
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      (items[selectedIndex.value] as HTMLElement).focus();
      break;
    case 'Escape':
      event.preventDefault();
      isOpen.value = false;
      break;
  }
};
```

### 3. Navigation Links `aria-current="page"`
**Files:** `/components/Header.vue` and `/components/Header/HeaderNav.vue`
**Time:** 30 min

```diff
  <NuxtLink
    v-for="item in navItems"
    :to="item.to"
+   :aria-current="isActive(item.to) ? 'page' : undefined"
    :class="[isActive(item.to) ? '...' : '...']"
  >
    <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
    <span>{{ item.label }}</span>
  </NuxtLink>
```

---

## Medium Priority Fixes

### 1. Standardize Skip Link Styling
**File:** `/components/SkipLink.vue`
**Time:** 30 min

```vue
<template>
  <a
    :href="to"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
  >
    {{ text }}
  </a>
</template>
```

Apply to all pages (they currently have inline skip links).

### 2. Add Loading State Announcements
**File:** Any page with loading state
**Time:** 15 min per page

```vue
<div v-if="loading" role="status" aria-live="polite" aria-busy="true">
  <div class="animate-spin..." aria-hidden="true"></div>
  <p>Loading schools...</p>
</div>

<div v-if="!loading && items.length > 0" role="status" aria-live="polite" class="sr-only">
  {{ items.length }} items loaded and displayed
</div>
```

### 3. Profile Dropdown `aria-owns` Relationship
**File:** `/components/Header/HeaderProfile.vue`
**Time:** 10 min

```diff
  <button
    @click="isOpen = !isOpen"
    :aria-label="`User menu for ${userName}`"
    :aria-expanded="isOpen"
    aria-haspopup="menu"
+   aria-owns="profile-menu"
    class="..."
  >
  </button>

  <div
    v-if="isOpen"
+   id="profile-menu"
+   role="menu"
    class="absolute right-0..."
  >
    <NuxtLink to="/settings" role="menuitem" @click="isOpen = false">
      Settings
    </NuxtLink>
```

---

## Testing Checklist

### Before Committing Any A11y Fix
- [ ] Test with keyboard only (Tab, Shift+Tab, Enter, Space, Arrow keys, Escape)
- [ ] Test in at least one screen reader (NVDA on Windows or VoiceOver on Mac)
- [ ] Verify focus indicator is visible at 200% zoom
- [ ] Verify color contrast with WebAIM contrast checker
- [ ] Run Lighthouse accessibility audit
- [ ] Verify fix doesn't break existing tests

### Screen Reader Testing Script
1. Open page
2. Press Tab repeatedly to navigate all interactive elements
3. Verify each element announces:
   - Element type (button, link, menu, etc.)
   - Label or purpose
   - Current state if applicable (checked, expanded, disabled, etc.)
4. Test form fields:
   - Label announced before input
   - Error message associated with field (aria-describedby)
   - Required status announced
5. Test modals:
   - Backdrop keyboard event (Escape closes)
   - Focus trapped within modal
   - Focus restored when closed

### Keyboard Navigation Script
1. Close Eyes (or pretend to)
2. Navigate using only: Tab, Shift+Tab, Enter, Space, Arrow keys
3. Can you:
   - Reach every interactive element?
   - Understand what each element does?
   - See where focus is at all times?
   - Close modals/menus with Escape?
   - Navigate dropdowns with Arrow keys?

---

## Common Patterns to Implement

### Pattern: Icon-Only Button with Label
```vue
<button
  :aria-label="labelText"
  :title="labelText"
  class="p-2 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
  <IconComponent class="w-5 h-5" aria-hidden="true" />
</button>
```

### Pattern: Toggle Menu Button
```vue
<button
  :aria-label="menuOpenLabel"
  :aria-expanded="isOpen"
  aria-haspopup="menu"
  :aria-controls="menuId"
>
  Menu
</button>

<div :id="menuId" v-if="isOpen" role="menu">
  <a href="#" role="menuitem">Item 1</a>
  <a href="#" role="menuitem">Item 2</a>
</div>
```

### Pattern: Form Input with Error
```vue
<label :for="inputId">Email</label>
<input
  :id="inputId"
  type="email"
  :aria-invalid="!!error"
  :aria-describedby="error ? `${inputId}-error` : undefined"
/>
<div v-if="error" :id="`${inputId}-error`" role="alert">
  {{ error }}
</div>
```

### Pattern: Loading State
```vue
<div v-if="loading" role="status" aria-live="polite" aria-busy="true">
  <div class="spinner" aria-hidden="true"></div>
  <p>Loading content...</p>
</div>
```

---

## Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **NVDA Screen Reader (Free):** https://www.nvaccess.org/
- **Color Blindness Simulator:** https://www.color-blindness.com/coblis-color-blindness-simulator/

---

## Key Takeaways

1. **`aria-label`** = accessible name (for icon-only buttons)
2. **`aria-expanded`** = toggle state (for menus, dropdowns, etc.)
3. **`aria-describedby`** = additional info/error messages
4. **`role="menu"` + `role="menuitem"`** = semantic menu structure
5. **Focus visible** = at least 3px ring with 2px offset
6. **Keyboard navigation** = Tab, Shift+Tab, Enter, Space, Arrow keys, Escape
7. **Screen readers need:** Labels, descriptions, state, semantics (roles)

---

**Total Estimated Implementation Time:** 20-30 hours (critical + high priority fixes)
**Re-audit Recommended:** After implementation + user testing with disabled users
