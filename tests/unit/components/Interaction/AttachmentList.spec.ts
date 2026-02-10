import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AttachmentList from "~/components/Interaction/AttachmentList.vue";
import * as formatters from "~/utils/formatters";

// Mock the extractFilename utility
vi.mock("~/utils/formatters", () => ({
  extractFilename: vi.fn((url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1];
  }),
}));

describe("AttachmentList", () => {
  const mockAttachments = [
    "https://example.com/files/document1.pdf",
    "https://example.com/files/image.jpg",
    "https://example.com/files/report-2024.xlsx",
  ];

  describe("Rendering", () => {
    it("renders attachment count in heading", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const heading = wrapper.find("h2");
      expect(heading.text()).toContain("Attachments (3)");
    });

    it("renders correct count for single attachment", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: ["https://example.com/single.pdf"],
        },
      });

      expect(wrapper.find("h2").text()).toContain("Attachments (1)");
    });

    it("renders all attachment links", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      expect(links.length).toBe(3);
    });

    it("calls extractFilename for each attachment", () => {
      const spy = vi.spyOn(formatters, "extractFilename");

      mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(mockAttachments[0]);
      expect(spy).toHaveBeenCalledWith(mockAttachments[1]);
      expect(spy).toHaveBeenCalledWith(mockAttachments[2]);
    });

    it("displays extracted filename for each attachment", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      expect(wrapper.text()).toContain("document1.pdf");
      expect(wrapper.text()).toContain("image.jpg");
      expect(wrapper.text()).toContain("report-2024.xlsx");
    });

    it("includes paperclip emoji in each attachment link", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        expect(link.text()).toContain("📎");
      });
    });
  });

  describe("Link Attributes", () => {
    it("sets correct href for each attachment", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      expect(links[0].attributes("href")).toBe(mockAttachments[0]);
      expect(links[1].attributes("href")).toBe(mockAttachments[1]);
      expect(links[2].attributes("href")).toBe(mockAttachments[2]);
    });

    it("sets target='_blank' on all links", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        expect(link.attributes("target")).toBe("_blank");
      });
    });

    it("sets rel='noopener noreferrer' on all links", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        expect(link.attributes("rel")).toBe("noopener noreferrer");
      });
    });
  });

  describe("Styling", () => {
    it("applies container CSS classes", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const container = wrapper.find("div.bg-white");
      expect(container.classes()).toContain("bg-white");
      expect(container.classes()).toContain("rounded-lg");
      expect(container.classes()).toContain("shadow");
      expect(container.classes()).toContain("p-6");
    });

    it("applies heading CSS classes", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const heading = wrapper.find("h2");
      expect(heading.classes()).toContain("text-xl");
      expect(heading.classes()).toContain("font-bold");
      expect(heading.classes()).toContain("mb-4");
    });

    it("applies grid layout classes", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const grid = wrapper.find(".grid");
      expect(grid.classes()).toContain("grid");
      expect(grid.classes()).toContain("grid-cols-2");
      expect(grid.classes()).toContain("gap-4");
    });

    it("applies link CSS classes", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        expect(link.classes()).toContain("p-4");
        expect(link.classes()).toContain("border");
        expect(link.classes()).toContain("rounded-lg");
        expect(link.classes()).toContain("hover:bg-gray-50");
        expect(link.classes()).toContain("transition");
      });
    });

    it("applies text CSS classes to filename paragraph", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const paragraphs = wrapper.findAll("p");
      paragraphs.forEach((p) => {
        expect(p.classes()).toContain("text-sm");
        expect(p.classes()).toContain("font-medium");
        expect(p.classes()).toContain("text-blue-600");
        expect(p.classes()).toContain("break-all");
      });
    });
  });

  describe("Empty State", () => {
    it("renders with empty array", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: [],
        },
      });

      expect(wrapper.find("h2").text()).toContain("Attachments (0)");
      expect(wrapper.findAll("a").length).toBe(0);
    });

    it("does not crash with empty attachments", () => {
      expect(() => {
        mount(AttachmentList, {
          props: {
            attachments: [],
          },
        });
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long filenames", () => {
      const longFilename = "a".repeat(200) + ".pdf";
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: [`https://example.com/${longFilename}`],
        },
      });

      const paragraph = wrapper.find("p");
      expect(paragraph.classes()).toContain("break-all");
      expect(wrapper.text()).toContain(longFilename);
    });

    it("handles URLs with special characters", () => {
      const specialUrl =
        "https://example.com/files/report%202024%20(final).pdf";
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: [specialUrl],
        },
      });

      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe(specialUrl);
    });

    it("handles single attachment correctly", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: ["https://example.com/single.pdf"],
        },
      });

      expect(wrapper.findAll("a").length).toBe(1);
      expect(wrapper.find("h2").text()).toContain("(1)");
    });

    it("handles many attachments (10+)", () => {
      const manyAttachments = Array.from(
        { length: 15 },
        (_, i) => `https://example.com/file${i}.pdf`,
      );

      const wrapper = mount(AttachmentList, {
        props: {
          attachments: manyAttachments,
        },
      });

      expect(wrapper.findAll("a").length).toBe(15);
      expect(wrapper.find("h2").text()).toContain("(15)");
    });

    it("handles attachments with no file extension", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: ["https://example.com/files/document"],
        },
      });

      expect(wrapper.text()).toContain("document");
    });

    it("handles duplicate URLs", () => {
      const duplicates = [
        "https://example.com/file.pdf",
        "https://example.com/file.pdf",
        "https://example.com/file.pdf",
      ];

      const wrapper = mount(AttachmentList, {
        props: {
          attachments: duplicates,
        },
      });

      // Should still render all 3, even if duplicates
      expect(wrapper.findAll("a").length).toBe(3);
    });
  });

  describe("Grid Layout", () => {
    it("renders attachments in 2-column grid", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const grid = wrapper.find(".grid");
      expect(grid.classes()).toContain("grid-cols-2");
    });

    it("maintains grid structure with odd number of attachments", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: [
            "https://example.com/1.pdf",
            "https://example.com/2.pdf",
            "https://example.com/3.pdf",
          ],
        },
      });

      const grid = wrapper.find(".grid");
      expect(grid.classes()).toContain("grid-cols-2");
      expect(wrapper.findAll("a").length).toBe(3);
    });
  });

  describe("Accessibility", () => {
    it("links are keyboard accessible", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        // Links should be naturally keyboard accessible
        expect(link.element.tagName).toBe("A");
      });
    });

    it("links have visible text content", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      const links = wrapper.findAll("a");
      links.forEach((link) => {
        expect(link.text().length).toBeGreaterThan(0);
      });
    });

    it("uses semantic HTML heading", () => {
      const wrapper = mount(AttachmentList, {
        props: {
          attachments: mockAttachments,
        },
      });

      expect(wrapper.find("h2").exists()).toBe(true);
    });
  });
});
