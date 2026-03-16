<template>
  <div
    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
    :class="roleBadgeClass"
  >
    <span>{{ displayName }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useUserById } from "~/composables/useUserById";

interface Props {
  loggedByUserId: string;
  currentUserId: string;
  showRole?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showRole: false,
});

const { user: loggedByUser, fetchUser } = useUserById(props.loggedByUserId);

const displayName = computed(() => {
  if (props.loggedByUserId === props.currentUserId) {
    return "You";
  }

  if (loggedByUser.value) {
    return loggedByUser.value.full_name || "Unknown";
  }

  return "Unknown User";
});

const roleBadgeClass = computed(() => {
  if (!loggedByUser.value) {
    return "bg-slate-100 text-slate-900";
  }

  if (loggedByUser.value.role === "parent") {
    return "bg-blue-100 text-blue-900";
  }

  if (loggedByUser.value.role === "player") {
    return "bg-purple-100 text-purple-900";
  }

  return "bg-slate-100 text-slate-900";
});

onMounted(async () => {
  if (props.loggedByUserId === props.currentUserId) {
    return; // No need to fetch for "You"
  }

  await fetchUser();
});
</script>
