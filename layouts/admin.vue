<script setup lang="ts">
const links = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/invitations", label: "Invitations" },
  { to: "/admin/health", label: "Health" },
  { to: "/admin/jobs", label: "Jobs" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/admin/tools", label: "Tools" },
];
const route = useRoute();
function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to);
}
</script>

<template>
  <div class="min-h-screen bg-brand-slate-50">
    <nav class="border-b border-brand-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium"
          :class="isActive(link)
            ? 'border-brand-blue-600 text-brand-blue-700'
            : 'border-transparent text-brand-slate-500 hover:text-brand-slate-800'"
        >{{ link.label }}</NuxtLink>
      </div>
    </nav>
    <main class="mx-auto max-w-6xl px-4 py-6"><slot /></main>
  </div>
</template>
