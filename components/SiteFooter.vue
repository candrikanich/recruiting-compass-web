<template>
  <footer class="py-6 text-center text-sm" :class="footerClass">
    <div class="flex flex-wrap items-center justify-center gap-4">
      <NuxtLink to="/legal/privacy" class="transition-colors" :class="linkClass">
        Privacy Policy
      </NuxtLink>
      <span aria-hidden="true" :class="dividerClass">·</span>
      <NuxtLink to="/legal/terms" class="transition-colors" :class="linkClass">
        Terms of Service
      </NuxtLink>
      <span aria-hidden="true" :class="dividerClass">·</span>
      <NuxtLink to="/help" class="transition-colors" :class="linkClass">
        Help
      </NuxtLink>
      <span aria-hidden="true" :class="dividerClass">·</span>
      <a href="mailto:support@therecruitingcompass.com" class="transition-colors" :class="linkClass">
        Contact
      </a>
    </div>

    <!-- Social links -->
    <div class="mt-3 flex items-center justify-center gap-4">
      <a
        href="https://www.facebook.com/profile.php?id=61583735402026"
        target="_blank"
        rel="noopener noreferrer"
        :class="iconClass"
        aria-label="Facebook"
      >
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
        </svg>
      </a>
      <a
        href="https://x.com/RecruitCompass"
        target="_blank"
        rel="noopener noreferrer"
        :class="iconClass"
        aria-label="X (Twitter)"
      >
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </div>

    <p class="mt-2" :class="mutedClass">
      © {{ new Date().getFullYear() }} The Recruiting Compass
    </p>
  </footer>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: "light" | "dark";
  }>(),
  { variant: "dark" },
);

const footerClass = computed(() =>
  props.variant === "light"
    ? "text-white/70"
    : "text-slate-500",
);

const linkClass = computed(() =>
  props.variant === "light"
    ? "text-white/80 hover:text-white underline-offset-2 hover:underline"
    : "text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline",
);

const dividerClass = computed(() =>
  props.variant === "light" ? "text-white/40" : "text-slate-300",
);

const mutedClass = computed(() =>
  props.variant === "light" ? "text-white/50" : "text-slate-400",
);

const iconClass = computed(() =>
  props.variant === "light"
    ? "text-white/60 hover:text-white transition-colors"
    : "text-slate-400 hover:text-slate-700 transition-colors",
);
</script>
