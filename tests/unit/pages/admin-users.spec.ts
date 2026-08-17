import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import AdminUsers from "~/pages/admin/users.vue";

vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: ref({ user: { email: "admin@test.com" } }),
  })),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token",
            user: { email: "admin@test.com" },
          },
        },
      }),
    },
  })),
}));

const showToastMock = vi.fn();
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: vi.fn(() => ({ showToast: showToastMock })),
}));

const fetchAuthMock = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(() => ({ $fetchAuth: fetchAuthMock })),
}));

const BulkDeleteConfirmModalStub = {
  name: "BulkDeleteConfirmModal",
  template: "<div data-testid='bulk-delete-modal'><slot /></div>",
  props: ["isOpen", "emails"],
};

const mockFetch = vi.fn();
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/admin/users"))
      return Promise.resolve(
        new Response(JSON.stringify({ users: [] }), { status: 200 }),
      );
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
  (globalThis as any).fetch = mockFetch;
});

function mountUsers() {
  return mount(AdminUsers, {
    global: {
      plugins: [createPinia()],
      stubs: {
        NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        BulkDeleteConfirmModal: BulkDeleteConfirmModalStub,
      },
    },
  });
}

describe("Admin Users (users.vue)", () => {
  it("calls $fetch for users on mount", async () => {
    mountUsers();

    await new Promise((r) => setTimeout(r, 100));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/users"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  describe("delete user error handling", () => {
    it("shows a generic toast (not raw fetch/Postgres error text) when delete fails", async () => {
      fetchAuthMock.mockRejectedValue(
        new Error(
          'duplicate key value violates unique constraint "users_pkey"',
        ),
      );

      const wrapper = mountUsers();

      await wrapper.vm.$nextTick();
      const vm = wrapper.vm as any;

      vm.userToDeleteEmail = "someone@test.com";
      await vm.confirmDeleteUser();
      await wrapper.vm.$nextTick();

      expect(fetchAuthMock).toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledTimes(1);
      const [message, type] = showToastMock.mock.calls[0];
      expect(type).toBe("error");
      expect(message).toBe("Failed to delete user. Please try again.");
      expect(message).not.toMatch(/duplicate key|constraint|users_pkey/i);
    });
  });
});
