import { writeFileXLSX, utils } from "xlsx";
import type { School, Coach, Interaction, Offer } from "~/types/models";

/**
 * Export schools to Excel (.xlsx)
 */
export const exportSchoolsToExcel = (
  schools: School[],
  filename = "schools.xlsx",
) => {
  const data = schools.map((s) => ({
    Name: s.name,
    State: s.state,
    City: s.city,
    Division: s.division,
    Status: s.status?.replace("_", " "),
    Ranking: s.ranking || "",
    Notes: s.notes || "",
    "Date Added": s.created_at
      ? new Date(s.created_at).toLocaleDateString()
      : "",
  }));

  const ws = utils.json_to_sheet(data);

  // Format header
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "FF3b82f6" } },
    alignment: { horizontal: "center" },
  };
  for (let i = 0; i < Object.keys(data[0] || {}).length; i++) {
    const cellRef = utils.encode_col(i) + "1";
    ws[cellRef].font = headerStyle.font;
    ws[cellRef].fill = headerStyle.fill;
    ws[cellRef].alignment = headerStyle.alignment;
  }

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 12),
  }));
  ws["!cols"] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Schools");
  writeFileXLSX(wb, filename);
};

/**
 * Export coaches to Excel (.xlsx)
 */
export const exportCoachesToExcel = (
  coaches: Coach[],
  filename = "coaches.xlsx",
) => {
  const data = coaches.map((c) => ({
    Name: `${c.first_name} ${c.last_name}`,
    Email: c.email || "",
    Phone: c.phone || "",
    Role: c.role,
    "Responsiveness Score": c.responsiveness_score,
    "Last Contact": c.last_contact_date
      ? new Date(c.last_contact_date).toLocaleDateString()
      : "",
    Notes: c.notes || "",
  }));

  const ws = utils.json_to_sheet(data);
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "FF60a5fa" } },
    alignment: { horizontal: "center" },
  };

  for (let i = 0; i < Object.keys(data[0] || {}).length; i++) {
    const cellRef = utils.encode_col(i) + "1";
    ws[cellRef].font = headerStyle.font;
    ws[cellRef].fill = headerStyle.fill;
    ws[cellRef].alignment = headerStyle.alignment;
  }

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 12),
  }));
  ws["!cols"] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Coaches");
  writeFileXLSX(wb, filename);
};

/**
 * Export interactions to Excel (.xlsx)
 */
export const exportInteractionsToExcel = (
  interactions: Interaction[],
  filename = "interactions.xlsx",
) => {
  const data = interactions.map((i) => ({
    Date: i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : "",
    Type: i.type,
    Direction: i.direction,
    Subject: i.subject || "",
    Content: i.content || "",
    Sentiment: i.sentiment?.replace("_", " ") || "",
  }));

  const ws = utils.json_to_sheet(data);
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "FF34d399" } },
    alignment: { horizontal: "center" },
  };

  for (let i = 0; i < Object.keys(data[0] || {}).length; i++) {
    const cellRef = utils.encode_col(i) + "1";
    ws[cellRef].font = headerStyle.font;
    ws[cellRef].fill = headerStyle.fill;
    ws[cellRef].alignment = headerStyle.alignment;
  }

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 12),
  }));
  ws["!cols"] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Interactions");
  writeFileXLSX(wb, filename);
};

/**
 * Export offers to Excel (.xlsx)
 */
export const exportOffersToExcel = (
  offers: Offer[],
  filename = "offers.xlsx",
) => {
  const data = offers.map((o) => ({
    School: o.school_id || "",
    Status: o.status?.replace("_", " "),
    Type: o.offer_type?.replace("_", " "),
    Scholarship: o.scholarship_amount
      ? `$${o.scholarship_amount.toLocaleString()}`
      : "",
    Percentage: o.scholarship_percentage ? `${o.scholarship_percentage}%` : "",
    Deadline: o.deadline_date
      ? new Date(o.deadline_date).toLocaleDateString()
      : "",
    Notes: o.notes || "",
  }));

  const ws = utils.json_to_sheet(data);
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "FFfbbf24" } },
    alignment: { horizontal: "center" },
  };

  for (let i = 0; i < Object.keys(data[0] || {}).length; i++) {
    const cellRef = utils.encode_col(i) + "1";
    ws[cellRef].font = headerStyle.font;
    ws[cellRef].fill = headerStyle.fill;
    ws[cellRef].alignment = headerStyle.alignment;
  }

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 12),
  }));
  ws["!cols"] = colWidths;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Offers");
  writeFileXLSX(wb, filename);
};
