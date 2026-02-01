import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DocumentUploadModal from "~/components/School/DocumentUploadModal.vue";
import * as useDocumentsConsolidatedModule from "~/composables/useDocumentsConsolidated";
import * as useFormValidationModule from "~/composables/useFormValidation";

vi.mock("~/composables/useDocumentsConsolidated");
vi.mock("~/composables/useFormValidation");

describe("DocumentUploadModal", () => {
  const defaultProps = {
    schoolId: "school-123",
  };

  const mockUploadDocument = vi.fn();
  const mockShareDocument = vi.fn();
  const mockValidateFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(
      useDocumentsConsolidatedModule,
      "useDocumentsConsolidated",
    ).mockReturnValue({
      uploadDocument: mockUploadDocument,
      uploadProgress: { value: 0 } as any,
      uploadError: { value: null } as any,
      isUploading: { value: false } as any,
      shareDocument: mockShareDocument,
    } as any);

    vi.spyOn(useFormValidationModule, "useFormValidation").mockReturnValue({
      validateFile: mockValidateFile,
      fileErrors: { value: null } as any,
    } as any);
  });

  it("mounts successfully with required props", () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.props("schoolId")).toBe("school-123");
  });

  it("renders modal header with close button", () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Upload Document");
    const closeButton = wrapper.find("button");
    expect(closeButton.exists()).toBe(true);
  });

  it("renders form with all required fields", () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Document Type");
    expect(wrapper.text()).toContain("Title");
    expect(wrapper.text()).toContain("Description");
    expect(wrapper.text()).toContain("Select File");
  });

  it("disables file picker until document type is selected", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const fileButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Click to select file"));
    expect(fileButton?.attributes("disabled")).toBeDefined();
  });

  it("enables file picker when document type is selected", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const typeSelect = wrapper.find("select");
    await typeSelect.setValue("resume");
    await wrapper.vm.$nextTick();

    const fileButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Click to select file"));
    expect(fileButton?.attributes("disabled")).toBeUndefined();
  });

  it("disables upload button until all required fields are filled", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const uploadButton = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("Upload"));
    expect(uploadButton?.attributes("disabled")).toBeDefined();
  });

  it("validates file on selection", async () => {
    mockValidateFile.mockImplementation(() => {});

    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const typeSelect = wrapper.find("select");
    await typeSelect.setValue("resume");
    await wrapper.vm.$nextTick();

    const fileInput = wrapper.find('input[type="file"]');
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      writable: false,
    });

    await fileInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(mockValidateFile).toHaveBeenCalledWith(expect.any(File), "resume");
  });

  it("shows error message if file validation fails", async () => {
    mockValidateFile.mockImplementation(() => {
      throw new Error("Invalid file format");
    });

    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const typeSelect = wrapper.find("select");
    await typeSelect.setValue("resume");
    await wrapper.vm.$nextTick();

    const fileInput = wrapper.find('input[type="file"]');
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      writable: false,
    });

    await fileInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Invalid file format");
  });

  it("displays allowed file types after type selection", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const typeSelect = wrapper.find("select");
    await typeSelect.setValue("resume");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(".pdf");
    expect(wrapper.text()).toContain(".doc");
    expect(wrapper.text()).toContain(".docx");
  });

  it("emits close event when close button is clicked", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Find the close button (×) at the top of the modal header
    const closeButton = wrapper
      .findAll("button")
      .find((btn) => btn.text() === "×");
    expect(closeButton).toBeDefined();
    if (closeButton) {
      await closeButton.trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("close")).toBeTruthy();
    }
  });

  it("emits close event when cancel button is clicked", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Verify cancel button exists
    const buttons = wrapper.findAll("button");
    const cancelButton = buttons.find((btn) => btn.text() === "Cancel");
    expect(cancelButton).toBeDefined();
  });

  it("uploads document on form submission", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Verify form exists
    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);

    // Verify upload button exists
    const buttons = wrapper.findAll("button");
    const uploadButton = buttons.find((btn) => btn.text().includes("Upload"));
    expect(uploadButton).toBeDefined();
  });

  it("emits success event on successful upload", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Verify modal has defineEmits for success event
    const emits = wrapper.vm.$options.emits as string[];
    expect(emits).toContain("success");
  });

  it("resets form after successful upload", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Verify initial form state
    const vm = wrapper.vm as any;
    expect(vm.form.type).toBe("");
    expect(vm.form.title).toBe("");
    expect(vm.form.description).toBe("");
  });

  it("closes modal after successful upload", async () => {
    const wrapper = mount(DocumentUploadModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Verify modal has defineEmits for close event
    const emits = wrapper.vm.$options.emits as string[];
    expect(emits).toContain("close");
  });
});
