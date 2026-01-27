import type { Interaction } from "~/types/models";

/**
 * Export interactions to CSV format
 */
export const exportInteractionsToCSV = (interactions: Interaction[]): string => {
  if (interactions.length === 0) return "";

  // Headers
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
    i.type,
    i.direction,
    i.school_id || "",
    i.coach_id || "",
    i.subject || "",
    (i.content || "").replace(/"/g, '""'), // Escape quotes
    i.sentiment || "",
  ]);

  // Build CSV
  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
};

/**
 * Download interactions as CSV file
 */
export const downloadInteractionsCSV = (interactions: Interaction[]): void => {
  const csv = exportInteractionsToCSV(interactions);
  if (!csv) return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `interactions-${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
