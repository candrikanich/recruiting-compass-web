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
        <button
          @click="activeTab = 'invitations'"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === 'invitations'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          ]"
        >
          Pending Invitations ({{ invitations.length }})
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

      <!-- Invitations Section -->
      <div v-else-if="activeTab === 'invitations'" class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Pending Invitations</h2>
        </div>

        <!-- Toolbar with select mode and bulk delete -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <button
              @click="isInvitationSelectMode = !isInvitationSelectMode"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition',
                isInvitationSelectMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              ]"
            >
              {{ isInvitationSelectMode ? 'Cancel Selection' : 'Select Multiple' }}
            </button>

            <button
              v-if="isInvitationSelectMode && selectedInvitationCount > 0"
              @click="showBulkDeleteInvitationsModal = true"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Delete Selected ({{ selectedInvitationCount }})
            </button>
          </div>

          <!-- Filter Buttons -->
          <div class="flex gap-2">
            <button
              v-for="filterType in ['all', 'expiring-soon', 'active']"
              :key="filterType"
              @click="invitationFilter = filterType as InvitationFilterType"
              :class="[
                'px-3 py-1 rounded text-sm font-medium transition',
                invitationFilter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              ]"
            >
              {{ filterType === 'all' ? 'All' : filterType === 'expiring-soon' ? 'Expiring Soon' : 'Active' }}
            </button>
          </div>
        </div>

        <!-- Loading/Error/Table -->
        <div v-if="invitationsLoading" class="text-center py-12">
          <p class="text-slate-600">Loading invitations...</p>
        </div>

        <div v-else-if="invitationsError" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800">{{ invitationsError }}</p>
        </div>

        <div v-else-if="filteredInvitations.length === 0" class="text-center py-12">
          <p class="text-slate-600">No pending invitations found.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th v-if="isInvitationSelectMode" class="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    :checked="allInvitationsSelected"
                    @change="toggleSelectAllInvitations"
                    class="rounded"
                  />
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Sent By</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Role</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Invited Email</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Link ID</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Created</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Expires</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Accept Link</th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="invitation in filteredInvitations"
                :key="invitation.id"
                :class="[
                  'border-b border-slate-100 hover:bg-slate-50',
                  selectedInvitationIds.has(invitation.id) ? 'bg-blue-50' : ''
                ]"
              >
                <td v-if="isInvitationSelectMode" class="py-3 px-4">
                  <input
                    type="checkbox"
                    :checked="selectedInvitationIds.has(invitation.id)"
                    @change="toggleInvitationSelection(invitation.id)"
                    class="rounded"
                  />
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium text-slate-900">{{ invitation.initiator_name || 'Unknown' }}</div>
                  <div class="text-sm text-slate-600">{{ invitation.initiator_email }}</div>
                </td>
                <td class="py-3 px-4 text-sm">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      invitation.initiator_role === 'parent' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    ]"
                  >
                    {{ invitation.initiator_role }}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm text-slate-900">{{ invitation.invited_email }}</td>
                <td class="py-3 px-4 text-sm text-slate-600 font-mono text-xs">
                  {{ invitation.id.slice(0, 8) }}...
                </td>
                <td class="py-3 px-4 text-sm text-slate-600">{{ formatDate(invitation.created_at) }}</td>
                <td class="py-3 px-4 text-sm text-slate-600">{{ formatDate(invitation.expires_at) }}</td>
                <td class="py-3 px-4 text-sm">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getExpiryStatus(invitation.expires_at) === 'expired'
                        ? 'bg-red-100 text-red-800'
                        : getExpiryStatus(invitation.expires_at) === 'expiring-soon'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    ]"
                  >
                    {{ getExpiryStatus(invitation.expires_at) === 'expired' ? 'Expired' :
                       getExpiryStatus(invitation.expires_at) === 'expiring-soon' ? 'Expiring Soon' : 'Active' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm">
                  <a
                    v-if="invitation.invitation_token"
                    :href="`/settings/account-linking?token=${invitation.invitation_token}`"
                    target="_blank"
                    class="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Link
                  </a>
                  <span v-else class="text-slate-400">No token</span>
                </td>
                <td class="py-3 px-4 text-sm">
                  <button
                    @click="deleteInvitation(invitation.id)"
                    :disabled="deletingInvitation === invitation.id"
                    class="text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition"
                  >
                    {{ deletingInvitation === invitation.id ? "Deleting..." : "Delete" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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

  <!-- Bulk Delete Invitations Modal -->
  <BulkDeleteConfirmModal
    :is-open="showBulkDeleteInvitationsModal"
    :emails="Array.from(selectedInvitationIds).map(id =>
      invitations.find(inv => inv.id === id)?.invited_email || ''
    ).filter(Boolean)"
    @confirm="bulkDeleteInvitations"
    @cancel="showBulkDeleteInvitationsModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useToast } from "~/composables/useToast";
import BulkDeleteConfirmModal from "~/components/Admin/BulkDeleteConfirmModal.vue";
import type { PendingInvitation, InvitationFilterType } from "~/types/admin";

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

// Tab state
const activeTab = ref<'users' | 'invitations'>('users');

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

// Invitations state
const invitations = ref<PendingInvitation[]>([]);
const invitationsLoading = ref(false);
const invitationsError = ref<string | null>(null);
const deletingInvitation = ref<string | null>(null);
const isInvitationSelectMode = ref(false);
const selectedInvitationIds = ref<Set<string>>(new Set());
const showBulkDeleteInvitationsModal = ref(false);
const invitationFilter = ref<InvitationFilterType>('all');

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

const filteredInvitations = computed(() => {
  if (invitationFilter.value === 'all') return invitations.value;

  const now = new Date();
  const fortyEightHours = 48 * 60 * 60 * 1000;

  return invitations.value.filter(inv => {
    const expiresAt = new Date(inv.expires_at);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    if (invitationFilter.value === 'expiring-soon') {
      return timeUntilExpiry > 0 && timeUntilExpiry <= fortyEightHours;
    } else { // 'active'
      return timeUntilExpiry > fortyEightHours;
    }
  });
});

const selectedInvitationCount = computed(() => selectedInvitationIds.value.size);

const allInvitationsSelected = computed(() =>
  filteredInvitations.value.length > 0 &&
  selectedInvitationIds.value.size === filteredInvitations.value.length,
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

const fetchInvitations = async () => {
  console.log("[Admin] fetchInvitations called");
  invitationsLoading.value = true;
  invitationsError.value = null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    console.log("[Admin] Token retrieved:", !!token);

    if (!token) {
      throw new Error("Not authenticated");
    }

    console.log("[Admin] Calling /api/admin/pending-invitations...");
    invitations.value = await $fetch("/api/admin/pending-invitations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("[Admin] Invitations loaded:", invitations.value.length);
  } catch (err) {
    invitationsError.value = err instanceof Error ? err.message : "Failed to load invitations";
    console.error("[Admin] Error loading invitations:", invitationsError.value, err);
  } finally {
    invitationsLoading.value = false;
  }
};

const toggleInvitationSelection = (id: string) => {
  if (selectedInvitationIds.value.has(id)) {
    selectedInvitationIds.value.delete(id);
  } else {
    selectedInvitationIds.value.add(id);
  }
};

const toggleSelectAllInvitations = () => {
  if (allInvitationsSelected.value) {
    selectedInvitationIds.value.clear();
  } else {
    filteredInvitations.value.forEach(inv => {
      selectedInvitationIds.value.add(inv.id);
    });
  }
};

const deleteInvitation = async (id: string) => {
  if (!confirm("Delete this invitation?")) return;

  deletingInvitation.value = id;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    await $fetch(`/api/admin/pending-invitations/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    invitations.value = invitations.value.filter(inv => inv.id !== id);
    showToast("Invitation deleted successfully", "success");
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Failed to delete invitation";
    invitationsError.value = errMessage;
    showToast(errMessage, "error");
    console.error(errMessage, err);
  } finally {
    deletingInvitation.value = null;
  }
};

const bulkDeleteInvitations = async () => {
  showBulkDeleteInvitationsModal.value = false;
  const ids = Array.from(selectedInvitationIds.value);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) throw new Error("Not authenticated");

    await $fetch("/api/admin/bulk-delete-invitations", {
      method: "POST",
      body: { invitationIds: ids },
      headers: { Authorization: `Bearer ${token}` },
    });

    invitations.value = invitations.value.filter(inv => !selectedInvitationIds.value.has(inv.id));
    selectedInvitationIds.value.clear();
    isInvitationSelectMode.value = false;
    showToast(`Successfully deleted ${ids.length} invitation(s)`, "success");
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Failed to bulk delete invitations";
    invitationsError.value = errMessage;
    showToast(errMessage, "error");
    console.error(errMessage, err);
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getExpiryStatus = (expiresAt: string): 'expired' | 'expiring-soon' | 'active' => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiry <= 0) return "expired";
  if (hoursUntilExpiry <= 48) return "expiring-soon";
  return "active";
};

onMounted(async () => {
  await loadUsers();
  await fetchInvitations();
});
</script>
