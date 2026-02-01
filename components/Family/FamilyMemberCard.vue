<template>
  <div
    :class="[
      'border rounded-lg p-4',
      member.role === 'student'
        ? 'border-blue-200 bg-blue-50'
        : 'border-green-200 bg-green-50',
    ]"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h3
            class="font-semibold"
            :class="[
              member.role === 'student' ? 'text-blue-900' : 'text-green-900',
            ]"
          >
            {{ member.users?.full_name || member.users?.email }}
          </h3>
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-medium',
              member.role === 'student'
                ? 'bg-blue-200 text-blue-800'
                : 'bg-green-200 text-green-800',
            ]"
          >
            {{ member.role === "student" ? "👤 Student" : "👨‍👩‍👧 Parent" }}
          </span>
        </div>
        <p
          class="text-sm"
          :class="[
            member.role === 'student' ? 'text-blue-700' : 'text-green-700',
          ]"
        >
          {{ member.users?.email }}
        </p>
        <p
          v-if="member.added_at"
          class="text-xs mt-1"
          :class="[
            member.role === 'student' ? 'text-blue-600' : 'text-green-600',
          ]"
        >
          Joined {{ formatDate(member.added_at) }}
        </p>
      </div>

      <!-- Remove button for parents (only visible to students) -->
      <button
        v-if="isStudent && member.role === 'parent'"
        @click="$emit('remove', member.id)"
        class="ml-4 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
        title="Remove this parent from your family"
      >
        ✕ Remove
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  added_at: string;
  users: User;
}

defineProps<{
  member: FamilyMember;
  isStudent: boolean;
}>();

defineEmits<{
  remove: [memberId: string];
}>();

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "unknown date";
  }
};
</script>
