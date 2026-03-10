import { sanitizeHtml } from "~/utils/validation/sanitize";

type CoachFields = { notes?: string | null; [key: string]: unknown };
type SchoolFields = {
  notes?: string | null;
  pros?: (string | null | undefined)[];
  cons?: (string | null | undefined)[];
  coaching_philosophy?: string | null;
  coaching_style?: string | null;
  recruiting_approach?: string | null;
  communication_style?: string | null;
  success_metrics?: string | null;
  [key: string]: unknown;
};

export const sanitizeCoachFields = <T extends CoachFields>(data: T): T => {
  const result = { ...data };
  if (result.notes) result.notes = sanitizeHtml(result.notes);
  return result;
};

export const sanitizeSchoolFields = <T extends SchoolFields>(data: T): T => {
  const result = { ...data };
  if (result.notes) result.notes = sanitizeHtml(result.notes);
  if (result.pros) result.pros = result.pros.filter((p): p is string => !!p).map((p) => sanitizeHtml(p));
  if (result.cons) result.cons = result.cons.filter((c): c is string => !!c).map((c) => sanitizeHtml(c));
  if (result.coaching_philosophy) result.coaching_philosophy = sanitizeHtml(result.coaching_philosophy);
  if (result.coaching_style) result.coaching_style = sanitizeHtml(result.coaching_style);
  if (result.recruiting_approach) result.recruiting_approach = sanitizeHtml(result.recruiting_approach);
  if (result.communication_style) result.communication_style = sanitizeHtml(result.communication_style);
  if (result.success_metrics) result.success_metrics = sanitizeHtml(result.success_metrics);
  return result;
};
