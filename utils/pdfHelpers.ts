import type { PerformanceMetric } from "~/types/models";

// Type for jsPDF with autotable support
declare class JsPDF {
  lastAutoTable: {
    finalY: number;
  };
  setFontSize(size: number): void;
  setFont(name: string, weight: string): void;
  text(
    text: string | string[],
    x: number,
    y: number,
    options?: Record<string, unknown>,
  ): void;
  setDrawColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  internal: {
    pageSize: {
      height: number;
    };
  };
  output(type: "blob"): Blob;
  output(type: "datauristring" | string): string;
  addPage(): JsPDF;
  splitTextToSize(text: string, maxWidth: number): string[];
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): JsPDF;
}

// Declare autoTable plugin
declare function autoTable(doc: JsPDF, options: Record<string, unknown>): void;

interface JsPDFWithAutoTable extends JsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * Initialize a new PDF document (lazy-loads jsPDF)
 */
export const initializePDF = async (
  orientation: "portrait" | "landscape" = "portrait",
): Promise<JsPDFWithAutoTable> => {
  const { default: jsPDF } = await import("jspdf");
  return new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  }) as JsPDFWithAutoTable;
};

/**
 * Add header with title and subtitle
 */
export const addHeader = (
  doc: JsPDF,
  title: string,
  subtitle?: string,
): void => {
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 20, { align: "center" });

  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 28, { align: "center" });
  }

  // Add logo placeholder box (top-right corner for future branding)
  doc.setDrawColor(200, 200, 200);
  doc.rect(170, 10, 30, 15, "S");
  doc.setFontSize(8);
  doc.text("LOGO", 185, 18, { align: "center" });
};

/**
 * Add footer with page number and date
 */
export const addFooter = (doc: JsPDF, pageNumber: number): void => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${pageNumber}`, 105, pageHeight - 10, { align: "center" });
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    190,
    pageHeight - 10,
    { align: "right" },
  );
};

/**
 * Add metrics table to PDF
 */
export const addMetricsTable = (
  doc: JsPDF,
  metrics: PerformanceMetric[],
  yPosition: number,
): number => {
  const tableData = metrics.map((m) => [
    new Date(m.recorded_date).toLocaleDateString(),
    m.metric_type.replace("_", " ").toUpperCase(),
    `${m.value} ${m.unit}`,
    m.verified ? "✓" : "—",
  ]);

  autoTable(doc, {
    head: [["Date", "Metric", "Value", "Verified"]],
    body: tableData,
    startY: yPosition,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  });

  const docWithTable = doc as JsPDFWithAutoTable;
  return docWithTable.lastAutoTable.finalY + 10;
};

/**
 * Add chart image to PDF
 */
export const addChartImage = (
  doc: JsPDF,
  base64Image: string,
  title: string,
  yPosition: number,
): number => {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 15, yPosition);

  // Add chart image
  doc.addImage(base64Image, "PNG", 15, yPosition + 5, 180, 90);

  return yPosition + 100;
};
