import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const showToastMock = vi.fn();
const deleteTemplateMock = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: deleteTemplateMock,
    interpolateTemplate: vi.fn(() => ""),
  }),
}));

import TemplateEditor from "~/components/TemplateEditor.vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

const template = {
  id: "template-1",
  name: "Intro Email",
  type: "email" as const,
  subject: "Hello",
  body: "Hi {{coachFirstName}}",
};

describe("components/TemplateEditor.vue delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountEditor = () =>
    mount(TemplateEditor, {
      props: { template: template as never },
      global: {
        components: { DesignSystemConfirmDialog },
      },
    });

  it("does not delete immediately on click — opens the confirm dialog instead", async () => {
    const wrapper = mountEditor();
    const vm = wrapper.vm as unknown as {
      deleteTemplate: () => void;
      isDeleteDialogOpen: boolean;
    };

    vm.deleteTemplate();
    await wrapper.vm.$nextTick();

    expect(deleteTemplateMock).not.toHaveBeenCalled();
    expect(vm.isDeleteDialogOpen).toBe(true);

    const dialog = wrapper.findComponent(DesignSystemConfirmDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props("isOpen")).toBe(true);
  });

  it("deletes and emits when the dialog confirms", async () => {
    deleteTemplateMock.mockResolvedValue(true);
    const wrapper = mountEditor();
    const vm = wrapper.vm as unknown as {
      deleteTemplate: () => void;
      confirmDeleteTemplate: () => Promise<void>;
    };

    vm.deleteTemplate();
    await vm.confirmDeleteTemplate();
    await wrapper.vm.$nextTick();

    expect(deleteTemplateMock).toHaveBeenCalledWith("template-1");
    expect(wrapper.emitted("delete")?.[0]).toEqual(["template-1"]);
  });

  it("shows a generic error toast (not the raw error) when deletion fails", async () => {
    deleteTemplateMock.mockRejectedValue(
      new Error("permission denied for table communication_templates"),
    );
    const wrapper = mountEditor();
    const vm = wrapper.vm as unknown as {
      deleteTemplate: () => void;
      confirmDeleteTemplate: () => Promise<void>;
      isDeleteDialogOpen: boolean;
    };

    vm.deleteTemplate();
    await vm.confirmDeleteTemplate();
    await wrapper.vm.$nextTick();

    expect(deleteTemplateMock).toHaveBeenCalledWith("template-1");
    expect(showToastMock).toHaveBeenCalledTimes(1);
    const [message, type] = showToastMock.mock.calls[0];
    expect(type).toBe("error");
    expect(message).toMatch(/something went wrong/i);
    expect(message).not.toMatch(/permission denied|communication_templates/i);
    expect(vm.isDeleteDialogOpen).toBe(false);
  });
});
