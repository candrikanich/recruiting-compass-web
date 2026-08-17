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

        <!-- Search / Filter Bar -->
        <div
          v-if="!loading && !error"
          class="flex flex-wrap items-center gap-3 mb-5"
        >
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search by email, name, or role…"
            class="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            data-testid="user-search-input"
          />
          <select
            v-model="filterAdmin"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            data-testid="user-admin-filter"
          >
            <option value="all">All accounts</option>
            <option value="yes">Admins only</option>
            <option value="no">Non-admins only</option>
          </select>
          <button
            v-if="searchQuery || filterAdmin !== 'all'"
            type="button"
            class="text-sm text-slate-500 hover:text-slate-700 underline"
            @click="clearFilters"
          >
            Clear filters
          </button>
          <span
            v-if="searchQuery || filterAdmin !== 'all'"
            class="text-sm text-slate-500"
          >
            {{ filteredUsers.length }} of {{ users.length }} user{{
              users.length !== 1 ? "s" : ""
            }}
          </span>
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
                    class="h-5 w-5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                    class="h-5 w-5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span v-else class="text-slate-400 text-xs font-medium"
                    >Current</span
                  >
                </td>
                <td class="py-3 px-4">
                  <code class="text-sm bg-slate-100 px-2 py-1 rounded-sm">{{
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
            v-if="filteredUsers.length === 0"
            class="text-center py-12 text-slate-500"
          >
            {{
              users.length === 0
                ? "No users found"
                : "No users match your search"
            }}
          </div>

          <!-- Pagination -->
          <div
            v-if="filteredUsers.length > 0"
            class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4"
          >
            <p class="text-sm text-slate-600">
              Showing
              {{ paginationStart }}–{{ paginationEnd }} of
              {{ filteredUsers.length }} user{{
                filteredUsers.length !== 1 ? "s" : ""
              }}
            </p>
            <div class="flex items-center gap-2">
              <label class="text-sm text-slate-600">Per page</label>
              <select
                v-model.number="pageSize"
                class="rounded-sm border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                class="rounded-sm px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="currentPage = currentPage - 1"
              >
                Previous
              </button>
              <template v-for="p in visiblePageNumbers" :key="p">
                <button
                  v-if="p !== 'ellipsis'"
                  type="button"
                  :class="[
                    'min-w-9 rounded-sm px-2 py-1.5 text-sm font-medium',
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
                class="rounded-sm px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="currentPage = currentPage + 1"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Delete by email (handles orphaned auth accounts not shown in the list) -->
        <div
          v-if="!loading"
          class="mt-8 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <h3 class="text-sm font-semibold text-red-900 mb-1">
            Delete account by email
          </h3>
          <p class="text-xs text-red-700 mb-3">
            Use this to delete accounts that don't appear in the list above
            (e.g. orphaned auth records where signup didn't complete).
          </p>
          <div class="flex gap-2">
            <input
              v-model="deleteByEmailInput"
              type="email"
              autocomplete="off"
              placeholder="user@example.com"
              class="flex-1 rounded-sm border border-red-300 bg-white px-3 py-1.5 text-sm focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500"
              data-testid="delete-by-email-input"
              @keyup.enter="deleteUserByEmail"
            />
            <button
              type="button"
              :disabled="!deleteByEmailInput.trim() || !!deleting"
              class="rounded-sm bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="delete-by-email-btn"
              @click="deleteUserByEmail"
            >
              {{ deleting ? "Deleting…" : "Delete" }}
            </button>
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
                  <code class="text-sm bg-slate-100 px-2 py-1 rounded-sm">{{
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

      <!-- Jobs (cron) Section -->
      <div
        v-if="activeTab === 'jobs'"
        class="bg-white rounded-lg shadow-md p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-900">Scheduled Jobs</h2>
          <button
            @click="loadCronRuns"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        <div v-if="cronLoading" class="text-center py-12 text-slate-600">
          Loading job history...
        </div>
        <div
          v-else-if="cronError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-red-800">{{ cronError }}</p>
        </div>
        <div v-else class="space-y-6">
          <!-- Per-job status cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="job in jobs"
              :key="job.jobName"
              class="rounded-lg border p-4"
              :class="cronCardClass(job)"
            >
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-3 h-3 rounded-full shrink-0"
                  :class="cronDotClass(job)"
                  aria-hidden="true"
                />
                <span class="font-semibold text-slate-900">{{
                  job.jobName
                }}</span>
                <span
                  v-if="job.stale"
                  class="ml-auto text-xs font-medium text-red-700 bg-red-100 rounded px-2 py-0.5"
                >
                  STALE
                </span>
                <span
                  v-else-if="job.neverRun"
                  class="ml-auto text-xs font-medium text-slate-500 bg-slate-100 rounded px-2 py-0.5"
                >
                  PENDING
                </span>
              </div>
              <dl class="mt-3 text-sm space-y-1 text-slate-600">
                <div class="flex justify-between gap-4">
                  <dt>Schedule</dt>
                  <dd class="font-mono text-slate-500">{{ job.schedule }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Last run</dt>
                  <dd>
                    <span :class="cronStatusText(job.lastRun?.status)">{{
                      job.lastRun?.status ?? "never"
                    }}</span>
                    <span v-if="job.lastRun" class="text-slate-400">
                      · {{ formatCronTime(job.lastRun.started_at) }}</span
                    >
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Last success</dt>
                  <dd>{{ formatCronTime(job.lastSuccessAt) }}</dd>
                </div>
                <div
                  v-if="job.lastRun?.rows_processed != null"
                  class="flex justify-between gap-4"
                >
                  <dt>Rows</dt>
                  <dd>
                    {{ job.lastRun.rows_processed }} processed<span
                      v-if="job.lastRun.rows_failed"
                      class="text-red-600"
                    >
                      · {{ job.lastRun.rows_failed }} failed</span
                    >
                  </dd>
                </div>
                <div
                  v-if="job.lastRun?.duration_ms != null"
                  class="flex justify-between gap-4"
                >
                  <dt>Duration</dt>
                  <dd>{{ formatDuration(job.lastRun.duration_ms) }}</dd>
                </div>
                <p
                  v-if="job.lastRun?.error"
                  class="text-red-700 bg-red-50 rounded p-2 mt-2 break-words"
                >
                  {{ job.lastRun.error }}
                </p>
              </dl>
            </div>
          </div>

          <!-- Recent runs -->
          <div>
            <h3 class="text-lg font-semibold text-slate-900 mb-3">
              Recent runs
            </h3>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr
                    class="text-left text-slate-500 border-b border-slate-200"
                  >
                    <th class="py-2 pr-4 font-medium">Job</th>
                    <th class="py-2 pr-4 font-medium">Status</th>
                    <th class="py-2 pr-4 font-medium">Started</th>
                    <th class="py-2 pr-4 font-medium">Duration</th>
                    <th class="py-2 pr-4 font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="run in recent"
                    :key="run.id"
                    class="border-b border-slate-100"
                  >
                    <td class="py-2 pr-4 font-medium text-slate-800">
                      {{ run.job_name }}
                    </td>
                    <td class="py-2 pr-4">
                      <span :class="cronStatusText(run.status)">{{
                        run.status
                      }}</span>
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      {{ formatCronTime(run.started_at) }}
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      {{ formatDuration(run.duration_ms) }}
                    </td>
                    <td class="py-2 pr-4 text-slate-500">
                      <span v-if="run.rows_processed != null">{{
                        run.rows_processed
                      }}</span>
                      <span v-if="run.rows_failed" class="text-red-600">
                        ({{ run.rows_failed }} failed)</span
                      >
                    </td>
                  </tr>
                  <tr v-if="recent.length === 0">
                    <td colspan="5" class="py-6 text-center text-slate-500">
                      No runs recorded yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
          <NuxtLink
            to="/admin/notifications/broadcast"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Broadcast notification
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

  <DesignSystemConfirmDialog
    :is-open="isDeleteUserDialogOpen"
    title="Delete User"
    :message="`Are you sure you want to delete ${userToDeleteEmail}? This action cannot be undone.`"
    confirm-text="Delete"
    cancel-text="Cancel"
    variant="danger"
    @confirm="confirmDeleteUser"
    @cancel="cancelDeleteUser"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from "vue";
import { useAdminUsers } from "~/composables/useAdminUsers";
import { useAdminStats } from "~/composables/useAdminStats";
import { useAdminHealthCheck } from "~/composables/useAdminHealthCheck";
import { useAdminInvitations } from "~/composables/useAdminInvitations";
import {
  useAdminCronRuns,
  type CronJobSummary,
} from "~/composables/useAdminCronRuns";

const BulkDeleteConfirmModal = defineAsyncComponent(
  () => import("~/components/Admin/BulkDeleteConfirmModal.vue"),
);

definePageMeta({
  layout: "default",
  middleware: ["auth", "admin"],
});

const activeTab = ref("overview");

const {
  users,
  loading,
  error,
  deleting,
  isSelectMode,
  selectedUserEmails,
  bulkDeleting,
  showBulkDeleteModal,
  searchQuery,
  filterAdmin,
  filteredUsers,
  clearFilters,
  pageSizeOptions,
  pageSize,
  currentPage,
  totalPages,
  paginatedUsers,
  paginationStart,
  paginationEnd,
  visiblePageNumbers,
  currentUserEmailComputed,
  selectedCount,
  allSelected,
  loadUsers,
  toggleSelectMode,
  toggleUserSelection,
  toggleSelectAll,
  deleteByEmailInput,
  deleteUserByEmail,
  isDeleteUserDialogOpen,
  userToDeleteEmail,
  deleteUser,
  confirmDeleteUser,
  cancelDeleteUser,
  bulkDeleteUsers,
} = useAdminUsers();

const { stats, statsLoading, statsError, loadStats } = useAdminStats();
const { health, healthLoading, healthError, loadHealth } =
  useAdminHealthCheck();
const { jobs, recent, cronLoading, cronError, loadCronRuns } =
  useAdminCronRuns();
const {
  pendingInvitations,
  invitationsLoading,
  invitationsError,
  deletingInvitationId,
  loadInvitations,
  cancelInvitation,
  formatDate,
} = useAdminInvitations();

const tabs = computed(() => [
  { id: "overview", label: "Overview" },
  { id: "users", label: `Users (${users.value.length})` },
  { id: "pending", label: "Pending invitations" },
  { id: "health", label: "Health" },
  { id: "jobs", label: "Jobs" },
  { id: "tools", label: "Tools" },
]);

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

function formatCronTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function cronStatusText(status: string | undefined): string {
  switch (status) {
    case "success":
      return "text-green-700 font-medium";
    case "partial":
      return "text-amber-600 font-medium";
    case "error":
      return "text-red-700 font-medium";
    case "running":
      return "text-blue-600 font-medium";
    default:
      return "text-slate-500";
  }
}

function cronDotClass(job: CronJobSummary): string {
  if (job.stale || job.lastRun?.status === "error") return "bg-red-500";
  if (job.lastRun?.status === "partial") return "bg-amber-500";
  if (job.lastRun?.status === "running") return "bg-blue-500";
  if (job.lastRun?.status === "success") return "bg-green-500";
  return "bg-slate-300";
}

function cronCardClass(job: CronJobSummary): string {
  if (job.stale || job.lastRun?.status === "error")
    return "border-red-200 bg-red-50/40";
  if (job.lastRun?.status === "partial")
    return "border-amber-200 bg-amber-50/40";
  return "border-slate-200 bg-slate-50/40";
}

function selectTab(tabId: string) {
  activeTab.value = tabId;
  if (tabId === "overview") loadStats();
  else if (tabId === "health") loadHealth();
  else if (tabId === "pending") loadInvitations();
  else if (tabId === "jobs") loadCronRuns();
}

onMounted(async () => {
  await loadUsers();
  if (activeTab.value === "overview") await loadStats();
});
</script>
