import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

// Mock Nuxt
vi.mock("#app", () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-anon-key-12345",
    },
  })),
}));

import { useSupabase } from "~/composables/useSupabase";

describe("useSupabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a Supabase client", () => {
    const client = useSupabase();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("should return same instance on multiple calls", () => {
    const client1 = useSupabase();
    const client2 = useSupabase();
    expect(client1).toBe(client2);
  });
});
