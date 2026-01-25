import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

export async function surfacePendingSuggestions(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  limit: number = 3,
): Promise<number> {
  const { data: pending, error } = await supabase
    .from("suggestion")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("pending_surface", true)
    .order("urgency", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending || pending.length === 0) {
    return 0;
  }

  const ids = pending.map(
    (s: unknown) => (s as Record<string, unknown>).id as string,
  );

  const { error: updateError } = await supabase
    .from("suggestion")
    .update({
      pending_surface: false,
      surfaced_at: new Date().toISOString(),
    })
    .in("id", ids);

  return updateError ? 0 : ids.length;
}

export async function getSurfacedSuggestions(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  location: "dashboard" | "school_detail",
  schoolId?: string,
): Promise<unknown[]> {
  let query = supabase
    .from("suggestion")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("pending_surface", false)
    .eq("dismissed", false)
    .eq("completed", false)
    .order("urgency", { ascending: false })
    .order("surfaced_at", { ascending: false });

  if (location === "dashboard") {
    query = query.limit(3);
  } else if (location === "school_detail" && schoolId) {
    query = query.eq("related_school_id", schoolId).limit(2);
  }

  const { data, error } = await query;

  return error ? [] : data;
}

export async function getPendingSuggestionCount(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("suggestion")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
    .eq("pending_surface", true)
    .eq("dismissed", false)
    .eq("completed", false);

  return error ? 0 : count || 0;
}
