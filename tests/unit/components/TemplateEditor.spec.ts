import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const showToastMock = vi.fn();
const deleteTemplateMock = vi.fn();
const createTemplateMock = vi.fn();
const updateTemplateMock = vi.fn();

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    createTemplate: createTemplateMock,
    updateTemplate: updateTemplateMock,
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

describe("components/TemplateEditor.vue predefined copy flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const predefined = {
    id: "predefined-1",
    name: "Recruiting Intro",
    type: "email" as const,
    subject: "Hello",
    body: "Hi {{coachFirstName}}",
    is_predefined: true,
  };

  const mountEditor = (tpl: unknown) =>
    mount(TemplateEditor, {
      props: { template: tpl as never },
      global: {
        components: { DesignSystemConfirmDialog },
      },
    });

  it("prefills the name as 'Copy of …' and shows the copy note", () => {
    const wrapper = mountEditor(predefined);
    const vm = wrapper.vm as unknown as {
      formData: { name: string };
      isCustomizingPredefined: boolean;
    };
    expect(vm.formData.name).toBe("Copy of Recruiting Intro");
    expect(vm.isCustomizingPredefined).toBe(true);
    expect(wrapper.text()).toMatch(/customizing a copy/i);
    // A built-in has no Delete affordance (you can't delete a global)
    expect(wrapper.text()).not.toMatch(/^Delete$/m);
  });

  it("saves a predefined edit via createTemplate (insert), not updateTemplate", async () => {
    createTemplateMock.mockResolvedValue({
      id: "new-owned",
      name: "Copy of Recruiting Intro",
      type: "email",
      body: "Hi {{coachFirstName}}",
    });
    const wrapper = mountEditor(predefined);
    const vm = wrapper.vm as unknown as {
      saveTemplate: () => Promise<void>;
    };

    await vm.saveTemplate();
    await wrapper.vm.$nextTick();

    expect(updateTemplateMock).not.toHaveBeenCalled();
    expect(createTemplateMock).toHaveBeenCalledTimes(1);
    expect(createTemplateMock.mock.calls[0][0]).toBe(
      "Copy of Recruiting Intro",
    );
    expect(wrapper.emitted("save")).toBeTruthy();
  });

  it("owned edit uses updateTemplate; on failure toasts and does not emit save", async () => {
    updateTemplateMock.mockResolvedValue(false);
    const owned = {
      id: "owned-1",
      name: "My Template",
      type: "email" as const,
      subject: "Hi",
      body: "Body",
    };
    const wrapper = mountEditor(owned);
    const vm = wrapper.vm as unknown as {
      saveTemplate: () => Promise<void>;
    };

    await vm.saveTemplate();
    await wrapper.vm.$nextTick();

    expect(updateTemplateMock).toHaveBeenCalledWith(
      "owned-1",
      expect.any(Object),
    );
    expect(createTemplateMock).not.toHaveBeenCalled();
    expect(wrapper.emitted("save")).toBeFalsy();
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock.mock.calls[0][1]).toBe("error");
  });
});
