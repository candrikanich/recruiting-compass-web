<template>
  <div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to App
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p class="text-slate-600">Manage users and system settings</p>
      </div>

      <!-- Users Section -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Users</h2>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <p class="text-slate-600">Loading users...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Users Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Role</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Admin</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="border-b border-slate-100 hover:bg-slate-50">
                <td class="py-3 px-4">
                  <code class="text-sm bg-slate-100 px-2 py-1 rounded">{{ user.email }}</code>
                </td>
                <td class="py-3 px-4 text-slate-700">{{ user.full_name || "—" }}</td>
                <td class="py-3 px-4 text-slate-700">{{ user.role }}</td>
                <td class="py-3 px-4">
                  <span
                    v-if="user.is_admin"
                    class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    Yes
                  </span>
                  <span v-else class="text-slate-500">No</span>
                </td>
                <td class="py-3 px-4">
                  <button
                    @click="deleteUser(user.email)"
                    :disabled="user.email === currentUserEmail || deleting === user.email"
                    class="text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition"
                  >
                    {{ deleting === user.email ? "Deleting..." : "Delete" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="users.length === 0" class="text-center py-12 text-slate-500">
            No users found
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";

definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
}

const { session } = useAuth();
const supabase = useSupabase();

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const deleting = ref<string | null>(null);

const currentUserEmail = computed(() => {
  const sessionValue = session.value;
  return sessionValue?.user?.email || "";
});

const loadUsers = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Get fresh session to ensure token is available
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    // Fetch all users via admin API
    const response = await $fetch("/api/admin/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("[Admin] API Response:", response);
    console.log("[Admin] Total users from API:", response?.users?.length);
    console.log("[Admin] Current user email:", currentUserEmail.value);

    // Filter out the current user from the list
    const filteredUsers = (response?.users || []).filter(
      (u) => u.email !== currentUserEmail.value,
    );

    console.log("[Admin] Filtered users (excluding current):", filteredUsers.length);

    users.value = filteredUsers;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load users";
    console.error("[Admin] Error loading users:", error.value, err);
  } finally {
    loading.value = false;
  }
};

const deleteUser = async (email: string) => {
  if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
    return;
  }

  deleting.value = email;

  try {
    // Get fresh session to ensure token is available
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    // Call POST endpoint to delete user
    const response = await $fetch("/api/admin/delete-user", {
      method: "POST",
      body: { email },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.success) {
      // Remove from local list
      users.value = users.value.filter((u) => u.email !== email);
      alert(`User ${email} deleted successfully`);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to delete user";
    console.error(error.value, err);
  } finally {
    deleting.value = null;
  }
};

onMounted(() => {
  loadUsers();
});
</script>
