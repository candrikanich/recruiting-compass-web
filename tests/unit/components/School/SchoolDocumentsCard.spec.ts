import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolDocumentsCard from "~/components/School/SchoolDocumentsCard.vue";
import type { Document } from "~/types/models";

// Mock icons
vi.mock("@heroicons/vue/24/outline", () => ({
  DocumentTextIcon: { name: "DocumentTextIcon", template: "<svg />" },
}));

// Mock child components
vi.mock("~/components/School/DocumentUploadModal.vue", () => ({
  default: {
    name: "SchoolDocumentUploadModal",
    template: "<div>Upload Modal</div>",
    props: ["school-id"],
    emits: ["close", "success"],
  },
}));

describe("SchoolDocumentsCard", () => {
  const schoolId = "school-123";
  const mockDocuments: Document[] = [
    {
      id: "doc-1",
      title: "Transcript",
      type: "transcript",
      shared_with_schools: [schoolId],
    } as Document,
    {
      id: "doc-2",
      title: "Highlight Video",
      type: "video",
      shared_with_schools: [schoolId],
    } as Document,
  ];

  describe("rendering", () => {
    it("renders heading", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      expect(wrapper.text()).toContain("Shared Documents");
    });

    it("renders upload button", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      expect(uploadBtn.text()).toContain("Upload");
    });

    it("renders icon", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const icon = wrapper.findComponent({ name: "DocumentTextIcon" });
      expect(icon.exists()).toBe(true);
    });
  });

  describe("documents list", () => {
    it("renders all documents", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: mockDocuments },
      });

      expect(wrapper.text()).toContain("Transcript");
      expect(wrapper.text()).toContain("Highlight Video");
    });

    it("renders document types", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: mockDocuments },
      });

      expect(wrapper.text()).toContain("transcript");
      expect(wrapper.text()).toContain("video");
    });

    it("renders view links for each document", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: mockDocuments },
      });

      const viewButtons = wrapper.findAll("a");
      expect(viewButtons.length).toBeGreaterThanOrEqual(2);
      // Check that document IDs are in href attributes or text
      expect(wrapper.html()).toContain("doc-1");
      expect(wrapper.html()).toContain("doc-2");
    });

    it("renders single document", () => {
      const singleDoc = [mockDocuments[0]];
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: singleDoc },
      });

      expect(wrapper.text()).toContain("Transcript");
      expect(wrapper.text()).not.toContain("Highlight Video");
    });

    it("renders many documents", () => {
      const manyDocs = [
        ...mockDocuments,
        {
          id: "doc-3",
          title: "SAT Scores",
          type: "test_scores",
        } as Document,
        { id: "doc-4", title: "Essay", type: "essay" } as Document,
      ];
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: manyDocs },
      });

      expect(
        wrapper.findAll(".border-slate-200").length,
      ).toBeGreaterThanOrEqual(4);
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no documents", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      expect(wrapper.text()).toContain(
        "No documents shared with this school yet",
      );
    });

    it("hides document list when empty", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const links = wrapper.findAllComponents({ name: "NuxtLink" });
      expect(links.length).toBe(0);
    });

    it("shows upload button even when empty", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      expect(uploadBtn.exists()).toBe(true);
    });
  });

  describe("upload modal", () => {
    it("hides modal by default", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const modal = wrapper.findComponent({
        name: "SchoolDocumentUploadModal",
      });
      expect(modal.exists()).toBe(false);
    });

    it("shows modal when upload button clicked", async () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      await uploadBtn.trigger("click");

      const modal = wrapper.findComponent({
        name: "SchoolDocumentUploadModal",
      });
      expect(modal.exists()).toBe(true);
    });

    it("passes schoolId to modal", async () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      await uploadBtn.trigger("click");

      const modal = wrapper.findComponent({
        name: "SchoolDocumentUploadModal",
      });
      expect(modal.props("schoolId")).toBe(schoolId);
    });

    it("hides modal when close event emitted", async () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      await uploadBtn.trigger("click");

      let modal = wrapper.findComponent({ name: "SchoolDocumentUploadModal" });
      expect(modal.exists()).toBe(true);

      modal.vm.$emit("close");
      await wrapper.vm.$nextTick();

      modal = wrapper.findComponent({ name: "SchoolDocumentUploadModal" });
      expect(modal.exists()).toBe(false);
    });

    it("emits upload-success when modal emits success", async () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      await uploadBtn.trigger("click");

      const modal = wrapper.findComponent({
        name: "SchoolDocumentUploadModal",
      });
      modal.vm.$emit("success");
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("upload-success")).toBeTruthy();
      expect(wrapper.emitted("upload-success")?.length).toBe(1);
    });

    it("hides modal after successful upload", async () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const uploadBtn = wrapper.find("button");
      await uploadBtn.trigger("click");

      let modal = wrapper.findComponent({ name: "SchoolDocumentUploadModal" });
      modal.vm.$emit("success");
      await wrapper.vm.$nextTick();

      modal = wrapper.findComponent({ name: "SchoolDocumentUploadModal" });
      expect(modal.exists()).toBe(false);
    });
  });

  describe("styling", () => {
    it("applies card styling", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: [] },
      });

      const card = wrapper.find(".bg-white.rounded-xl");
      expect(card.exists()).toBe(true);
    });

    it("applies document item styling", () => {
      const wrapper = mount(SchoolDocumentsCard, {
        props: { schoolId, documents: mockDocuments },
      });

      const items = wrapper.findAll(".border-slate-200.rounded-lg");
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
