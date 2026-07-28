import { ref, computed, watch } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useAppToast } from "~/composables/useAppToast";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { createClientLogger } from "~/utils/logger";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
}

export function useAdminUsers() {
  const logger = createClientLogger("AdminDashboard");
  const { session } = useAuth();
  const supabase = useSupabase();
  const { showToast } = useAppToast();
  const { $fetchAuth } = useAuthFetch();

  const users = ref<AdminUser[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const deleting = ref<string | null>(null);
  const isSelectMode = ref(false);
  const selectedUserEmails = ref<Set<string>>(new Set());
  const bulkDeleting = ref(false);
  const showBulkDeleteModal = ref(false);
  const currentUserEmail = ref<string>("");

  // Search / filter
  const searchQuery = ref("");
  const filterAdmin = ref<"all" | "yes" | "no">("all");

  const filteredUsers = computed(() => {
    let list = users.value;
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      );
    }
    if (filterAdmin.value === "yes") list = list.filter((u) => u.is_admin);
    else if (filterAdmin.value === "no") list = list.filter((u) => !u.is_admin);
    return list;
  });

  function clearFilters() {
    searchQuery.value = "";
    filterAdmin.value = "all";
  }

  // Pagination
  const pageSizeOptions = [10, 25, 50, 100];
  const pageSize = ref(25);
  const currentPage = ref(1);

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value)),
  );

  const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredUsers.value.slice(start, start + pageSize.value);
  });

  const paginationStart = computed(() =>
    filteredUsers.value.length === 0
      ? 0
      : (currentPage.value - 1) * pageSize.value + 1,
  );

  const paginationEnd = computed(() =>
    Math.min(currentPage.value * pageSize.value, filteredUsers.value.length),
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
    filteredUsers.value.filter(
      (u) => u.email !== currentUserEmailComputed.value,
    ),
  );

  const selectedCount = computed(() => selectedUserEmails.value.size);

  const allSelected = computed(
    () =>
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

      if (!token) throw new Error("Not authenticated");
      if (userEmail) currentUserEmail.value = userEmail;

      const PAGE_SIZE = 100;
      const all: AdminUser[] = [];
      let offset = 0;

      while (true) {
        const httpRes = await fetch(
          `/api/admin/users?limit=${PAGE_SIZE}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!httpRes.ok)
          throw new Error(`Failed to load users: ${httpRes.status}`);
        const response = await httpRes.json();
        const page = (response?.users ?? []) as AdminUser[];
        all.push(...page);
        if (all.length >= (response?.total ?? 0) || page.length < PAGE_SIZE)
          break;
        offset += PAGE_SIZE;
      }

      users.value = all;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load users";
      logger.error("Error loading users", { message: error.value, err });
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

  const deleteByEmailInput = ref("");

  const deleteUserByEmail = () => {
    const email = deleteByEmailInput.value.trim();
    if (!email) return;
    deleteUser(email);
  };

  const isDeleteUserDialogOpen = ref(false);
  const userToDeleteEmail = ref<string | null>(null);

  const deleteUser = (email: string) => {
    if (email === currentUserEmailComputed.value) {
      showToast("Cannot delete your own account", "error");
      return;
    }
    userToDeleteEmail.value = email;
    isDeleteUserDialogOpen.value = true;
  };

  const confirmDeleteUser = async () => {
    const email = userToDeleteEmail.value;
    isDeleteUserDialogOpen.value = false;
    userToDeleteEmail.value = null;
    if (!email) return;

    deleting.value = email;

    try {
      const response = await $fetchAuth<{ success: boolean }>(
        "/api/admin/delete-user",
        { method: "POST", body: { email } },
      );

      if (response.success) {
        users.value = users.value.filter((u) => u.email !== email);
        showToast(`User ${email} deleted successfully`, "success");
        if (deleteByEmailInput.value.trim() === email) {
          deleteByEmailInput.value = "";
        }
      }
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "Failed to delete user";
      error.value = errMessage;
      showToast("Failed to delete user. Please try again.", "error");
      logger.error(errMessage, err);
    } finally {
      deleting.value = null;
    }
  };

  const cancelDeleteUser = () => {
    isDeleteUserDialogOpen.value = false;
    userToDeleteEmail.value = null;
  };

  const bulkDeleteUsers = async () => {
    showBulkDeleteModal.value = false;
    bulkDeleting.value = true;
    error.value = null;

    try {
      const response = await $fetchAuth<{
        success: number;
        failed: number;
        deletedEmails: string[];
        errors: Array<{ email: string; reason: string }>;
        message: string;
      }>("/api/admin/bulk-delete-users", {
        method: "POST",
        body: { emails: Array.from(selectedUserEmails.value) },
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
        logger.error("Bulk delete errors", response.errors);
        const errorDetails = response.errors
          .map(
            (e: { email: string; reason: string }) => `${e.email}: ${e.reason}`,
          )
          .join("\n");
        error.value = `Failed to delete:\n${errorDetails}`;
      }
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "Failed to bulk delete users";
      error.value = errMessage;
      showToast(errMessage, "error");
      logger.error(errMessage, err);
    } finally {
      bulkDeleting.value = false;
    }
  };

  watch(totalPages, (total) => {
    if (currentPage.value > total) {
      currentPage.value = total;
    }
  });

  watch([searchQuery, filterAdmin], () => {
    currentPage.value = 1;
  });

  return {
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
    selectableUsers,
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
  };
}
