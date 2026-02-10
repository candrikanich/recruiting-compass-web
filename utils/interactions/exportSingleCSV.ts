import type { Interaction, School, Coach } from "~/types/models";
import { formatDateTime } from "~/utils/dateFormatters";

/**
 * Export a single interaction to CSV format with related data
 */
export const exportSingleInteractionToCSV = (
  interaction: Interaction,
  school?: School | null,
  coach?: Coach | null,
): string => {
  const rows = [
    ["Field", "Value"],
    ["Subject", interaction.subject || "N/A"],
    ["Type", interaction.type],
    ["Direction", interaction.direction],
    ["Sentiment", interaction.sentiment || "N/A"],
    ["School", school?.name || "N/A"],
    ["Coach", coach ? `${coach.first_name} ${coach.last_name}` : "N/A"],
    ["Date", formatDateTime(interaction.occurred_at)],
    ["Content", interaction.content || "N/A"],
    ["Attachments", String(interaction.attachments?.length || 0)],
  ];

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
};

/**
 * Download a single interaction as CSV file
 */
export const downloadSingleInteractionCSV = (
  interaction: Interaction,
  school?: School | null,
  coach?: Coach | null,
): void => {
  const csv = exportSingleInteractionToCSV(interaction, school, coach);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = `interaction-${(interaction.subject || "export").toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
