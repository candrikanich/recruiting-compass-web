import { sanitizeHtml } from "~/utils/validation/sanitize";

type CoachFields = { notes?: string | null; [key: string]: unknown };
type SchoolFields = {
  notes?: string | null;
  pros?: (string | null | undefined)[];
  cons?: (string | null | undefined)[];
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
  if (result.pros) result.pros = result.pros.map((p) => (p ? sanitizeHtml(p) : p));
  if (result.cons) result.cons = result.cons.map((c) => (c ? sanitizeHtml(c) : c));
  return result;
};
