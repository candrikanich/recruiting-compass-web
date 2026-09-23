import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { PendingInvitation } from "~/composables/useFamilyInvitations";

const mockSendInvite = vi.fn();
const mockFetchInvitations = vi.fn().mockResolvedValue(undefined);
const mockResendInvitation = vi.fn();
const mockRevokeInvitation = vi.fn();
const mockFetchMyCode = vi.fn().mockResolvedValue(undefined);
const mockShowToast = vi.fn();

// useFamilyInvitations is a vi.fn() so individual tests can override its return value
const mockUseFamilyInvitations = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("~/composables/useFamilyInvite", () => ({
  useFamilyInvite: () => ({
    sendInvite: mockSendInvite,
    loading: ref(false),
    error: ref(null),
  }),
}));

vi.mock("~/composables/useFamilyInvitations", () => ({
  useFamilyInvitations: (...args: unknown[]) =>
    mockUseFamilyInvitations(...args),
}));

const mockParentFamilies = ref<
  { familyId: string; familyCode: string; familyName: string }[]
>([]);
const mockJoinByCode = vi.fn().mockResolvedValue(undefined);

vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: () => ({
    myFamilyCode: ref("FAM-TEST"),
    myFamilyId: ref("fam-1"),
    myFamilyName: ref("Test Family"),
    parentFamilies: mockParentFamilies,
    loading: ref(false),
    error: ref(null),
    successMessage: ref(null),
    fetchMyCode: mockFetchMyCode,
    createFamily: vi.fn(),
    joinByCode: mockJoinByCode,
    regenerateCode: vi.fn(),
    copyCodeToClipboard: vi.fn(),
    removeFamilyMember: vi.fn(),
  }),
}));

const mockFetchAuth = vi.fn((url: string) => {
  if (url === "/api/family/inbound-address") {
    return Promise.resolve({
      addresses: [
        {
          familyUnitId: "fam-1",
          familyName: "Test Family",
          address: "family-abc123@inbound.example.com",
        },
      ],
    });
  }
  return Promise.resolve({ members: [] });
});

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({
    $fetchAuth: mockFetchAuth,
  }),
}));

const mockUserStore = {
  user: { id: "u1", role: "player", email: "test@example.com" },
};

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

import FamilyManagementPage from "~/pages/settings/family-management.vue";
import FamilyCodeInput from "~/components/Family/FamilyCodeInput.vue";

function defaultInvitationsReturn(
  overrides: Partial<{ invitations: ReturnType<typeof ref> }> = {},
) {
  return {
    invitations: ref<PendingInvitation[]>([]),
    loading: ref(false),
    error: ref(null),
    fetchInvitations: mockFetchInvitations,
    revokeInvitation: mockRevokeInvitation,
    resendInvitation: mockResendInvitation,
    ...overrides,
  };
}

function mountPage(role: "player" | "parent" = "player") {
  mockUserStore.user = { id: "u1", role, email: "test@example.com" };
  return mount(FamilyManagementPage, {
    global: {
      stubs: {
        FamilyCodeDisplay: true,
        FamilyCodeInput: true,
        FamilyMemberCard: true,
        FamilyPendingInviteCard: true,
        NuxtLink: true,
        ArrowLeftIcon: true,
      },
    },
  });
}

describe("family-management invite form", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUseFamilyInvitations.mockReturnValue(defaultInvitationsReturn());
  });

  it("renders the invite form for players", () => {
    const wrapper = mountPage("player");
    expect(wrapper.find('[data-testid="invite-member-form"]').exists()).toBe(
      true,
    );
  });

  it("renders the invite form for parents", () => {
    const wrapper = mountPage("parent");
    expect(wrapper.find('[data-testid="invite-member-form"]').exists()).toBe(
      true,
    );
  });

  it("calls sendInvite with email and role on submit", async () => {
    mockSendInvite.mockResolvedValue(undefined);
    const wrapper = mountPage("player");

    await wrapper
      .find('[data-testid="invite-email-input"]')
      .setValue("dad@example.com");
    await wrapper.find('[data-testid="invite-role-select"]').setValue("parent");
    await wrapper.find('[data-testid="send-invite-submit"]').trigger("click");

    expect(mockSendInvite).toHaveBeenCalledWith({
      email: "dad@example.com",
      role: "parent",
    });
  });

  it("clears form and refreshes invitations on success", async () => {
    mockSendInvite.mockResolvedValue(undefined);
    mockFetchInvitations.mockResolvedValue(undefined);
    const wrapper = mountPage("player");

    await wrapper
      .find('[data-testid="invite-email-input"]')
      .setValue("dad@example.com");
    await wrapper.find('[data-testid="invite-role-select"]').setValue("parent");
    await wrapper.find('[data-testid="send-invite-submit"]').trigger("click");
    await wrapper.vm.$nextTick();

    expect(
      (
        wrapper.find('[data-testid="invite-email-input"]')
          .element as HTMLInputElement
      ).value,
    ).toBe("");
    expect(mockFetchInvitations).toHaveBeenCalled();
  });

  it("disables submit when email is empty", () => {
    const wrapper = mountPage("player");
    const button = wrapper.find('[data-testid="send-invite-submit"]');
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("family-management parent family members", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUseFamilyInvitations.mockReturnValue(defaultInvitationsReturn());
    mockParentFamilies.value = [
      { familyId: "fam-1", familyCode: "FAM-G82CA2", familyName: "My Family" },
    ];
    mockFetchAuth.mockImplementation((url: string) => {
      if (url === "/api/family/inbound-address") {
        return Promise.resolve({
          addresses: [
            {
              familyUnitId: "fam-1",
              familyName: "My Family",
              address: "family-abc123@inbound.example.com",
            },
          ],
        });
      }
      if (url === "/api/family/members?familyId=fam-1") {
        return Promise.resolve({
          success: true,
          members: [
            {
              id: "mem-athlete",
              family_unit_id: "fam-1",
              user_id: "u-athlete",
              role: "player",
              added_at: new Date().toISOString(),
              users: {
                id: "u-athlete",
                email: "athlete@example.com",
                full_name: "Alex Athlete",
                role: "player",
              },
            },
          ],
        });
      }
      return Promise.resolve({ members: [] });
    });
  });

  afterEach(() => {
    mockParentFamilies.value = [];
  });

  it("fetches and renders family members for a parent's joined family", async () => {
    mockUserStore.user = { id: "u2", role: "parent", email: "mom@example.com" };
    const wrapper = mount(FamilyManagementPage, {
      global: {
        stubs: {
          FamilyCodeDisplay: true,
          FamilyCodeInput: true,
          FamilyPendingInviteCard: true,
          NuxtLink: true,
          ArrowLeftIcon: true,
        },
      },
    });
    await flushPromises();

    expect(mockFetchAuth).toHaveBeenCalledWith(
      "/api/family/members?familyId=fam-1",
    );
    expect(wrapper.text()).toContain("Alex Athlete");
  });
});

describe("family-management inbound email address", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUseFamilyInvitations.mockReturnValue(defaultInvitationsReturn());
  });

  it("fetches and renders the family's inbound-forwarding address", async () => {
    const wrapper = mountPage("player");
    await flushPromises();

    expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/inbound-address");
    expect(wrapper.text()).toContain("family-abc123@inbound.example.com");
  });

  it("renders one address per family for a multi-family parent", async () => {
    mockFetchAuth.mockImplementation((url: string) => {
      if (url === "/api/family/inbound-address") {
        return Promise.resolve({
          addresses: [
            {
              familyUnitId: "fam-1",
              familyName: "The Smiths",
              address: "family-abc123@inbound.example.com",
            },
            {
              familyUnitId: "fam-2",
              familyName: "The Joneses",
              address: "family-def456@inbound.example.com",
            },
          ],
        });
      }
      return Promise.resolve({ members: [] });
    });

    const wrapper = mountPage("parent");
    await flushPromises();

    expect(wrapper.text()).toContain("family-abc123@inbound.example.com");
    expect(wrapper.text()).toContain("family-def456@inbound.example.com");
    expect(wrapper.text()).toContain("The Smiths");
    expect(wrapper.text()).toContain("The Joneses");
  });

  it("re-fetches inbound addresses after joining a new family", async () => {
    const wrapper = mountPage("parent");
    await flushPromises();
    mockFetchAuth.mockClear();

    await wrapper
      .findComponent(FamilyCodeInput)
      .vm.$emit("submit", "FAM-NEW22");
    await flushPromises();

    expect(mockJoinByCode).toHaveBeenCalledWith("FAM-NEW22");
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/inbound-address");
  });
});

describe("family-management resend invitation feedback", () => {
  const pendingInvite: PendingInvitation = {
    id: "inv-1",
    invited_email: "parent@example.com",
    role: "player",
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockUseFamilyInvitations.mockReturnValue(
      defaultInvitationsReturn({ invitations: ref([pendingInvite]) }),
    );
  });

  function mountPageWithCard(role: "player" | "parent" = "player") {
    mockUserStore.user = { id: "u1", role, email: "test@example.com" };
    return mount(FamilyManagementPage, {
      global: {
        stubs: {
          FamilyCodeDisplay: true,
          FamilyCodeInput: true,
          FamilyMemberCard: true,
          NuxtLink: true,
          ArrowLeftIcon: true,
          // FamilyPendingInviteCard NOT stubbed — renders real card so we can click Resend
        },
      },
    });
  }

  it("shows a success toast when resend succeeds", async () => {
    mockResendInvitation.mockResolvedValue(undefined);
    const wrapper = mountPageWithCard();
    await wrapper.find('[data-testid="resend-invite-button"]').trigger("click");
    await flushPromises();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("parent@example.com"),
      "success",
    );
  });

  it("shows an error toast when resend fails", async () => {
    mockResendInvitation.mockRejectedValue(new Error("network error"));
    const wrapper = mountPageWithCard();
    await wrapper.find('[data-testid="resend-invite-button"]').trigger("click");
    await flushPromises();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("resend"),
      "error",
    );
  });
});
