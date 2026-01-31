<template>
  <div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to App
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p class="text-slate-600">Manage users and system settings</p>
      </div>

      <!-- Tab Navigation -->
      <div class="flex gap-4 mb-8">
        <button
          @click="activeTab = 'users'"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          ]"
        >
          Users ({{ users.length }})
        </button>
      </div>

      <!-- Users Section -->
      <div v-if="activeTab === 'users'" class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Users</h2>

          <!-- Action Toolbar (moved to top) -->
          <div v-if="!loading && users.length > 0" class="flex items-center gap-4">
            <!-- Select mode toggle -->
            <button
              @click="toggleSelectMode"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition',
                isSelectMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              ]"
              data-testid="select-mode-toggle"
            >
              {{ isSelectMode ? "Exit Select Mode" : "Select Users" }}
            </button>

            <!-- Bulk delete (visible when users selected) -->
            <button
              v-if="selectedCount > 0"
              @click="showBulkDeleteModal = true"
              :disabled="bulkDeleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed font-medium transition"
              data-testid="bulk-delete-btn"
            >
              {{ bulkDeleting ? "Deleting..." : `Delete ${selectedCount}` }}
            </button>

            <!-- Selected count -->
            <span v-if="selectedCount > 0" class="text-slate-700 font-medium">
              {{ selectedCount }} user{{ selectedCount !== 1 ? "s" : "" }} selected
            </span>
          </div>
        </div>

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
                <th v-if="isSelectMode" class="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    data-testid="select-all-checkbox"
                    class="rounded"
                  />
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Name</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Role</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Admin</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
                :class="[
                  'border-b border-slate-100 hover:bg-slate-50',
                  selectedUserEmails.has(user.email) ? 'bg-blue-50' : ''
                ]"
              >
                <td v-if="isSelectMode" class="py-3 px-4">
                  <input
                    v-if="user.email !== currentUserEmailComputed"
                    type="checkbox"
                    :checked="selectedUserEmails.has(user.email)"
                    @change="toggleUserSelection(user.email)"
                    data-testid="user-checkbox"
                    class="rounded"
                  />
                  <span v-else class="text-slate-400 text-xs font-medium">Current</span>
                </td>
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
                    :disabled="user.email === currentUserEmailComputed || deleting === user.email"
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

  <!-- Bulk Delete Users Modal -->
  <BulkDeleteConfirmModal
    :is-open="showBulkDeleteModal"
    :emails="Array.from(selectedUserEmails)"
    @confirm="bulkDeleteUsers"
    @cancel="showBulkDeleteModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useToast } from "~/composables/useToast";
import BulkDeleteConfirmModal from "~/components/Admin/BulkDeleteConfirmModal.vue";

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
const { showToast } = useToast();

// Users state
const users = ref<User[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const deleting = ref<string | null>(null);
const isSelectMode = ref(false);
const selectedUserEmails = ref<Set<string>>(new Set());
const bulkDeleting = ref(false);
const showBulkDeleteModal = ref(false);
const currentUserEmail = ref<string>("");


const currentUserEmailComputed = computed(() => {
  const sessionValue = session.value;
  const email = sessionValue?.user?.email || currentUserEmail.value;
  if (email && email !== currentUserEmail.value) {
    currentUserEmail.value = email;
  }
  return email;
});

const selectableUsers = computed(() =>
  users.value.filter((u) => u.email !== currentUserEmailComputed.value),
);

const selectedCount = computed(() => selectedUserEmails.value.size);

const allSelected = computed(() =>
  selectableUsers.value.length > 0 &&
  selectedUserEmails.value.size === selectableUsers.value.length,
);


const loadUsers = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const userEmail = sessionData.session?.user?.email;

    if (!token) {
      throw new Error("Not authenticated");
    }

    if (userEmail) {
      currentUserEmail.value = userEmail;
    }

    const response = await $fetch("/api/admin/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("[Admin] API Response:", response);
    console.log("[Admin] Total users from API:", response?.users?.length);
    console.log("[Admin] Current user email:", currentUserEmail.value);

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

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value;
  if (!isSelectMode.value) {
    selectedUserEmails.value.clear();
  }
};

const toggleUserSelection = (email: string) => {
  if (email === currentUserEmailComputed.value) return;

  if (selectedUserEmails.value.has(email)) {
    selectedUserEmails.value.delete(email);
  } else {
    selectedUserEmails.value.add(email);
  }
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedUserEmails.value.clear();
  } else {
    selectableUsers.value.forEach((user) => {
      selectedUserEmails.value.add(user.email);
    });
  }
};

const deleteUser = async (email: string) => {
  if (email === currentUserEmailComputed.value) {
    showToast("Cannot delete your own account", "error");
    return;
  }

  if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
    return;
  }

  deleting.value = email;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await $fetch("/api/admin/delete-user", {
      method: "POST",
      body: { email },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.success) {
      users.value = users.value.filter((u) => u.email !== email);
      showToast(`User ${email} deleted successfully`, "success");
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Failed to delete user";
    error.value = errMessage;
    showToast(errMessage, "error");
    console.error(errMessage, err);
  } finally {
    deleting.value = null;
  }
};

const bulkDeleteUsers = async () => {
  showBulkDeleteModal.value = false;
  bulkDeleting.value = true;
  error.value = null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) throw new Error("Not authenticated");

    const response = await $fetch("/api/admin/bulk-delete-users", {
      method: "POST",
      body: { emails: Array.from(selectedUserEmails.value) },
      headers: { Authorization: `Bearer ${token}` },
    });

    // Remove deleted users from table
    users.value = users.value.filter(
      (u) => !response.deletedEmails.includes(u.email),
    );

    // Clear selection and exit select mode
    selectedUserEmails.value.clear();
    isSelectMode.value = false;

    // Show success toast
    const successMsg = `Successfully deleted ${response.success} user(s)`;
    showToast(
      response.failed > 0
        ? `${successMsg} (${response.failed} failed)`
        : successMsg,
      response.failed > 0 ? "warning" : "success",
    );

    // Show error details if any
    if (response.failed > 0 && response.errors.length > 0) {
      console.error("Bulk delete errors:", response.errors);
      const errorDetails = response.errors
        .map((e) => `${e.email}: ${e.reason}`)
        .join("\n");
      error.value = `Failed to delete:\n${errorDetails}`;
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Failed to bulk delete users";
    error.value = errMessage;
    showToast(errMessage, "error");
    console.error(errMessage, err);
  } finally {
    bulkDeleting.value = false;
  }
};

onMounted(async () => {
  await loadUsers();
});
</script>
