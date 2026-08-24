export type MissingEditor =
  | { kind: "text"; multiline: boolean }
  | { kind: "boolean" }
  | { kind: "metricLink" }
  | { kind: "profileLink" };

export interface MissingInfoField {
  id: string;
  title: string;
  prompt: string;
  editor: MissingEditor;
  editableByParent: boolean;
}

export interface MissingInfoInput {
  /** Variable keys referenced by the selected template (subject+body), any order. */
  referencedKeys: string[];
  /** Resolved key -> value map for the current render (empty string / missing = unresolved). */
  values: Record<string, string>;
  /** Keys whose registry source_type is "authored". */
  authoredKeys: Set<string>;
  /** Human labels per key (registry-derived), for "other authored" rows. */
  labels: Record<string, string>;
  /** Raw template body (questionnaireNote is a computed scalar, detected off the body). */
  body: string;
  /** School questionnaire already complete (or answered "yes" this compose). */
  questionnaireComplete: boolean;
  /** The athlete has at least one performance metric. */
  hasMetric: boolean;
  /** Whether the composer is the athlete editing their own data (parent-lock signal). */
  canEditProfile: boolean;
}

const METRIC_KEYS = new Set(["metrics", "carryingTool"]);
const isResolved = (values: Record<string, string>, key: string): boolean =>
  !!(values[key] && values[key].trim());

/**
 * Ordered, missing-only list of the things the selected template still needs.
 * Order is FIXED here (not first-seen in the body) so the step reads the same
 * regardless of template authoring. Empty result → the compose flow skips the
 * info stage straight to preview. Pure; mirrors iOS `missingInfoFields`.
 */
export function deriveMissingInfoFields(input: MissingInfoInput): MissingInfoField[] {
  const rows: MissingInfoField[] = [];
  const referenced = new Set(input.referencedKeys);

  // 1. Questionnaire — computed scalar, detected off the raw body.
  if (input.body.includes("{{questionnaireNote}}") && !input.questionnaireComplete) {
    rows.push({
      id: "questionnaireNote",
      title: "Recruiting questionnaire",
      prompt: "Did you complete this school's recruiting questionnaire?",
      editor: { kind: "boolean" },
      editableByParent: true,
    });
  }

  // 2. Intended major.
  if (referenced.has("intendedMajor") && !isResolved(input.values, "intendedMajor")) {
    rows.push({
      id: "intendedMajor",
      title: "Intended major",
      prompt: "What do you plan to study?",
      editor: { kind: "text", multiline: false },
      editableByParent: true,
    });
  }

  const authoredUnresolved = input.referencedKeys.filter(
    (k) => input.authoredKeys.has(k) && !isResolved(input.values, k),
  );
  const has = (k: string) => authoredUnresolved.includes(k);

  // 3. Why this program.
  if (has("programNote")) {
    rows.push({
      id: "programNote",
      title: "Why this program?",
      prompt: "What draws you to this program specifically?",
      editor: { kind: "text", multiline: true },
      editableByParent: false,
    });
  }
  // 4. Why it fits.
  if (has("fitReason")) {
    rows.push({
      id: "fitReason",
      title: "Why does it fit you?",
      prompt: "How do you fit their style, level, or needs?",
      editor: { kind: "text", multiline: true },
      editableByParent: false,
    });
  }
  // 5. Other authored vars.
  for (const key of authoredUnresolved) {
    if (["programNote", "fitReason", "intendedMajor"].includes(key)) continue;
    rows.push({
      id: key,
      title: input.labels[key] ?? key,
      prompt: "",
      editor: { kind: "text", multiline: false },
      editableByParent: true,
    });
  }

  // 6. Unresolved NON-authored profile vars → navigate to the profile editor.
  for (const key of input.referencedKeys) {
    if (input.authoredKeys.has(key)) continue;
    if (key === "intendedMajor" || METRIC_KEYS.has(key)) continue;
    if (isResolved(input.values, key)) continue;
    rows.push({
      id: key,
      title: input.labels[key] ?? key,
      prompt: "Add this in your profile",
      editor: { kind: "profileLink" },
      editableByParent: true,
    });
  }

  // 7. Metric nudge.
  if (input.referencedKeys.some((k) => METRIC_KEYS.has(k)) && !input.hasMetric) {
    rows.push({
      id: "metrics",
      title: "Add a performance metric",
      prompt: "Coaches want to see your numbers.",
      editor: { kind: "metricLink" },
      editableByParent: true,
    });
  }

  return rows;
}
