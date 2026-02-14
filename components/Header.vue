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
            alt="Recruiting Compass"
            class="h-32 w-auto"
          />
        </NuxtLink>

        <!-- Desktop Navigation -->
        <HeaderNav class="hidden md:flex" />

        <!-- Right Side -->
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/search"
            class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
            title="Search"
            data-testid="nav-search-button"
          >
            <MagnifyingGlassIcon class="w-5 h-5" />
          </NuxtLink>
          <NotificationCenter />
          <HeaderProfile class="hidden md:block" />

          <!-- Mobile Menu Button -->
          <button
            @click="toggleMobileMenu"
            class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
          >
            <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" />
            <XMarkIcon v-else class="w-6 h-6" />
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
          class="md:hidden py-4 border-t border-slate-200"
        >
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
              class="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition"
              @click="closeMobileMenu"
            >
              <component :is="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <!-- Logout -->
          <div class="mt-3 pt-3 border-t border-slate-200">
            <button
              data-testid="mobile-logout-button"
              @click="handleLogout"
              class="flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <ArrowRightOnRectangleIcon class="w-5 h-5" />
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
import { useSupabase } from "~/composables/useSupabase";
import AthleteSwitcher from "~/components/AthleteSwitcher.vue";
import HeaderNav from "~/components/Header/HeaderNav.vue";
import HeaderProfile from "~/components/Header/HeaderProfile.vue";
import NotificationCenter from "~/components/Header/NotificationCenter.vue";
import {
  Bars3Icon,
  XMarkIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  ChartBarIcon,
  HomeIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
  BellIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChartPieIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
const supabase = useSupabase();

let userStore = useUserStore();
const user = computed(() => userStore.user || null);
const isMobileMenuOpen = ref(false);

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { to: "/schools", label: "Schools", icon: BuildingLibraryIcon },
  { to: "/coaches", label: "Coaches", icon: UserGroupIcon },
  { to: "/interactions", label: "Interactions", icon: ChatBubbleLeftRightIcon },
  { to: "/events", label: "Events", icon: CalendarDaysIcon },
  { to: "/timeline", label: "Timeline", icon: ClockIcon },
  { to: "/performance", label: "Performance", icon: ChartBarIcon },
  { to: "/offers", label: "Offers", icon: GiftIcon },
  { to: "/documents", label: "Documents", icon: DocumentTextIcon },
  { to: "/settings", label: "Settings", icon: AdjustmentsHorizontalIcon },
  { to: "/search", label: "Search", icon: MagnifyingGlassIcon },
  { to: "/analytics", label: "Analytics", icon: ChartPieIcon },
];

const settingsItems = [
  { to: "/settings/location", label: "Home Location", icon: HomeIcon },
  { to: "/settings/player-details", label: "Player Details", icon: UserIcon },
  {
    to: "/settings/school-preferences",
    label: "School Preferences",
    icon: AdjustmentsHorizontalIcon,
  },
  { to: "/settings/notifications", label: "Notifications", icon: BellIcon },
  {
    to: "/settings/communication-templates",
    label: "Templates",
    icon: DocumentTextIcon,
  },
  {
    to: "/settings/family-management",
    label: "Family Management",
    icon: AdjustmentsHorizontalIcon,
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
  await supabase.auth.signOut();
  userStore.logout();
  await navigateTo("/login");
};

onMounted(() => {
  try {
    userStore = useUserStore();
  } catch (err) {
    // Pinia may not be ready during certain navigation phases
    console.debug("Header: Pinia not ready on mount", err);
  }
});
</script>
