import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";

// Capture the arguments the composable passes to Supabase so we can assert the
// family-scoped query/insert shape without a live DB.
const captured: { orFilter?: string; insertPayload?: Record<string, unknown> } =
  {};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn((filter: string) => {
          captured.orFilter = filter;
          return {
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }),
      })),
      insert: vi.fn((rows: Record<string, unknown>[]) => {
        captured.insertPayload = rows[0];
        return {
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { id: "t1", ...rows[0] },
                error: null,
              }),
            ),
          })),
        };
      }),
    })),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: { id: "user1" } })),
}));

// Force the singleton fallback path (inject returns undefined in a bare test) to
// resolve to a known family unit.
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    activeFamilyId: ref("fam-123"),
  })),
}));

describe("useCommunicationTemplates — family scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.orFilter = undefined;
    captured.insertPayload = undefined;
  });

  it("loadTemplates filters by the active family plus predefined templates", async () => {
    const composable = useCommunicationTemplates();
    await composable.loadTemplates();

    expect(captured.orFilter).toBe(
      "family_unit_id.eq.fam-123,is_predefined.eq.true",
    );
  });

  it("createTemplate stamps the active family_unit_id on the new row", async () => {
    const composable = useCommunicationTemplates();
    await composable.createTemplate("Intro", "email", "Hi coach", "Subject");

    expect(captured.insertPayload).toMatchObject({
      user_id: "user1",
      family_unit_id: "fam-123",
      name: "Intro",
      type: "email",
    });
  });
});
