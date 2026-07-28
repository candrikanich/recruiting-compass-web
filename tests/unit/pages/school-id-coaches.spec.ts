import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const showToastMock = vi.fn();
const deleteCoachMock = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchCoaches: vi.fn().mockResolvedValue(undefined),
    createCoach: vi.fn(),
    deleteCoach: deleteCoachMock,
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    getSchool: vi
      .fn()
      .mockResolvedValue({ id: "school-1", name: "Test University" }),
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "school-1" } }),
}));

import SchoolCoachesPage from "~/pages/school-[id]-coaches.vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("pages/school-[id]-coaches.vue — delete coach confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountPage = () =>
    mount(SchoolCoachesPage, {
      global: {
        components: { DesignSystemConfirmDialog },
        stubs: {
          NuxtLink: { template: "<a><slot /></a>" },
        },
      },
    });

  it("does not delete immediately on trigger — opens the confirm dialog instead of window.confirm", async () => {
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    vm.deleteCoach("coach-1");
    await wrapper.vm.$nextTick();

    expect(deleteCoachMock).not.toHaveBeenCalled();
    expect(vm.isDeleteDialogOpen).toBe(true);

    const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props("isOpen")).toBe(true);
  });

  it("deletes the coach when the dialog emits confirm", async () => {
    deleteCoachMock.mockResolvedValue(undefined);
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    vm.deleteCoach("coach-1");
    await wrapper.vm.$nextTick();

    const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
    dialog.vm.$emit("confirm");
    await wrapper.vm.$nextTick();

    expect(deleteCoachMock).toHaveBeenCalledWith("coach-1");
    expect(showToastMock).not.toHaveBeenCalled();
    expect(vm.isDeleteDialogOpen).toBe(false);
  });

  it("shows a visible, generic error toast when the delete fails", async () => {
    deleteCoachMock.mockRejectedValue(
      new Error("permission denied for table coaches"),
    );
    const wrapper = mountPage();
    const vm = wrapper.vm as any;

    vm.deleteCoach("coach-1");
    await vm.confirmDeleteCoach();
    await wrapper.vm.$nextTick();

    expect(deleteCoachMock).toHaveBeenCalledWith("coach-1");
    expect(showToastMock).toHaveBeenCalledTimes(1);
    const [message, type] = showToastMock.mock.calls[0];
    expect(type).toBe("error");
    expect(message).toMatch(/something went wrong/i);
    expect(message).not.toMatch(/permission denied|table coaches/i);
    expect(vm.isDeleteDialogOpen).toBe(false);
  });
});
