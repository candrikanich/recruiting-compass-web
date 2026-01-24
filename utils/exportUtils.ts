/**
 * Export utilities for generating CSV and PDF reports
 */

import type { Interaction, School, Offer } from "~/types/models";
import { downloadFile } from "./exportHelpers";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// ============================================
// CSV Export Utilities
// ============================================

/**
 * Escape a value for CSV format
 */
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert array of objects to CSV string
 */
export const toCSV = (headers: string[], rows: any[][]): string => {
  const headerRow = headers.map(escapeCSV).join(",");
  const dataRows = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerRow, ...dataRows].join("\n");
};

// ============================================
// Interaction Exports
// ============================================

export interface InteractionExportData extends Interaction {
  schoolName?: string;
  coachName?: string;
}

export const exportInteractionsToCSV = (
  interactions: InteractionExportData[],
  filename?: string,
): void => {
  const headers = [
    "Date",
    "Type",
    "Direction",
    "School",
    "Coach",
    "Subject",
    "Content",
    "Sentiment",
  ];

  const rows = interactions.map((i) => [
    i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : "",
    formatInteractionType(i.type),
    i.direction === "outbound" ? "Outbound" : "Inbound",
    i.schoolName || "",
    i.coachName || "",
    i.subject || "",
    i.content || "",
    formatSentiment(i.sentiment),
  ]);

  const csv = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  downloadFile(
    csv,
    filename || `interactions-${date}.csv`,
    "text/csv;charset=utf-8;",
  );
};

// ============================================
// School Comparison Export
// ============================================

export interface SchoolComparisonData extends School {
  coachCount?: number;
  interactionCount?: number;
  offer?: Offer | null;
  distance?: number | null;
}

export const exportSchoolComparisonToCSV = (
  schools: SchoolComparisonData[],
  filename?: string,
): void => {
  const headers = [
    "School Name",
    "Division",
    "Conference",
    "Location",
    "Distance (mi)",
    "Status",
    "Ranking",
    "Coaches",
    "Interactions",
    "Offer Type",
    "Scholarship %",
    "Offer Status",
    "Deadline",
    "Pros",
    "Cons",
  ];

  const rows = schools.map((s) => [
    s.name,
    s.division || "",
    s.conference || "",
    s.location || "",
    s.distance ? Math.round(s.distance) : "",
    formatStatus(s.status),
    s.ranking || "",
    s.coachCount || 0,
    s.interactionCount || 0,
    s.offer ? formatOfferType(s.offer.offer_type) : "",
    s.offer?.scholarship_percentage ? `${s.offer.scholarship_percentage}%` : "",
    s.offer ? formatOfferStatus(s.offer.status) : "",
    s.offer?.deadline_date
      ? new Date(s.offer.deadline_date).toLocaleDateString()
      : "",
    (s.pros || []).join("; "),
    (s.cons || []).join("; "),
  ]);

  const csv = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  downloadFile(
    csv,
    filename || `school-comparison-${date}.csv`,
    "text/csv;charset=utf-8;",
  );
};

// ============================================
// PDF Generation (HTML-based)
// ============================================

/**
 * Generate a printable HTML report and open in new window for printing/PDF
 */
export const generatePrintableReport = (
  title: string,
  content: string,
  styles?: string,
): void => {
  const defaultStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; color: #333; }
    .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
    .summary-card { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: 700; color: #2563eb; }
    .summary-card .label { font-size: 12px; color: #666; margin-top: 4px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${styles || defaultStyles}</style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated on ${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</div>
      ${content}
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

/**
 * Generate Interaction History PDF Report
 */
export const generateInteractionsPDF = (
  interactions: InteractionExportData[],
  title?: string,
): void => {
  // Summary stats
  const totalCount = interactions.length;
  const outboundCount = interactions.filter(
    (i) => i.direction === "outbound",
  ).length;
  const inboundCount = interactions.filter(
    (i) => i.direction === "inbound",
  ).length;
  const positiveCount = interactions.filter(
    (i) => i.sentiment === "positive" || i.sentiment === "very_positive",
  ).length;

  const summaryHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${totalCount}</div>
        <div class="label">Total Interactions</div>
      </div>
      <div class="summary-card">
        <div class="value">${outboundCount}</div>
        <div class="label">Outbound</div>
      </div>
      <div class="summary-card">
        <div class="value">${inboundCount}</div>
        <div class="label">Inbound</div>
      </div>
      <div class="summary-card">
        <div class="value">${totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0}%</div>
        <div class="label">Positive Sentiment</div>
      </div>
    </div>
  `;

  // Group by school
  const bySchool = new Map<string, InteractionExportData[]>();
  interactions.forEach((i) => {
    const key = i.schoolName || "No School";
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key)!.push(i);
  });

  let tableHTML = "";
  bySchool.forEach((schoolInteractions, schoolName) => {
    tableHTML += `<h2>${schoolName} (${schoolInteractions.length})</h2>`;
    tableHTML += `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Direction</th>
            <th>Coach</th>
            <th>Subject</th>
            <th>Sentiment</th>
          </tr>
        </thead>
        <tbody>
          ${schoolInteractions
            .map(
              (i) => `
            <tr>
              <td>${i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : "-"}</td>
              <td>${formatInteractionType(i.type)}</td>
              <td><span class="badge ${i.direction === "outbound" ? "badge-blue" : "badge-green"}">${i.direction}</span></td>
              <td>${i.coachName || "-"}</td>
              <td>${i.subject || "-"}</td>
              <td>${getSentimentBadge(i.sentiment)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  });

  generatePrintableReport(
    title || "Interaction History Report",
    summaryHTML + tableHTML,
  );
};

/**
 * Generate School Comparison PDF Report
 */
export const generateSchoolComparisonPDF = (
  schools: SchoolComparisonData[],
  title?: string,
): void => {
  // Summary stats
  const totalSchools = schools.length;
  const withOffers = schools.filter((s) => s.offer).length;
  const favorites = schools.filter((s) => s.is_favorite).length;
  const avgDistance =
    schools.filter((s) => s.distance).length > 0
      ? Math.round(
          schools
            .filter((s) => s.distance)
            .reduce((sum, s) => sum + (s.distance || 0), 0) /
            schools.filter((s) => s.distance).length,
        )
      : 0;

  const summaryHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${totalSchools}</div>
        <div class="label">Schools</div>
      </div>
      <div class="summary-card">
        <div class="value">${withOffers}</div>
        <div class="label">With Offers</div>
      </div>
      <div class="summary-card">
        <div class="value">${favorites}</div>
        <div class="label">Favorites</div>
      </div>
      <div class="summary-card">
        <div class="value">${avgDistance} mi</div>
        <div class="label">Avg Distance</div>
      </div>
    </div>
  `;

  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>School</th>
          <th>Division</th>
          <th>Distance</th>
          <th>Status</th>
          <th>Offer</th>
          <th>Scholarship</th>
        </tr>
      </thead>
      <tbody>
        ${schools
          .map(
            (s, idx) => `
          <tr>
            <td>${s.ranking || idx + 1}</td>
            <td><strong>${s.name}</strong><br><small style="color:#666">${s.location || ""}</small></td>
            <td>${s.division || "-"}</td>
            <td>${s.distance ? `${Math.round(s.distance)} mi` : "-"}</td>
            <td>${getStatusBadge(s.status)}</td>
            <td>${s.offer ? formatOfferType(s.offer.offer_type) : "-"}</td>
            <td>${s.offer?.scholarship_percentage ? `${s.offer.scholarship_percentage}%` : "-"}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <h2>School Details</h2>
    ${schools
      .map(
        (s) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0;">${s.name}</h3>
        <p style="color: #666; margin: 0 0 12px 0;">${s.division || ""} ${s.conference ? `• ${s.conference}` : ""} ${s.location ? `• ${s.location}` : ""}</p>
        ${
          s.pros && s.pros.length > 0
            ? `
          <p><strong style="color: #059669;">Pros:</strong> ${s.pros.join(", ")}</p>
        `
            : ""
        }
        ${
          s.cons && s.cons.length > 0
            ? `
          <p><strong style="color: #dc2626;">Cons:</strong> ${s.cons.join(", ")}</p>
        `
            : ""
        }
        ${
          s.offer
            ? `
          <p><strong>Offer:</strong> ${formatOfferType(s.offer.offer_type)} - ${s.offer.scholarship_percentage || 0}% scholarship
          ${s.offer.deadline_date ? ` (Deadline: ${new Date(s.offer.deadline_date).toLocaleDateString()})` : ""}</p>
        `
            : ""
        }
      </div>
    `,
      )
      .join("")}
  `;

  generatePrintableReport(
    title || "School Comparison Report",
    summaryHTML + tableHTML,
  );
};

// ============================================
// Analytics Chart Export
// ============================================

/**
 * Convert a chart canvas element to PNG image data URL
 */
export const chartToImage = async (
  chartElement: HTMLCanvasElement,
): Promise<string> => {
  if (!chartElement) {
    throw new Error("Chart element is null or undefined");
  }
  return chartElement.toDataURL("image/png");
};

/**
 * Convert a DOM element containing a chart to image data URL
 */
export const elementToImage = async (element: HTMLElement): Promise<string> => {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
  });
  return canvas.toDataURL("image/png");
};

/**
 * Export analytics dashboard as PDF with embedded charts
 */
export const exportAnalyticsPDF = async (
  charts: Array<{ title: string; element: HTMLElement }>,
  dateRange: { start: string; end: string },
  summaryStats: Array<{ label: string; value: string | number }>,
  filename?: string,
): Promise<void> => {
  try {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text("Analytics Report", margin, margin + 10);

    // Date range
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // gray-600
    doc.text(
      `Period: ${dateRange?.start || "N/A"} to ${dateRange?.end || "N/A"}`,
      margin,
      margin + 25,
    );

    let yOffset = margin + 40;

    // Summary stats table
    if (summaryStats.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text("Summary Statistics", margin, yOffset);
      yOffset += 10;

      const tableData = summaryStats.map((stat) => [
        stat.label,
        String(stat.value),
      ]);
      doc.autoTable({
        head: [["Metric", "Value"]],
        body: tableData,
        startY: yOffset,
        margin: margin,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      yOffset = doc.lastAutoTable.finalY + 15;
    }

    // Add charts
    for (const chart of charts) {
      // Check if we need a new page
      if (yOffset > pageHeight - 120) {
        doc.addPage();
        yOffset = margin;
      }

      // Chart title
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(chart.title, margin, yOffset);
      yOffset += 10;

      try {
        // Convert chart to image
        const imgData = await elementToImage(chart.element);

        // Calculate image dimensions to fit the page
        const imgWidth = contentWidth;
        const imgHeight = (imgWidth * 3) / 4; // 4:3 aspect ratio

        // Check if we need a new page
        if (yOffset + imgHeight > pageHeight - margin) {
          doc.addPage();
          yOffset = margin;
        }

        // Add image
        doc.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 15;
      } catch (error) {
        console.error(`Failed to export chart: ${chart.title}`, error);
        // Continue with other charts
      }
    }

    // Download
    const date = new Date().toISOString().split("T")[0];
    doc.save(filename || `analytics-report-${date}.pdf`);
  } catch (error) {
    console.error("Failed to export analytics PDF:", error);
    throw error;
  }
};

/**
 * Export analytics data as Excel with charts
 */
export const exportAnalyticsExcel = async (
  chartImages: Array<{ title: string; imageData: string }>,
  data: Array<Record<string, any>>,
  filename?: string,
): Promise<void> => {
  try {
    const XLSX = await import("xlsx");

    const workbook = XLSX.utils.book_new();

    // Data sheet
    if (data && data.length > 0) {
      const dataSheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
    }

    // Summary sheet for charts
    const summaryData = [
      ["Analytics Charts"],
      [],
      ["Charts are embedded as images in PDF export."],
      [
        "Use the PDF export option for a complete report with all visualizations.",
      ],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Analytics");

    // Download
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, filename || `analytics-data-${date}.xlsx`);
  } catch (error) {
    console.error("Failed to export analytics Excel:", error);
    throw error;
  }
};

/**
 * Generate printable analytics report with charts
 */
export const generateAnalyticsReport = async (
  title: string,
  charts: Array<{ title: string; element: HTMLElement }>,
  summaryHTML: string,
  dateRange: { start: string; end: string },
): Promise<string> => {
  const defaultStyles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.5;
      background: #f9fafb;
    }
    h1 { font-size: 32px; margin-bottom: 8px; color: #1f2937; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 16px; color: #374151; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
    .meta { color: #6b7280; font-size: 16px; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0; }
    .summary-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-card .value { font-size: 32px; font-weight: 700; color: #2563eb; }
    .summary-card .label { font-size: 14px; color: #6b7280; margin-top: 8px; }
    .chart-container { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
    .chart-container img { max-width: 100%; height: auto; }
    @media print {
      body { padding: 0; background: white; }
      .no-print { display: none; }
      .chart-container { page-break-inside: avoid; box-shadow: none; border: 1px solid #e5e7eb; }
    }
  `;

  let chartsHTML = "";
  for (const chart of charts) {
    try {
      const imgData = await elementToImage(chart.element);
      chartsHTML += `
        <div class="chart-container">
          <h2>${chart.title}</h2>
          <img src="${imgData}" alt="${chart.title}" />
        </div>
      `;
    } catch (error) {
      console.error(`Failed to convert chart: ${chart.title}`, error);
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${defaultStyles}</style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Period: ${dateRange?.start || "N/A"} to ${dateRange?.end || "N/A"}</div>
      <div class="meta">Generated on ${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</div>
      ${summaryHTML}
      ${chartsHTML}
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
   `;

  // In test environment, window.open might return null, so always return html
  if (typeof window !== "undefined" && window.open) {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }

  return html;
};

// ============================================
// Formatting Helpers
// ============================================

const formatInteractionType = (type: string): string => {
  const types: Record<string, string> = {
    email: "Email",
    phone_call: "Phone Call",
    text: "Text",
    in_person_visit: "In-Person Visit",
    virtual_meeting: "Virtual Meeting",
    camp: "Camp",
    showcase: "Showcase",
    tweet: "Tweet",
    dm: "DM",
  };
  return types[type] || type;
};

const formatSentiment = (sentiment: string | null | undefined): string => {
  if (!sentiment) return "";
  const sentiments: Record<string, string> = {
    very_positive: "Very Positive",
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
  };
  return sentiments[sentiment] || sentiment;
};

const formatStatus = (status: string): string => {
  const statuses: Record<string, string> = {
    researching: "Researching",
    contacted: "Contacted",
    interested: "Interested",
    offer_received: "Offer Received",
    declined: "Declined",
    committed: "Committed",
  };
  return statuses[status] || status;
};

const formatOfferType = (type: string): string => {
  const types: Record<string, string> = {
    full_ride: "Full Ride",
    partial: "Partial",
    scholarship: "Scholarship",
    recruited_walk_on: "Recruited Walk-On",
    preferred_walk_on: "Preferred Walk-On",
  };
  return types[type] || type;
};

const formatOfferStatus = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
  };
  return statuses[status] || status;
};

const getSentimentBadge = (sentiment: string | null | undefined): string => {
  if (!sentiment) return "-";
  const badges: Record<string, string> = {
    very_positive: '<span class="badge badge-green">Very Positive</span>',
    positive: '<span class="badge badge-blue">Positive</span>',
    neutral: '<span class="badge badge-gray">Neutral</span>',
    negative: '<span class="badge badge-red">Negative</span>',
  };
  return badges[sentiment] || sentiment;
};

const getStatusBadge = (status: string): string => {
  const badges: Record<string, string> = {
    researching: '<span class="badge badge-gray">Researching</span>',
    contacted: '<span class="badge badge-blue">Contacted</span>',
    interested: '<span class="badge badge-yellow">Interested</span>',
    offer_received: '<span class="badge badge-green">Offer</span>',
    declined: '<span class="badge badge-red">Declined</span>',
    committed: '<span class="badge badge-green">Committed</span>',
  };
  return badges[status] || status;
};
