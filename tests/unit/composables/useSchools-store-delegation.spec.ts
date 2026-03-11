import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({ data: [], error: null }),
    }),
  }),
}));
vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({ activeFamilyId: { value: "fam-1" } }),
}));
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn() }),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "u1" } }),
}));

describe("useSchools — store delegation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("schools ref reads from useSchoolStore, not a separate shallowRef", async () => {
    const { useSchools } = await import("~/composables/useSchools");
    const { useSchoolStore } = await import("~/stores/schools");

    const store = useSchoolStore();
    const { schools } = useSchools();

    // Seed the store directly — composable should reflect it
    store.schools = [{ id: "s1", name: "Test U" } as any];

    expect(schools.value).toHaveLength(1);
    expect(schools.value[0].id).toBe("s1");
  });
});
