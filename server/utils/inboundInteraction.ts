import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

type InteractionInsert =
  Database["public"]["Tables"]["interactions"]["Insert"];

export interface InboundLeadInput {
  kind: "contact" | "interest";
  coachId: string;
  schoolId: string;
  familyUnitId: string;
  loggedBy: string;
  note: string | null;
  program: string | null;
  occurredAt: string;
}

export function buildInboundInteractionRow(
  input: InboundLeadInput,
): InteractionInsert {
  const subject =
    input.kind === "interest"
      ? `Interest via public profile${input.program ? ` — ${input.program}` : ""}`
      : "Contact via public profile";

  return {
    coach_id: input.coachId,
    school_id: input.schoolId,
    family_unit_id: input.familyUnitId,
    logged_by: input.loggedBy,
    type: input.kind === "interest" ? "interest" : "email",
    direction: "inbound",
    occurred_at: input.occurredAt,
    subject,
    content: input.note,
  };
}

export async function insertInboundInteraction(
  admin: SupabaseClient<Database>,
  row: InteractionInsert,
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("interactions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id };
}
