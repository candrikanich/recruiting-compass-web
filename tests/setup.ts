import { vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { config } from "@vue/test-utils";

// Set up environment for Pinia
if (typeof process !== "undefined") {
  process.env.NODE_ENV = "test";
}

// Mock Nuxt auto-imports
global.useState = vi.fn();
global.useFetch = vi.fn();
global.useAsyncData = vi.fn();
global.definePageMeta = vi.fn();

// Mock browser APIs
Object.defineProperty(window, "confirm", {
  value: vi.fn(() => true),
  writable: true,
});

Object.defineProperty(window, "location", {
  value: {
    href: "",
    assign: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, "open", {
  value: vi.fn(),
  writable: true,
});

// Mock console methods for testing
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

// Create comprehensive Supabase mock
const createMockQuery = () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };

  // Override final methods to return promises
  query.select.mockResolvedValue({ data: [], error: null });
  query.insert.mockResolvedValue({
    data: { id: "mock-id", name: "Mock Name" },
    error: null,
  });
  query.update.mockResolvedValue({ data: { id: "mock-id" }, error: null });
  query.delete.mockResolvedValue({ data: null, error: null });
  query.single.mockResolvedValue({ data: null, error: null });

  return query;
};

// Create a default mock query instance for reuse
const defaultMockQuery = createMockQuery();

export const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(() => defaultMockQuery),
};

// Global mock for @supabase/supabase-js - prevents network calls
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock useSupabase composable
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

// Mock Nuxt composables
vi.mock("#app", () => ({
  useRuntimeConfig: () => ({
    public: {
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-anon-key",
    },
  }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    go: vi.fn(),
  }),
}));

// Global component stubs to prevent resolution errors
config.global.stubs = {
  // Nuxt components
  NuxtLink: {
    name: "NuxtLink",
    template: "<a><slot /></a>",
  },
  NuxtLayout: {
    name: "NuxtLayout",
    template: "<div><slot /></div>",
  },
  NuxtPage: {
    name: "NuxtPage",
    template: "<div><slot /></div>",
  },
  // Project components
  Header: {
    name: "Header",
    template: "<div><slot /></div>",
  },
  Footer: {
    name: "Footer",
    template: "<div><slot /></div>",
  },
  LoadingSpinner: {
    name: "LoadingSpinner",
    template: "<div>Loading...</div>",
  },
  BaseButton: {
    name: "BaseButton",
    template: "<button><slot /></button>",
  },
  BaseInput: {
    name: "BaseInput",
    template: "<input />",
  },
  BaseModal: {
    name: "BaseModal",
    template: '<div class="modal"><slot /></div>',
  },
  CommunicationPanel: {
    name: "CommunicationPanel",
    template: "<div><slot /></div>",
  },
  CoachForm: {
    name: "CoachForm",
    template: "<div><slot /></div>",
  },
  CoachCard: {
    name: "CoachCard",
    template: '<div class="coach-card"><slot /></div>',
  },
  SchoolCard: {
    name: "SchoolCard",
    template: '<div class="school-card"><slot /></div>',
  },
  SearchFilters: {
    name: "SearchFilters",
    template: "<div><slot /></div>",
  },
  Pagination: {
    name: "Pagination",
    template: "<div><slot /></div>",
  },
  Badge: {
    name: "Badge",
    template: '<span><slot /></span>',
  },
};

// Initialize Pinia for tests
beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks();
});
