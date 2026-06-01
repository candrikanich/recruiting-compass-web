<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink
          to="/dashboard"
          class="flex items-center hover:opacity-80 transition-opacity"
        >
          <img
            src="@/assets/logos/recruiting-compass-horizontal.svg"
            alt="The Recruiting Compass: Find Your Path. Make Your Move."
            class="h-14 w-auto"
          />
        </NuxtLink>

        <!-- Desktop Navigation -->
        <HeaderNav class="hidden md:flex" />

        <!-- Right Side -->
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/search"
            aria-label="Search coaches and schools"
            title="Search"
            class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
            data-testid="nav-search-button"
          >
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="w-5 h-5"
              aria-hidden="true"
            />
          </NuxtLink>
          <NotificationCenter />
          <HeaderProfile class="hidden md:block" />

          <!-- Mobile Menu Button -->
          <button
            @click="toggleMobileMenu"
            :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="isMobileMenuOpen"
            aria-haspopup="menu"
            aria-controls="mobile-nav-menu"
            class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
          >
            <UIcon
              name="i-heroicons-bars-3"
              v-if="!isMobileMenuOpen"
              class="w-6 h-6"
              aria-hidden="true"
            />
            <UIcon
              name="i-heroicons-x-mark"
              v-else
              class="w-6 h-6"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

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
          id="mobile-nav-menu"
          class="md:hidden py-4 border-t border-slate-200"
        >
          <!-- Navigation -->
          <nav class="space-y-1 mb-4">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              :data-testid="`mobile-nav-${item.to.replace('/', '')}`"
              class="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              :class="
                isActive(item.to)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              "
              @click="closeMobileMenu"
            >
              <UIcon :name="item.icon" class="w-5 h-5" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- Divider -->
          <div class="border-t border-slate-200 my-3" />

          <!-- User Info -->
          <div class="px-3 py-2 mb-2">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
              >
                <span class="font-semibold text-blue-600">{{
                  userInitials
                }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-900 truncate">
                  {{ user?.full_name || "User" }}
                </p>
                <p class="text-sm text-slate-500 truncate">{{ user?.email }}</p>
              </div>
            </div>
          </div>

          <!-- Settings -->
          <nav class="space-y-1">
            <NuxtLink
              v-for="item in settingsItems"
              :key="item.to"
              :to="item.to"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              class="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              @click="closeMobileMenu"
            >
              <UIcon :name="item.icon" class="w-5 h-5" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- Logout -->
          <div class="mt-3 pt-3 border-t border-slate-200">
            <button
              data-testid="mobile-logout-button"
              @click="handleLogout"
              class="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <UIcon
                name="i-heroicons-arrow-right-on-rectangle"
                class="w-5 h-5"
                aria-hidden="true"
              />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Athlete Switcher (Parent View) -->
      <AthleteSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "~/stores/user";
import { useAuth } from "~/composables/useAuth";
import AthleteSwitcher from "~/components/AthleteSwitcher.vue";
import HeaderNav from "~/components/Header/HeaderNav.vue";
import HeaderProfile from "~/components/Header/HeaderProfile.vue";
import NotificationCenter from "~/components/Header/NotificationCenter.vue";
const route = useRoute();
const authComposable = useAuth();

const userStore = useUserStore();
const user = computed(() => userStore.user || null);
const isMobileMenuOpen = ref(false);

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "i-heroicons-home" },
  { to: "/schools", label: "Schools", icon: "i-heroicons-building-library" },
  { to: "/coaches", label: "Coaches", icon: "i-heroicons-user-group" },
  {
    to: "/interactions",
    label: "Interactions",
    icon: "i-heroicons-chat-bubble-left-right",
  },
  { to: "/events", label: "Events", icon: "i-heroicons-calendar-days" },
  { to: "/timeline", label: "Timeline", icon: "i-heroicons-clock" },
  { to: "/performance", label: "Performance", icon: "i-heroicons-chart-bar" },
  { to: "/offers", label: "Offers", icon: "i-heroicons-gift" },
  { to: "/documents", label: "Documents", icon: "i-heroicons-document-text" },
  {
    to: "/settings",
    label: "Settings",
    icon: "i-heroicons-adjustments-horizontal",
  },
  { to: "/search", label: "Search", icon: "i-heroicons-magnifying-glass" },
  { to: "/analytics", label: "Analytics", icon: "i-heroicons-chart-pie" },
];

const settingsItems = [
  {
    to: "/settings/location",
    label: "Home Location",
    icon: "i-heroicons-home",
  },
  {
    to: "/settings/player-details",
    label: "Player Details",
    icon: "i-heroicons-user",
  },
  {
    to: "/settings/school-preferences",
    label: "School Preferences",
    icon: "i-heroicons-adjustments-horizontal",
  },
  {
    to: "/settings/notifications",
    label: "Notifications",
    icon: "i-heroicons-bell",
  },
  {
    to: "/settings/communication-templates",
    label: "Templates",
    icon: "i-heroicons-document-text",
  },
  {
    to: "/settings/family-management",
    label: "Family Management",
    icon: "i-heroicons-adjustments-horizontal",
  },
];

const userInitials = computed(() => {
  if (!user.value?.full_name) return "?";
  return user.value.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const isActive = (path: string): boolean => {
  if (path === "/dashboard") {
    return route.path === "/dashboard";
  }
  return route.path.startsWith(path);
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const handleLogout = async () => {
  if (!userStore?.user) return;
  closeMobileMenu();
  await authComposable.logout();
  userStore.logout();
  await navigateTo("/login");
};

onMounted(() => {
  // Pinia store is guaranteed to be initialized by mount time; no reassignment needed.
});
</script>
