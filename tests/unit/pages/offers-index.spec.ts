import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const showToastMock = vi.fn();
const createOfferMock = vi.fn();
const deleteOfferMock = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/stores/offers", () => ({
  useOffersStore: () => ({
    offers: ref([]),
    acceptedOffers: ref([]),
    pendingOffers: ref([]),
    declinedOffers: ref([]),
    loading: ref(false),
    softWarnVisible: ref(false),
    totalCount: ref(0),
    fetchOffers: vi.fn().mockResolvedValue(undefined),
    createOffer: createOfferMock,
    deleteOffer: deleteOfferMock,
    daysUntilDeadline: vi.fn(() => null),
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: ref([{ id: "school-1", name: "Test University" }]),
    fetchSchools: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({
    activeFamilyId: ref("family-1"),
    activeAthleteId: ref("athlete-1"),
    isViewingAsParent: ref(false),
  }),
}));

import OffersIndexPage from "~/pages/offers/index.vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("pages/offers/index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountPage = () =>
    mount(OffersIndexPage, {
      global: {
        components: { DesignSystemConfirmDialog },
        stubs: {
          PageHeader: { template: "<div><slot name=\"actions\" /></div>" },
          OfferComparison: true,
        },
      },
    });

  describe("delete offer", () => {
    it("does not delete immediately on click — opens a confirm dialog instead of window.confirm", async () => {
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.deleteOffer("offer-1");
      await wrapper.vm.$nextTick();

      expect(deleteOfferMock).not.toHaveBeenCalled();
      expect(vm.isDeleteDialogOpen).toBe(true);

      const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
      expect(dialog.exists()).toBe(true);
      expect(dialog.props("isOpen")).toBe(true);
    });

    it("shows a visible, generic error when delete fails and keeps state usable", async () => {
      deleteOfferMock.mockRejectedValue(new Error("permission denied for table offers"));
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.deleteOffer("offer-1");
      await vm.confirmDeleteOffer();
      await wrapper.vm.$nextTick();

      expect(deleteOfferMock).toHaveBeenCalledWith("offer-1");
      expect(showToastMock).toHaveBeenCalledTimes(1);
      const [message, type] = showToastMock.mock.calls[0];
      expect(type).toBe("error");
      expect(message).toMatch(/something went wrong/i);
      expect(message).not.toMatch(/permission denied|table offers/i);
      // Dialog closes so the user isn't stuck
      expect(vm.isDeleteDialogOpen).toBe(false);
    });
  });

  describe("add offer", () => {
    it("shows a visible, generic error and preserves the form when creation fails", async () => {
      createOfferMock.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "offers_pkey"'),
      );
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.newOffer.school_id = "school-1";
      vm.newOffer.offer_type = "scholarship";

      await vm.handleAddOffer();
      await wrapper.vm.$nextTick();

      expect(createOfferMock).toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledTimes(1);
      const [message, type] = showToastMock.mock.calls[0];
      expect(type).toBe("error");
      expect(message).toMatch(/something went wrong/i);
      expect(message).not.toMatch(/constraint|offers_pkey/i);

      // Form data is preserved on failure, not silently reset
      expect(vm.newOffer.school_id).toBe("school-1");
      expect(vm.newOffer.offer_type).toBe("scholarship");
    });
  });
});
