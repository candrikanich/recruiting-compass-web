import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { useAdminUsers } from "~/composables/useAdminUsers";

const mockShowToast = vi.fn();
const mockLoggerError = vi.fn();
const mockFetchAuth = vi.fn();
const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({ session: { value: { user: { email: "admin@test.com" } } } }),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({ auth: { getSession: mockGetSession } }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

function makeUser(overrides: Partial<{ id: string; email: string; full_name: string | null; role: string; is_admin: boolean }> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.com`,
    full_name: overrides.full_name ?? "Test User",
    role: overrides.role ?? "athlete",
    is_admin: overrides.is_admin ?? false,
  };
}

function setupLoadUsersSuccess(userList: ReturnType<typeof makeUser>[]) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "tok", user: { email: "admin@test.com" } } },
  });
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ users: userList, total: userList.length }),
  });
}

describe("useAdminUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initial state", () => {
    it("returns empty users, not loading, no error", () => {
      const { users, loading, error, deleting, isSelectMode, bulkDeleting } =
        useAdminUsers();
      expect(users.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(deleting.value).toBeNull();
      expect(isSelectMode.value).toBe(false);
      expect(bulkDeleting.value).toBe(false);
    });

    it("search and filter default to empty / all", () => {
      const { searchQuery, filterAdmin } = useAdminUsers();
      expect(searchQuery.value).toBe("");
      expect(filterAdmin.value).toBe("all");
    });

    it("pagination defaults to page 1, size 25", () => {
      const { currentPage, pageSize, pageSizeOptions } = useAdminUsers();
      expect(currentPage.value).toBe(1);
      expect(pageSize.value).toBe(25);
      expect(pageSizeOptions).toEqual([10, 25, 50, 100]);
    });
  });

  describe("loadUsers", () => {
    it("fetches users and populates the list", async () => {
      const testUsers = [makeUser({ email: "a@t.com" }), makeUser({ email: "b@t.com" })];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, users, loading } = useAdminUsers();
      const promise = loadUsers();
      expect(loading.value).toBe(true);
      await promise;

      expect(users.value).toEqual(testUsers);
      expect(loading.value).toBe(false);
    });

    it("sets error when not authenticated", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { loadUsers, error } = useAdminUsers();
      await loadUsers();

      expect(error.value).toBe("Not authenticated");
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it("sets error on non-OK HTTP response", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "tok", user: { email: "admin@test.com" } } },
      });
      mockFetch.mockResolvedValue({ ok: false, status: 403 });

      const { loadUsers, error } = useAdminUsers();
      await loadUsers();

      expect(error.value).toBe("Failed to load users: 403");
    });

    it("sets error on network failure", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "tok", user: { email: "admin@test.com" } } },
      });
      mockFetch.mockRejectedValue(new Error("Network down"));

      const { loadUsers, error } = useAdminUsers();
      await loadUsers();

      expect(error.value).toBe("Network down");
    });

    it("paginates through multiple pages of results", async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => makeUser({ email: `u${i}@t.com` }));
      const page2 = [makeUser({ email: "last@t.com" })];

      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "tok", user: { email: "admin@test.com" } } },
      });

      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: true, json: async () => ({ users: page1, total: 101 }) };
        }
        return { ok: true, json: async () => ({ users: page2, total: 101 }) };
      });

      const { loadUsers, users } = useAdminUsers();
      await loadUsers();

      expect(users.value).toHaveLength(101);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("filteredUsers", () => {
    it("filters by search query across email, name, and role", async () => {
      const testUsers = [
        makeUser({ email: "alice@t.com", full_name: "Alice Adams", role: "athlete" }),
        makeUser({ email: "bob@t.com", full_name: "Bob Brown", role: "coach" }),
        makeUser({ email: "carol@t.com", full_name: "Carol Clark", role: "parent" }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, searchQuery, filteredUsers } = useAdminUsers();
      await loadUsers();

      searchQuery.value = "alice";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
      expect(filteredUsers.value[0].email).toBe("alice@t.com");

      searchQuery.value = "coach";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
      expect(filteredUsers.value[0].email).toBe("bob@t.com");

      searchQuery.value = "Clark";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
      expect(filteredUsers.value[0].full_name).toBe("Carol Clark");
    });

    it("filters by admin status", async () => {
      const testUsers = [
        makeUser({ email: "a@t.com", is_admin: true }),
        makeUser({ email: "b@t.com", is_admin: false }),
        makeUser({ email: "c@t.com", is_admin: true }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, filterAdmin, filteredUsers } = useAdminUsers();
      await loadUsers();

      filterAdmin.value = "yes";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(2);
      expect(filteredUsers.value.every((u) => u.is_admin)).toBe(true);

      filterAdmin.value = "no";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
      expect(filteredUsers.value[0].is_admin).toBe(false);
    });

    it("combines search and admin filter", async () => {
      const testUsers = [
        makeUser({ email: "admin1@t.com", full_name: "Admin One", is_admin: true }),
        makeUser({ email: "admin2@t.com", full_name: "Admin Two", is_admin: false }),
        makeUser({ email: "user1@t.com", full_name: "User One", is_admin: true }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, searchQuery, filterAdmin, filteredUsers } = useAdminUsers();
      await loadUsers();

      searchQuery.value = "admin";
      filterAdmin.value = "yes";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
      expect(filteredUsers.value[0].email).toBe("admin1@t.com");
    });

    it("handles null full_name gracefully", async () => {
      const testUsers = [makeUser({ email: "null@t.com", full_name: null })];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, searchQuery, filteredUsers } = useAdminUsers();
      await loadUsers();

      searchQuery.value = "null";
      await nextTick();
      expect(filteredUsers.value).toHaveLength(1);
    });
  });

  describe("clearFilters", () => {
    it("resets search and filter to defaults", async () => {
      const { searchQuery, filterAdmin, clearFilters } = useAdminUsers();
      searchQuery.value = "test";
      filterAdmin.value = "yes";

      clearFilters();

      expect(searchQuery.value).toBe("");
      expect(filterAdmin.value).toBe("all");
    });
  });

  describe("pagination", () => {
    function setupWithUsers(count: number) {
      const testUsers = Array.from({ length: count }, (_, i) =>
        makeUser({ email: `u${i}@t.com` }),
      );
      setupLoadUsersSuccess(testUsers);
      return testUsers;
    }

    it("totalPages is ceil(filtered / pageSize)", async () => {
      setupWithUsers(30);
      const { loadUsers, totalPages, pageSize } = useAdminUsers();
      await loadUsers();

      expect(totalPages.value).toBe(2); // 30 / 25 = 2
      pageSize.value = 10;
      await nextTick();
      expect(totalPages.value).toBe(3); // 30 / 10 = 3
    });

    it("totalPages is at least 1 even with no users", () => {
      const { totalPages } = useAdminUsers();
      expect(totalPages.value).toBe(1);
    });

    it("paginatedUsers returns the correct slice", async () => {
      setupWithUsers(30);
      const { loadUsers, paginatedUsers, currentPage, pageSize } = useAdminUsers();
      await loadUsers();

      pageSize.value = 10;
      await nextTick();
      expect(paginatedUsers.value).toHaveLength(10);

      currentPage.value = 3;
      await nextTick();
      expect(paginatedUsers.value).toHaveLength(10);

      currentPage.value = 4;
      await nextTick();
      // Only 30 total, page 4 at size 10 = empty (index 30..40)
      expect(paginatedUsers.value).toHaveLength(0);
    });

    it("paginationStart and paginationEnd are correct", async () => {
      setupWithUsers(30);
      const { loadUsers, paginationStart, paginationEnd, pageSize, currentPage } =
        useAdminUsers();
      await loadUsers();

      pageSize.value = 10;
      await nextTick();
      expect(paginationStart.value).toBe(1);
      expect(paginationEnd.value).toBe(10);

      currentPage.value = 3;
      await nextTick();
      expect(paginationStart.value).toBe(21);
      expect(paginationEnd.value).toBe(30);
    });

    it("paginationStart is 0 when no users", () => {
      const { paginationStart } = useAdminUsers();
      expect(paginationStart.value).toBe(0);
    });

    it("resets to page 1 when search or filter changes", async () => {
      setupWithUsers(50);
      const { loadUsers, currentPage, searchQuery, filterAdmin } = useAdminUsers();
      await loadUsers();

      currentPage.value = 2;
      await nextTick();
      expect(currentPage.value).toBe(2);

      searchQuery.value = "test";
      await nextTick();
      expect(currentPage.value).toBe(1);

      currentPage.value = 2;
      filterAdmin.value = "yes";
      await nextTick();
      expect(currentPage.value).toBe(1);
    });

    it("clamps currentPage when totalPages shrinks", async () => {
      setupWithUsers(50);
      const { loadUsers, currentPage, pageSize, totalPages } = useAdminUsers();
      await loadUsers();

      pageSize.value = 10;
      await nextTick();
      currentPage.value = 5;
      await nextTick();
      expect(currentPage.value).toBe(5);

      pageSize.value = 50;
      await nextTick();
      expect(totalPages.value).toBe(1);
      expect(currentPage.value).toBe(1);
    });
  });

  describe("visiblePageNumbers", () => {
    it("shows all pages when total <= 7", async () => {
      const testUsers = Array.from({ length: 5 }, (_, i) =>
        makeUser({ email: `u${i}@t.com` }),
      );
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, visiblePageNumbers, pageSize } = useAdminUsers();
      await loadUsers();
      pageSize.value = 1;
      await nextTick();

      expect(visiblePageNumbers.value).toEqual([1, 2, 3, 4, 5]);
    });

    it("shows ellipsis near end when on early page", async () => {
      const testUsers = Array.from({ length: 100 }, (_, i) =>
        makeUser({ email: `u${i}@t.com` }),
      );
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, visiblePageNumbers, pageSize, currentPage } = useAdminUsers();
      await loadUsers();
      pageSize.value = 10;
      currentPage.value = 2;
      await nextTick();

      expect(visiblePageNumbers.value).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    });

    it("shows ellipsis near start when on late page", async () => {
      const testUsers = Array.from({ length: 100 }, (_, i) =>
        makeUser({ email: `u${i}@t.com` }),
      );
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, visiblePageNumbers, pageSize, currentPage } = useAdminUsers();
      await loadUsers();
      pageSize.value = 10;
      currentPage.value = 9;
      await nextTick();

      expect(visiblePageNumbers.value).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
    });

    it("shows double ellipsis when in middle", async () => {
      const testUsers = Array.from({ length: 100 }, (_, i) =>
        makeUser({ email: `u${i}@t.com` }),
      );
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, visiblePageNumbers, pageSize, currentPage } = useAdminUsers();
      await loadUsers();
      pageSize.value = 10;
      currentPage.value = 5;
      await nextTick();

      expect(visiblePageNumbers.value).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    });
  });

  describe("selection", () => {
    it("toggleSelectMode enters and exits select mode, clearing selection on exit", () => {
      const { isSelectMode, selectedUserEmails, toggleSelectMode } = useAdminUsers();

      toggleSelectMode();
      expect(isSelectMode.value).toBe(true);

      selectedUserEmails.value.add("someone@t.com");
      toggleSelectMode();
      expect(isSelectMode.value).toBe(false);
      expect(selectedUserEmails.value.size).toBe(0);
    });

    it("toggleUserSelection adds and removes emails", () => {
      const { selectedUserEmails, toggleUserSelection } = useAdminUsers();

      toggleUserSelection("user@t.com");
      expect(selectedUserEmails.value.has("user@t.com")).toBe(true);

      toggleUserSelection("user@t.com");
      expect(selectedUserEmails.value.has("user@t.com")).toBe(false);
    });

    it("toggleUserSelection prevents selecting the current user", () => {
      const { selectedUserEmails, toggleUserSelection } = useAdminUsers();

      toggleUserSelection("admin@test.com");
      expect(selectedUserEmails.value.has("admin@test.com")).toBe(false);
    });

    it("selectableUsers excludes the current user", async () => {
      const testUsers = [
        makeUser({ email: "admin@test.com" }),
        makeUser({ email: "other@t.com" }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, selectableUsers } = useAdminUsers();
      await loadUsers();

      expect(selectableUsers.value).toHaveLength(1);
      expect(selectableUsers.value[0].email).toBe("other@t.com");
    });

    it("toggleSelectAll selects all selectable, then clears", async () => {
      const testUsers = [
        makeUser({ email: "admin@test.com" }),
        makeUser({ email: "a@t.com" }),
        makeUser({ email: "b@t.com" }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, selectedUserEmails, toggleSelectAll, allSelected } =
        useAdminUsers();
      await loadUsers();

      toggleSelectAll();
      expect(selectedUserEmails.value.size).toBe(2);
      expect(allSelected.value).toBe(true);

      toggleSelectAll();
      expect(selectedUserEmails.value.size).toBe(0);
      expect(allSelected.value).toBe(false);
    });

    it("selectedCount reflects set size", () => {
      const { selectedUserEmails, selectedCount } = useAdminUsers();
      expect(selectedCount.value).toBe(0);

      selectedUserEmails.value.add("a@t.com");
      selectedUserEmails.value.add("b@t.com");
      expect(selectedCount.value).toBe(2);
    });

    it("allSelected is false when no selectable users exist", () => {
      const { allSelected } = useAdminUsers();
      expect(allSelected.value).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("opens confirmation dialog for non-self user", () => {
      const { deleteUser, isDeleteUserDialogOpen, userToDeleteEmail } =
        useAdminUsers();

      deleteUser("other@t.com");

      expect(isDeleteUserDialogOpen.value).toBe(true);
      expect(userToDeleteEmail.value).toBe("other@t.com");
    });

    it("shows error toast when trying to delete self", () => {
      const { deleteUser, isDeleteUserDialogOpen } = useAdminUsers();

      deleteUser("admin@test.com");

      expect(isDeleteUserDialogOpen.value).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith(
        "Cannot delete your own account",
        "error",
      );
    });

    it("deleteByEmailInput triggers deleteUser with trimmed email", () => {
      const { deleteByEmailInput, deleteUserByEmail, isDeleteUserDialogOpen, userToDeleteEmail } =
        useAdminUsers();

      deleteByEmailInput.value = "  target@t.com  ";
      deleteUserByEmail();

      expect(isDeleteUserDialogOpen.value).toBe(true);
      expect(userToDeleteEmail.value).toBe("target@t.com");
    });

    it("deleteUserByEmail does nothing with empty input", () => {
      const { deleteByEmailInput, deleteUserByEmail, isDeleteUserDialogOpen } =
        useAdminUsers();

      deleteByEmailInput.value = "  ";
      deleteUserByEmail();

      expect(isDeleteUserDialogOpen.value).toBe(false);
    });
  });

  describe("confirmDeleteUser", () => {
    it("deletes user and removes from list on success", async () => {
      const testUsers = [
        makeUser({ email: "keep@t.com" }),
        makeUser({ email: "delete@t.com" }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, users, deleteUser, confirmDeleteUser, deleting } =
        useAdminUsers();
      await loadUsers();

      deleteUser("delete@t.com");
      mockFetchAuth.mockResolvedValue({ success: true });

      await confirmDeleteUser();

      expect(users.value).toHaveLength(1);
      expect(users.value[0].email).toBe("keep@t.com");
      expect(mockShowToast).toHaveBeenCalledWith(
        "User delete@t.com deleted successfully",
        "success",
      );
      expect(deleting.value).toBeNull();
    });

    it("clears deleteByEmailInput when deleted email matches", async () => {
      const testUsers = [makeUser({ email: "target@t.com" })];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, deleteByEmailInput, deleteUser, confirmDeleteUser } =
        useAdminUsers();
      await loadUsers();

      deleteByEmailInput.value = "target@t.com";
      deleteUser("target@t.com");
      mockFetchAuth.mockResolvedValue({ success: true });

      await confirmDeleteUser();

      expect(deleteByEmailInput.value).toBe("");
    });

    it("sets error and shows toast on failure", async () => {
      const { deleteUser, confirmDeleteUser, error } = useAdminUsers();

      deleteUser("victim@t.com");
      mockFetchAuth.mockRejectedValue(new Error("Server error"));

      await confirmDeleteUser();

      expect(error.value).toBe("Server error");
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to delete user. Please try again.",
        "error",
      );
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it("does nothing when no user is queued for deletion", async () => {
      const { confirmDeleteUser } = useAdminUsers();
      await confirmDeleteUser();

      expect(mockFetchAuth).not.toHaveBeenCalled();
    });
  });

  describe("cancelDeleteUser", () => {
    it("closes dialog and clears queued email", () => {
      const { deleteUser, cancelDeleteUser, isDeleteUserDialogOpen, userToDeleteEmail } =
        useAdminUsers();

      deleteUser("someone@t.com");
      expect(isDeleteUserDialogOpen.value).toBe(true);

      cancelDeleteUser();
      expect(isDeleteUserDialogOpen.value).toBe(false);
      expect(userToDeleteEmail.value).toBeNull();
    });
  });

  describe("bulkDeleteUsers", () => {
    it("deletes selected users and exits select mode on full success", async () => {
      const testUsers = [
        makeUser({ email: "admin@test.com" }),
        makeUser({ email: "a@t.com" }),
        makeUser({ email: "b@t.com" }),
        makeUser({ email: "c@t.com" }),
      ];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, users, selectedUserEmails, isSelectMode, bulkDeleteUsers, showBulkDeleteModal } =
        useAdminUsers();
      await loadUsers();

      isSelectMode.value = true;
      selectedUserEmails.value.add("a@t.com");
      selectedUserEmails.value.add("b@t.com");
      showBulkDeleteModal.value = true;

      mockFetchAuth.mockResolvedValue({
        success: 2,
        failed: 0,
        deletedEmails: ["a@t.com", "b@t.com"],
        errors: [],
        message: "ok",
      });

      await bulkDeleteUsers();

      expect(users.value).toHaveLength(2);
      expect(users.value.map((u) => u.email)).toEqual(["admin@test.com", "c@t.com"]);
      expect(selectedUserEmails.value.size).toBe(0);
      expect(isSelectMode.value).toBe(false);
      expect(showBulkDeleteModal.value).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith(
        "Successfully deleted 2 user(s)",
        "success",
      );
    });

    it("shows warning toast and sets error on partial failure", async () => {
      const testUsers = [makeUser({ email: "a@t.com" }), makeUser({ email: "b@t.com" })];
      setupLoadUsersSuccess(testUsers);

      const { loadUsers, selectedUserEmails, isSelectMode, bulkDeleteUsers } =
        useAdminUsers();
      await loadUsers();

      isSelectMode.value = true;
      selectedUserEmails.value.add("a@t.com");
      selectedUserEmails.value.add("b@t.com");

      mockFetchAuth.mockResolvedValue({
        success: 1,
        failed: 1,
        deletedEmails: ["a@t.com"],
        errors: [{ email: "b@t.com", reason: "Admin user" }],
        message: "partial",
      });

      const { error } = useAdminUsers();
      // Re-invoke from the same composable instance
      await bulkDeleteUsers();

      expect(mockShowToast).toHaveBeenCalledWith(
        "Successfully deleted 1 user(s) (1 failed)",
        "warning",
      );
    });

    it("handles complete failure with error toast", async () => {
      const { selectedUserEmails, isSelectMode, bulkDeleteUsers, error, bulkDeleting } =
        useAdminUsers();

      isSelectMode.value = true;
      selectedUserEmails.value.add("victim@t.com");

      mockFetchAuth.mockRejectedValue(new Error("Bulk op failed"));

      await bulkDeleteUsers();

      expect(error.value).toBe("Bulk op failed");
      expect(mockShowToast).toHaveBeenCalledWith("Bulk op failed", "error");
      expect(mockLoggerError).toHaveBeenCalled();
      expect(bulkDeleting.value).toBe(false);
    });

    it("handles non-Error thrown values", async () => {
      const { selectedUserEmails, isSelectMode, bulkDeleteUsers, error } =
        useAdminUsers();

      isSelectMode.value = true;
      selectedUserEmails.value.add("victim@t.com");

      mockFetchAuth.mockRejectedValue("string error");

      await bulkDeleteUsers();

      expect(error.value).toBe("Failed to bulk delete users");
    });
  });

  describe("currentUserEmailComputed", () => {
    it("derives email from session", () => {
      const { currentUserEmailComputed } = useAdminUsers();
      expect(currentUserEmailComputed.value).toBe("admin@test.com");
    });
  });
});
