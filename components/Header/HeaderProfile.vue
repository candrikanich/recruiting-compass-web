<template>
  <div class="relative">
    <!-- Profile Button -->
    <button
      ref="triggerRef"
      data-testid="profile-menu"
      @click="isOpen = !isOpen"
      @keydown="handleTriggerKeydown"
      :aria-label="`User menu for ${userName}, currently ${isOpen ? 'open' : 'closed'}`"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      aria-controls="profile-dropdown-menu"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
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

    <!-- Dropdown Menu -->
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
        id="profile-dropdown-menu"
        ref="menuRef"
        role="menu"
        @keydown="handleMenuKeydown"
        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50"
      >
        <!-- User Info -->
        <div class="px-4 py-3 border-b border-slate-200" aria-hidden="true">
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
            to="/help"
            role="menuitem"
            class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:bg-slate-50"
            @click="isOpen = false"
          >
            Help Center
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

    <!-- Backdrop -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useUserStore } from "~/stores/user";
import { useAuth } from "~/composables/useAuth";

const userStore = useUserStore();
const { logout } = useAuth();
const isOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const getMenuItems = () =>
  menuRef.value
    ? Array.from(menuRef.value.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    : [];

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    isOpen.value = true;
    nextTick(() => getMenuItems()[0]?.focus());
  }
};

const handleMenuKeydown = (event: KeyboardEvent) => {
  const items = getMenuItems();
  const current = document.activeElement as HTMLElement;
  const idx = items.indexOf(current);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    items[Math.min(idx + 1, items.length - 1)]?.focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (idx === 0) {
      isOpen.value = false;
      triggerRef.value?.focus();
    } else {
      items[Math.max(idx - 1, 0)]?.focus();
    }
  } else if (event.key === "Escape" || event.key === "Tab") {
    isOpen.value = false;
    if (event.key === "Escape") triggerRef.value?.focus();
  } else if (event.key === "Home") {
    event.preventDefault();
    items[0]?.focus();
  } else if (event.key === "End") {
    event.preventDefault();
    items[items.length - 1]?.focus();
  }
};

const userName = computed(() => {
  const user = userStore?.user;
  if (!user) return "User";
  return user.full_name || user.email || "User";
});

const userEmail = computed(() => {
  return userStore?.user?.email || "";
});

const userInitials = computed(() => {
  const user = userStore?.user;
  if (!user) return "U";
  const name = user.full_name || user.email || "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
});

const profilePhotoUrl = computed(() => {
  return userStore?.user?.profile_photo_url || null;
});

const isAdmin = computed(() => {
  return userStore?.user?.is_admin === true;
});

const handleImageError = () => {
  // Image failed to load, initials will show as fallback
  console.error("Failed to load profile photo in header");
};

const handleLogout = async () => {
  isOpen.value = false;
  await logout();
  await navigateTo("/login");
};
</script>
