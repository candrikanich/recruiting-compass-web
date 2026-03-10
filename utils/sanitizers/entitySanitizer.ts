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

export const sanitizeCoachFields = <T extends CoachFields>(data: T): T => ({
  ...data,
  ...(data.notes != null && { notes: sanitizeHtml(data.notes) }),
});

export const sanitizeSchoolFields = <T extends SchoolFields>(data: T): T => ({
  ...data,
  ...(data.notes != null && { notes: sanitizeHtml(data.notes) }),
  ...(data.pros != null && { pros: data.pros.filter((p): p is string => p != null && p !== "").map(sanitizeHtml) }),
  ...(data.cons != null && { cons: data.cons.filter((c): c is string => c != null && c !== "").map(sanitizeHtml) }),
  ...(data.coaching_philosophy != null && { coaching_philosophy: sanitizeHtml(data.coaching_philosophy) }),
  ...(data.coaching_style != null && { coaching_style: sanitizeHtml(data.coaching_style) }),
  ...(data.recruiting_approach != null && { recruiting_approach: sanitizeHtml(data.recruiting_approach) }),
  ...(data.communication_style != null && { communication_style: sanitizeHtml(data.communication_style) }),
  ...(data.success_metrics != null && { success_metrics: sanitizeHtml(data.success_metrics) }),
});
