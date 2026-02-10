export const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    researching: "bg-slate-100 text-slate-700",
    contacted: "bg-yellow-100 text-yellow-700",
    interested: "bg-emerald-100 text-emerald-700",
    offer_received: "bg-green-100 text-green-700",
    committed: "bg-purple-100 text-purple-700",
    declined: "bg-red-100 text-red-700",
  };
  return classes[status] || "bg-slate-100 text-slate-700";
};

export const getSizeBadgeClass = (size: string | null | undefined): string => {
  if (!size) return "";
  const classes: Record<string, string> = {
    "Very Small": "bg-indigo-100 text-indigo-700",
    Small: "bg-blue-100 text-blue-700",
    Medium: "bg-emerald-100 text-emerald-700",
    Large: "bg-orange-100 text-orange-700",
    "Very Large": "bg-purple-100 text-purple-700",
  };
  return classes[size] || "bg-slate-100 text-slate-700";
};

export const getFitScoreBadgeClass = (score: number): string => {
  if (score >= 70) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
};

export const formatSchoolStatus = (status: string): string => {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};
