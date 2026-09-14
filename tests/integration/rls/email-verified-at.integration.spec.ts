import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

// Requires a local/test Supabase instance with migrations applied —
// matches the pattern in tests/integration/rls/*.integration.spec.ts.
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe("email_verified_at backfill", () => {
  it("has no null email_verified_at rows after migration", async () => {
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("email_verified_at", null);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
