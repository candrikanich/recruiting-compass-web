import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initializePDF,
  addHeader,
  addFooter,
  addMetricsTable,
  addChartImage,
} from "~/utils/pdfHelpers";
import type { PerformanceMetric } from "~/types/models";

/** A recording stand-in for a jsPDF document. */
function makeDoc() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    addImage: vi.fn(),
    splitTextToSize: vi.fn((t: string) => [t]),
    output: vi.fn(() => "blob"),
    addPage: vi.fn(),
    internal: { pageSize: { height: 297 } },
    lastAutoTable: { finalY: 120 },
  };
}

describe("pdfHelpers", () => {
  describe("addHeader", () => {
    it("renders the title, logo box, and no subtitle when omitted", () => {
      const doc = makeDoc();
      addHeader(doc as never, "Athlete Report");
      expect(doc.text).toHaveBeenCalledWith("Athlete Report", 105, 20, {
        align: "center",
      });
      expect(doc.rect).toHaveBeenCalledWith(170, 10, 30, 15, "S");
      // Only title + LOGO text — no subtitle line
      expect(doc.text).toHaveBeenCalledTimes(2);
    });

    it("renders a subtitle line when provided", () => {
      const doc = makeDoc();
      addHeader(doc as never, "Title", "Subtitle");
      expect(doc.text).toHaveBeenCalledWith("Subtitle", 105, 28, {
        align: "center",
      });
      expect(doc.text).toHaveBeenCalledTimes(3);
    });
  });

  describe("addFooter", () => {
    it("renders page number and generated date at the page bottom", () => {
      const doc = makeDoc();
      addFooter(doc as never, 3);
      // pageHeight (297) - 10 = 287
      expect(doc.text).toHaveBeenCalledWith("Page 3", 105, 287, {
        align: "center",
      });
    });
  });

  describe("addMetricsTable", () => {
    beforeEach(() => vi.stubGlobal("autoTable", vi.fn()));
    afterEach(() => vi.unstubAllGlobals());

    it("builds table rows and returns finalY + 10", () => {
      const doc = makeDoc();
      const metrics = [
        {
          recorded_date: "2026-01-15",
          metric_type: "forty_yard",
          value: 4.5,
          unit: "s",
          verified: true,
        },
      ] as unknown as PerformanceMetric[];

      const nextY = addMetricsTable(doc as never, metrics, 40);
      expect(nextY).toBe(130); // lastAutoTable.finalY (120) + 10
    });
  });

  describe("addChartImage", () => {
    it("draws the title and image, returning yPosition + 100", () => {
      const doc = makeDoc();
      const nextY = addChartImage(
        doc as never,
        "data:image/png;base64,xx",
        "Trend",
        50,
      );
      expect(doc.text).toHaveBeenCalledWith("Trend", 15, 50);
      expect(doc.addImage).toHaveBeenCalledWith(
        "data:image/png;base64,xx",
        "PNG",
        15,
        55,
        180,
        90,
      );
      expect(nextY).toBe(150);
    });
  });

  describe("initializePDF", () => {
    it("lazy-loads jsPDF with a4/mm and the given orientation", async () => {
      const ctor = vi.fn();
      vi.doMock("jspdf", () => ({ default: ctor }));
      const doc = await initializePDF("landscape");
      expect(ctor).toHaveBeenCalledWith({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      expect(doc).toBeInstanceOf(ctor);
      vi.doUnmock("jspdf");
    });
  });
});
