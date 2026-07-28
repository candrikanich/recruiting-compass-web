import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const deleteOfferMock = vi.fn();
const mockRoute = { params: { id: "offer-1" } };
const mockRouterPush = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("~/stores/offers", () => ({
  useOffersStore: () => ({
    offers: ref([
      {
        id: "offer-1",
        school_id: "school-1",
        offer_type: "scholarship",
        status: "pending",
        scholarship_amount: null,
        scholarship_percentage: 50,
        offer_date: "2026-01-01",
        deadline_date: null,
        conditions: null,
        notes: null,
      },
    ]),
    loading: ref(false),
    fetchOffers: vi.fn().mockResolvedValue(undefined),
    getOffer: vi.fn(),
    updateOffer: vi.fn(),
    daysUntilDeadline: vi.fn(() => null),
    deleteOffer: deleteOfferMock,
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: ref([{ id: "school-1", name: "Test University" }]),
    fetchSchools: vi.fn().mockResolvedValue(undefined),
  }),
}));

import OfferDetailPage from "~/pages/offers/[id].vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("pages/offers/[id].vue delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountPage = () =>
    mount(OfferDetailPage, {
      global: {
        components: { DesignSystemConfirmDialog },
        stubs: { ScholarshipCalculator: true },
      },
    });

  it("opens a confirm dialog instead of deleting immediately, and deletes only on confirm", async () => {
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    vm.deleteOffer();
    await wrapper.vm.$nextTick();

    expect(deleteOfferMock).not.toHaveBeenCalled();
    const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props("isOpen")).toBe(true);

    await vm.confirmDeleteOffer();

    expect(deleteOfferMock).toHaveBeenCalledWith("offer-1");
    expect(mockRouterPush).toHaveBeenCalledWith("/offers");
  });

  it("shows a visible, non-raw error message when delete fails", async () => {
    deleteOfferMock.mockRejectedValue(new Error("foreign key violation"));
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    vm.deleteOffer();
    await vm.confirmDeleteOffer();
    await wrapper.vm.$nextTick();

    expect(vm.error).toBe("Failed to delete offer");
    expect(vm.error).not.toMatch(/foreign key/i);
  });
});
