import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const showToastMock = vi.fn();
const deleteEventMock = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useEvents", () => ({
  useEvents: () => ({
    events: ref([]),
    loading: ref(false),
    fetchEvents: vi.fn().mockResolvedValue(undefined),
    deleteEvent: deleteEventMock,
  }),
}));

vi.mock("~/composables/useEventStats", () => ({
  useEventStats: () => ({ stats: ref([]) }),
}));

import EventsIndexPage from "~/pages/events/index.vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("pages/events/index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountPage = () =>
    mount(EventsIndexPage, {
      global: {
        components: { DesignSystemConfirmDialog },
        stubs: {
          PageHeader: { template: "<div><slot name=\"actions\" /></div>" },
          StatsTiles: true,
          NuxtLink: true,
          UIcon: true,
        },
      },
    });

  describe("delete event", () => {
    it("does not delete immediately on trigger — opens the confirm dialog instead of window.confirm", async () => {
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.deleteEvent("event-1");
      await wrapper.vm.$nextTick();

      expect(deleteEventMock).not.toHaveBeenCalled();
      expect(vm.isDeleteDialogOpen).toBe(true);

      const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
      expect(dialog.exists()).toBe(true);
      expect(dialog.props("isOpen")).toBe(true);
    });

    it("deletes the event only after the dialog emits confirm", async () => {
      deleteEventMock.mockResolvedValue(undefined);
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.deleteEvent("event-1");
      await wrapper.vm.$nextTick();

      const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
      dialog.vm.$emit("confirm");
      await wrapper.vm.$nextTick();

      expect(deleteEventMock).toHaveBeenCalledWith("event-1");
      expect(vm.isDeleteDialogOpen).toBe(false);
    });

    it("shows a visible, generic error when delete fails and keeps state usable", async () => {
      deleteEventMock.mockRejectedValue(
        new Error("permission denied for table events"),
      );
      const wrapper = mountPage();
      const vm = wrapper.vm as any;

      vm.deleteEvent("event-1");
      await vm.confirmDeleteEvent();
      await wrapper.vm.$nextTick();

      expect(deleteEventMock).toHaveBeenCalledWith("event-1");
      expect(showToastMock).toHaveBeenCalledTimes(1);
      const [message, type] = showToastMock.mock.calls[0];
      expect(type).toBe("error");
      expect(message).toMatch(/something went wrong/i);
      expect(message).not.toMatch(/permission denied|table events/i);
      expect(vm.isDeleteDialogOpen).toBe(false);
    });
  });
});
