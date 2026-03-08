<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      role="main"
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md text-center">
        <!-- Logo -->
        <div class="mb-8 flex justify-center">
          <NuxtLink
            to="/"
            class="inline-block focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 rounded-sm"
            aria-label="The Recruiting Compass — home"
          >
            <img
              src="/assets/logos/recruiting-compass-stacked.svg"
              alt=""
              class="h-40 w-auto drop-shadow-xl"
            />
          </NuxtLink>
        </div>

        <!-- Card -->
        <div
          class="bg-white/95 backdrop-blur-xs rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Icon -->
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            :class="iconBg"
            aria-hidden="true"
          >
            <component :is="icon" class="w-8 h-8" :class="iconColor" />
          </div>

          <!-- Headline -->
          <h1 class="text-2xl font-bold text-slate-900 mb-3 leading-snug">
            {{ headline }}
          </h1>

          <!-- Body -->
          <p class="text-slate-600 mb-6 leading-relaxed">
            {{ body }}
          </p>

          <!-- Status code (subtle) -->
          <p
            v-if="error.statusCode"
            class="text-xs text-slate-400 font-mono mb-6"
          >
            Error {{ error.statusCode }}
          </p>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              v-if="primaryAction"
              class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              @click="handlePrimary"
            >
              {{ primaryAction.label }}
            </button>
            <button
              v-if="secondaryAction"
              class="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors"
              @click="handleSecondary"
            >
              {{ secondaryAction.label }}
            </button>
          </div>
        </div>

        <!-- Support link -->
        <p class="mt-6 text-white/70 text-sm">
          Need help?
          <a
            href="mailto:support@therecruitingcompass.com"
            class="text-white underline hover:text-white/80 focus:outline-hidden focus:ring-2 focus:ring-white rounded-sm"
          >
            Contact support
          </a>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";

interface NuxtError {
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  stack?: string;
}

interface Action {
  label: string;
  href?: string;
  reload?: boolean;
}

interface ErrorConfig {
  headline: string;
  body: string;
  icon: Component;
  iconBg: string;
  iconColor: string;
  primaryAction: Action;
  secondaryAction?: Action;
}

const props = defineProps<{ error: NuxtError }>();

const config = computed<ErrorConfig>(() => {
  switch (props.error.statusCode) {
    case 404:
      return {
        headline: "That page ran a different route.",
        body: "We couldn't find what you're looking for. It may have moved, or the link might be off.",
        icon: MagnifyingGlassIcon,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-500",
        primaryAction: { label: "Go to Dashboard", href: "/dashboard" },
        secondaryAction: { label: "Search Schools", href: "/schools" },
      };

    case 401:
      return {
        headline: "You'll need to sign in first.",
        body: "This page requires an account. Log in to pick up where you left off.",
        icon: LockClosedIcon,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        primaryAction: { label: "Sign In", href: "/login" },
        secondaryAction: { label: "Create Account", href: "/signup" },
      };

    case 403:
      return {
        headline: "This isn't your playbook.",
        body: "You don't have access to this page. If you think that's a mistake, reach out to the account owner.",
        icon: ShieldExclamationIcon,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        primaryAction: { label: "Go to Dashboard", href: "/dashboard" },
      };

    case 503:
    case 502:
    case 504:
      return {
        headline: "We're taking a timeout.",
        body: "Something on our end isn't cooperating right now. Your recruiting data is safe — we're just temporarily offline. Try again in a few minutes.",
        icon: ClockIcon,
        iconBg: "bg-slate-50",
        iconColor: "text-slate-500",
        primaryAction: { label: "Try Again", reload: true },
        secondaryAction: { label: "Go Home", href: "/" },
      };

    case 500:
      return {
        headline: "We fumbled. It's on us.",
        body: "Something went wrong on our end. Your data is safe, but we hit an unexpected snag. Our team has been notified.",
        icon: ExclamationTriangleIcon,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        primaryAction: { label: "Try Again", reload: true },
        secondaryAction: { label: "Go Home", href: "/" },
      };

    default:
      return {
        headline: "Something went sideways.",
        body: "We hit an unexpected snag. Your data is safe — try refreshing or head back home.",
        icon: ExclamationCircleIcon,
        iconBg: "bg-slate-50",
        iconColor: "text-slate-500",
        primaryAction: { label: "Try Again", reload: true },
        secondaryAction: { label: "Go Home", href: "/" },
      };
  }
});

const headline = computed(() => config.value.headline);
const body = computed(() => config.value.body);
const icon = computed(() => config.value.icon);
const iconBg = computed(() => config.value.iconBg);
const iconColor = computed(() => config.value.iconColor);
const primaryAction = computed(() => config.value.primaryAction);
const secondaryAction = computed(() => config.value.secondaryAction);

function handlePrimary() {
  const action = primaryAction.value;
  if (action.reload) {
    window.location.reload();
  } else if (action.href) {
    clearError({ redirect: action.href });
  }
}

function handleSecondary() {
  const action = secondaryAction.value;
  if (!action) return;
  if (action.reload) {
    window.location.reload();
  } else if (action.href) {
    clearError({ redirect: action.href });
  }
}
</script>
