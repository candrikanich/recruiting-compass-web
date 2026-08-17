<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-slate-900">Users</h1>

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
              <NuxtLink
                :to="`/admin/users/${user.id}`"
                class="hover:underline"
              >
                <code class="text-sm bg-slate-100 px-2 py-1 rounded-sm">{{
                  user.email
                }}</code>
              </NuxtLink>
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
          users.length === 0 ? "No users found" : "No users match your search"
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
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
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
            <span v-else class="px-1 py-1.5 text-slate-400" aria-hidden="true">
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
        Use this to delete accounts that don't appear in the list above (e.g.
        orphaned auth records where signup didn't complete).
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from "vue";
import { useAdminUsers } from "~/composables/useAdminUsers";

const BulkDeleteConfirmModal = defineAsyncComponent(
  () => import("~/components/Admin/BulkDeleteConfirmModal.vue"),
);

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

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

onMounted(async () => {
  await loadUsers();
});
</script>
