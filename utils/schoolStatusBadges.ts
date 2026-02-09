/**
 * Get the Tailwind CSS classes for a school status badge
 * @param status - The school status
 * @returns Tailwind CSS classes for background and text color
 */
export const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    interested: "bg-blue-100 text-blue-700",
    contacted: "bg-slate-100 text-slate-700",
    researching: "bg-slate-100 text-slate-700",
    camp_invite: "bg-purple-100 text-purple-700",
    recruited: "bg-green-100 text-green-700",
    official_visit_invited: "bg-amber-100 text-amber-700",
    official_visit_scheduled: "bg-orange-100 text-orange-700",
    offer_received: "bg-red-100 text-red-700",
    committed: "bg-green-800 text-white",
    not_pursuing: "bg-gray-300 text-gray-700",
  };
  return colors[status] || "bg-slate-100 text-slate-700";
};
