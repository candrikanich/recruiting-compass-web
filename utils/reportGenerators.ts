import {
  initializePDF,
  addHeader,
  addFooter,
  addMetricsTable,
  addChartImage,
} from "./pdfHelpers";
import {
  generateCoachEmailTemplate,
  generateEventSummaryTemplate,
  getMetricLabel,
} from "./textTemplates";
import type { PerformanceMetric, Event } from "~/types/models";

export interface ReportOptions {
  metrics: PerformanceMetric[];
  format: "pdf" | "text";
  athleteName: string;
  coachName?: string;
  event?: Event;
  chartImage?: string; // base64 image from chart.js
}

/**
 * Generate individual metric report (PDF or text)
 */
export const generateIndividualMetricReport = async (
  metricType: string,
  options: ReportOptions,
): Promise<string | Blob> => {
  const { metrics, format, athleteName, chartImage } = options;

  const filteredMetrics = metrics.filter((m) => m.metric_type === metricType);

  if (format === "pdf") {
    const doc = await initializePDF("portrait");
    addHeader(doc, `${athleteName} - ${getMetricLabel(metricType)} Report`);

    let yPos = 40;

    if (filteredMetrics.length > 0) {
      yPos = addMetricsTable(doc, filteredMetrics, yPos);

      if (chartImage && yPos < 200) {
        yPos = addChartImage(doc, chartImage, "Performance Trend", yPos);
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.text("No metrics available for this metric type.", 15, yPos);
    }

    addFooter(doc, 1);
    return doc.output("blob");
  } else {
    // Text format
    return generateCoachEmailTemplate(
      athleteName,
      options.coachName || "Coach",
      filteredMetrics,
    );
  }
};

/**
 * Generate comprehensive athlete performance report (PDF or text)
 */
export const generateComprehensiveReport = async (
  options: ReportOptions,
): Promise<string | Blob> => {
  const { metrics, format, athleteName } = options;

  if (format === "pdf") {
    const doc = await initializePDF("portrait");
    addHeader(
      doc,
      `${athleteName} - Comprehensive Performance Report`,
      "All Metrics Summary",
    );

    let yPos = 40;
    let pageNum = 1;

    if (metrics.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("No metrics available.", 15, yPos);
      addFooter(doc, pageNum);
      return doc.output("blob");
    }

    // Group metrics by category
    const metricsByType = metrics.reduce(
      (acc, m) => {
        if (!acc[m.metric_type]) acc[m.metric_type] = [];
        acc[m.metric_type].push(m);
        return acc;
      },
      {} as Record<string, PerformanceMetric[]>,
    );

    // Add table for each metric type
    Object.entries(metricsByType).forEach(([type, typeMetrics]) => {
      // Check if need new page
      if (yPos > 220) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(getMetricLabel(type), 15, yPos);
      yPos += 8;

      yPos = addMetricsTable(doc, typeMetrics, yPos);
      yPos += 5;
    });

    addFooter(doc, pageNum);
    return doc.output("blob");
  } else {
    return generateCoachEmailTemplate(
      athleteName,
      options.coachName || "Coach",
      metrics,
    );
  }
};

/**
 * Generate event-specific performance report (PDF or text)
 */
export const generateEventReport = async (
  options: ReportOptions,
): Promise<string | Blob> => {
  const { metrics, format, athleteName, event } = options;

  if (!event) throw new Error("Event required for event report");

  if (format === "pdf") {
    const doc = await initializePDF("portrait");
    addHeader(doc, `${event.name} - Performance Report`, athleteName);

    // Event details
    let yPos = 40;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Date: ${new Date(event.start_date).toLocaleDateString()}`,
      15,
      yPos,
    );
    doc.text(`Location: ${event.location || "N/A"}`, 15, yPos + 7);
    yPos += 20;

    // Metrics table
    if (metrics.length > 0) {
      yPos = addMetricsTable(doc, metrics, yPos);
      yPos += 5;
    } else {
      doc.text("No metrics recorded at this event.", 15, yPos);
      yPos += 10;
    }

    // Performance notes
    if (event.performance_notes) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Notes:", 15, yPos);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(event.performance_notes, 180);
      doc.text(splitNotes, 15, yPos + 7);
    }

    addFooter(doc, 1);
    return doc.output("blob");
  } else {
    return generateEventSummaryTemplate(event, metrics, athleteName);
  }
};
