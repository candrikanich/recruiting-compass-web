<template>
  <div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to App
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p class="text-slate-600">Manage users and system settings</p>
      </div>

      <!-- Tab Navigation -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="selectTab(tab.id)"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Overview Section -->
      <div
        v-if="activeTab === 'overview'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Overview</h2>
        <div v-if="statsLoading" class="text-center py-12 text-slate-600">
          Loading stats...
        </div>
        <div
          v-else-if="statsError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800">{{ statsError }}</p>
        </div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div
            v-for="stat in statsCards"
            :key="stat.key"
            class="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <p class="text-sm font-medium text-slate-500">{{ stat.label }}</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </div>

      <!-- Users Section -->
      <div
        v-if="activeTab === 'users'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Users</h2>

          <!-- Action Toolbar (moved to top) -->
          <div
            v-if="!loading && users.length > 0"
            class="flex items-center gap-4"
          >
            <!-- Select mode toggle -->
            <button
              @click="toggleSelectMode"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition',
                isSelectMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
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
              {{ selectedCount }} user{{ selectedCount !== 1 ? "s" : "" }}
              selected
            </span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <p class="text-slate-600">Loading users...</p>
        </div>

        <!-- Error State -->
        <div
          v-else-if="error"
          class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
        >
          <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Users Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th v-if="isSelectMode" class="py-3 px-4 w-14">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    data-testid="select-all-checkbox"
                    class="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Email
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Name
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Role
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Admin
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in paginatedUsers"
                :key="user.id"
                :class="[
                  'border-b border-slate-100 hover:bg-slate-50',
                  selectedUserEmails.has(user.email) ? 'bg-blue-50' : '',
                ]"
              >
                <td v-if="isSelectMode" class="py-3 px-4">
                  <input
                    v-if="user.email !== currentUserEmailComputed"
                    type="checkbox"
                    :checked="selectedUserEmails.has(user.email)"
                    @change="toggleUserSelection(user.email)"
                    data-testid="user-checkbox"
                    class="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span v-else class="text-slate-400 text-xs font-medium"
                    >Current</span
                  >
                </td>
                <td class="py-3 px-4">
                  <code class="text-sm bg-slate-100 px-2 py-1 rounded">{{
                    user.email
                  }}</code>
                </td>
                <td class="py-3 px-4 text-slate-700">
                  {{ user.full_name || "—" }}
                </td>
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
                    :disabled="
                      user.email === currentUserEmailComputed ||
                      deleting === user.email
                    "
                    class="text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed font-medium transition"
                  >
                    {{ deleting === user.email ? "Deleting..." : "Delete" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div
            v-if="users.length === 0"
            class="text-center py-12 text-slate-500"
          >
            No users found
          </div>

          <!-- Pagination -->
          <div
            v-if="users.length > 0"
            class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4"
          >
            <p class="text-sm text-slate-600">
              Showing
              {{ paginationStart }}–{{ paginationEnd }} of
              {{ users.length }} user{{ users.length !== 1 ? "s" : "" }}
            </p>
            <div class="flex items-center gap-2">
              <label class="text-sm text-slate-600">Per page</label>
              <select
                v-model.number="pageSize"
                class="rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                @change="currentPage = 1"
              >
                <option
                  v-for="size in pageSizeOptions"
                  :key="size"
                  :value="size"
                >
                  {{ size }}
                </option>
              </select>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="currentPage <= 1"
                class="rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="currentPage = currentPage - 1"
              >
                Previous
              </button>
              <template v-for="p in visiblePageNumbers" :key="p">
                <button
                  v-if="p !== 'ellipsis'"
                  type="button"
                  :class="[
                    'min-w-[2.25rem] rounded px-2 py-1.5 text-sm font-medium',
                    p === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  ]"
                  @click="currentPage = p as number"
                >
                  {{ p }}
                </button>
                <span
                  v-else
                  class="px-1 py-1.5 text-slate-400"
                  aria-hidden="true"
                >
                  …
                </span>
              </template>
              <button
                type="button"
                :disabled="currentPage >= totalPages"
                class="rounded px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="currentPage = currentPage + 1"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Invitations Section -->
      <div
        v-if="activeTab === 'pending'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">
          Pending Invitations
        </h2>
        <p class="text-sm text-slate-600 mb-4">
          Account link invitations awaiting acceptance. Cancel to revoke.
        </p>
        <div v-if="invitationsLoading" class="text-center py-12 text-slate-600">
          Loading...
        </div>
        <div
          v-else-if="invitationsError"
          class="bg-amber-50 border border-amber-200 rounded-lg p-4"
        >
          <p class="text-amber-800">{{ invitationsError }}</p>
        </div>
        <div
          v-else-if="pendingInvitations.length === 0"
          class="py-12 text-slate-500 text-center"
        >
          No pending invitations
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Invited email
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Initiator role
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Created
                </th>
                <th class="text-left py-3 px-4 font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inv in pendingInvitations"
                :key="inv.id"
                class="border-b border-slate-100 hover:bg-slate-50"
              >
                <td class="py-3 px-4">
                  <code class="text-sm bg-slate-100 px-2 py-1 rounded">{{
                    inv.invited_email
                  }}</code>
                </td>
                <td class="py-3 px-4 text-slate-700">
                  {{ inv.initiator_role }}
                </td>
                <td class="py-3 px-4 text-slate-700">
                  {{ inv.created_at ? formatDate(inv.created_at) : "—" }}
                </td>
                <td class="py-3 px-4">
                  <button
                    type="button"
                    :disabled="deletingInvitationId === inv.id"
                    class="text-red-600 hover:text-red-800 disabled:opacity-50 font-medium text-sm"
                    @click="cancelInvitation(inv.id)"
                  >
                    {{
                      deletingInvitationId === inv.id
                        ? "Cancelling..."
                        : "Cancel"
                    }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Health Section -->
      <div
        v-if="activeTab === 'health'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">System Health</h2>
        <div v-if="healthLoading" class="text-center py-12 text-slate-600">
          Checking...
        </div>
        <div
          v-else-if="healthError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800">{{ healthError }}</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="check in healthChecks"
            :key="check.name"
            class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
            :class="
              check.status === 'ok'
                ? 'bg-green-50/50 border-green-200'
                : 'bg-red-50/50 border-red-200'
            "
          >
            <span
              class="inline-block w-3 h-3 rounded-full shrink-0"
              :class="check.status === 'ok' ? 'bg-green-500' : 'bg-red-500'"
              aria-hidden="true"
            />
            <span class="font-medium text-slate-900">{{ check.name }}</span>
            <span v-if="check.message" class="text-slate-600 text-sm">
              {{ check.message }}
            </span>
          </div>
          <p class="mt-4 text-sm text-slate-500">
            Overall:
            {{ healthOk ? "All critical checks passed" : "Some checks failed" }}
          </p>
        </div>
      </div>

      <!-- Tools Section -->
      <div
        v-if="activeTab === 'tools'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Tools</h2>
        <p class="text-slate-600 mb-6">Quick links to admin utilities.</p>
        <div class="flex flex-wrap gap-4">
          <NuxtLink
            to="/admin/signup"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Invite admin user
          </NuxtLink>
          <NuxtLink
            to="/admin/batch-fetch-logos"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Batch fetch school logos
          </NuxtLink>
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
import {
  ref,
  computed,
  onMounted,
  watch,
  defineAsyncComponent,
} from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useToast } from "~/composables/useToast";
const BulkDeleteConfirmModal = defineAsyncComponent(
  () => import("~/components/Admin/BulkDeleteConfirmModal.vue"),
);

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
const activeTab = ref("overview");

// Overview / stats
const stats = ref<{
  users: number;
  schools: number;
  coaches: number;
  interactions: number;
  family_units: number;
} | null>(null);
const statsLoading = ref(false);
const statsError = ref<string | null>(null);

// Health
const health = ref<{
  ok: boolean;
  checks: { name: string; status: string; message?: string }[];
} | null>(null);
const healthLoading = ref(false);
const healthError = ref<string | null>(null);

// Pending invitations
const pendingInvitations = ref<
  {
    id: string;
    invited_email: string;
    status: string;
    initiator_role: string;
    created_at: string | null;
  }[]
>([]);
const invitationsLoading = ref(false);
const invitationsError = ref<string | null>(null);
const deletingInvitationId = ref<string | null>(null);

const tabs = computed(() => [
  { id: "overview", label: "Overview" },
  { id: "users", label: `Users (${users.value.length})` },
  { id: "pending", label: "Pending invitations" },
  { id: "health", label: "Health" },
  { id: "tools", label: "Tools" },
]);

// Pagination
const pageSizeOptions = [10, 25, 50, 100];
const pageSize = ref(25);
const currentPage = ref(1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(users.value.length / pageSize.value)),
);

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return users.value.slice(start, start + pageSize.value);
});

const paginationStart = computed(() =>
  users.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1,
);

const paginationEnd = computed(() =>
  Math.min(currentPage.value * pageSize.value, users.value.length),
);

const visiblePageNumbers = computed(() => {
  const total = totalPages.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p = currentPage.value;
  if (p <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (p >= total - 3)
    return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", p - 1, p, p + 1, "ellipsis", total];
});

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

const allSelected = computed(
  () =>
    selectableUsers.value.length > 0 &&
    selectedUserEmails.value.size === selectableUsers.value.length,
);

const statsCards = computed(() => {
  const s = stats.value;
  if (!s) return [];
  return [
    { key: "users", label: "Users", value: s.users },
    { key: "schools", label: "Schools", value: s.schools },
    { key: "coaches", label: "Coaches", value: s.coaches },
    { key: "interactions", label: "Interactions", value: s.interactions },
    { key: "family_units", label: "Family units", value: s.family_units },
  ];
});

const healthChecks = computed(() => health.value?.checks ?? []);
const healthOk = computed(() => health.value?.ok ?? false);

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

const loadStats = async () => {
  statsLoading.value = true;
  statsError.value = null;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/stats", { headers });
    if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
    stats.value = await res.json();
  } catch (err) {
    statsError.value =
      err instanceof Error ? err.message : "Failed to load stats";
  } finally {
    statsLoading.value = false;
  }
};

const loadHealth = async () => {
  healthLoading.value = true;
  healthError.value = null;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/health", { headers });
    if (!res.ok) throw new Error(`Failed to load health: ${res.status}`);
    health.value = await res.json();
  } catch (err) {
    healthError.value =
      err instanceof Error ? err.message : "Failed to load health";
  } finally {
    healthLoading.value = false;
  }
};

const loadInvitations = async () => {
  invitationsLoading.value = true;
  invitationsError.value = null;
  try {
    const headers = await getAuthHeaders();
    const httpRes = await fetch("/api/admin/pending-invitations", {
      headers,
    });
    if (!httpRes.ok)
      throw new Error(`Failed to load invitations: ${httpRes.status}`);
    const res = (await httpRes.json()) as {
      invitations: {
        id: string;
        invited_email: string;
        status: string;
        initiator_role: string;
        created_at: string | null;
      }[];
      error?: string;
    };
    pendingInvitations.value = res.invitations ?? [];
    if (res.error) invitationsError.value = res.error;
  } catch (err) {
    invitationsError.value =
      err instanceof Error ? err.message : "Failed to load invitations";
  } finally {
    invitationsLoading.value = false;
  }
};

function selectTab(tabId: string) {
  activeTab.value = tabId;
  if (tabId === "overview") loadStats();
  else if (tabId === "health") loadHealth();
  else if (tabId === "pending") loadInvitations();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const cancelInvitation = async (id: string) => {
  deletingInvitationId.value = id;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/pending-invitations/${id}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error(`Failed to cancel invitation: ${res.status}`);
    pendingInvitations.value = pendingInvitations.value.filter(
      (inv) => inv.id !== id,
    );
    showToast("Invitation cancelled", "success");
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to cancel invitation",
      "error",
    );
  } finally {
    deletingInvitationId.value = null;
  }
};

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

    const httpRes = await fetch("/api/admin/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!httpRes.ok) throw new Error(`Failed to load users: ${httpRes.status}`);
    const response = await httpRes.json();

    // Show all users in the list; current user is non-deletable/non-selectable in the UI
    users.value = (response?.users || []) as User[];
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

  if (
    !confirm(
      `Are you sure you want to delete ${email}? This action cannot be undone.`,
    )
  ) {
    return;
  }

  deleting.value = email;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("Not authenticated");
    }

    const httpRes = await fetch("/api/admin/delete-user", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!httpRes.ok)
      throw new Error(`Failed to delete user: ${httpRes.status}`);
    const response = await httpRes.json();

    if (response.success) {
      users.value = users.value.filter((u) => u.email !== email);
      showToast(`User ${email} deleted successfully`, "success");
    }
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : "Failed to delete user";
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

    const httpRes = await fetch("/api/admin/bulk-delete-users", {
      method: "POST",
      body: JSON.stringify({ emails: Array.from(selectedUserEmails.value) }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!httpRes.ok)
      throw new Error(`Failed to bulk delete users: ${httpRes.status}`);
    const response = await httpRes.json();

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
        .map((e: any) => `${e.email}: ${e.reason}`)
        .join("\n");
      error.value = `Failed to delete:\n${errorDetails}`;
    }
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : "Failed to bulk delete users";
    error.value = errMessage;
    showToast(errMessage, "error");
    console.error(errMessage, err);
  } finally {
    bulkDeleting.value = false;
  }
};

watch(totalPages, (total) => {
  if (currentPage.value > total) {
    currentPage.value = total;
  }
});

onMounted(async () => {
  await loadUsers();
  if (activeTab.value === "overview") await loadStats();
});
</script>
