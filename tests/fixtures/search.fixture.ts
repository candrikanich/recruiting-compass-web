/**
 * Test Fixtures: Search-related mock data factories
 * Used across unit, integration, and E2E tests
 */

export interface SearchResult {
  id: string;
  type: "document" | "coach" | "school" | "interaction";
  title: string;
  excerpt: string;
  relevance: number;
  metadata?: Record<string, any>;
  url?: string;
}

export interface SearchFilter {
  type: string;
  value: string | string[];
  label: string;
}

/**
 * Create a mock SearchResult object
 */
export function createMockSearchResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    id: `result-${Math.random().toString(36).substring(7)}`,
    type: "document",
    title: "Test Search Result",
    excerpt: "This is a test search result excerpt...",
    relevance: 0.95,
    metadata: {},
    url: "/documents/test-123",
    ...overrides,
  };
}

/**
 * Create multiple mock search results
 */
export function createMockSearchResults(
  count: number = 5,
  overrides: Partial<SearchResult> = {},
): SearchResult[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSearchResult({
      id: `result-${i + 1}`,
      title: `Search Result ${i + 1}`,
      relevance: 0.95 - i * 0.1,
      ...overrides,
    }),
  );
}

/**
 * Create a mock SearchFilter object
 */
export function createMockSearchFilter(
  overrides: Partial<SearchFilter> = {},
): SearchFilter {
  return {
    type: "document_type",
    value: "pdf",
    label: "PDF",
    ...overrides,
  };
}

/**
 * Create multiple mock filters
 */
export function createMockSearchFilters(count: number = 3): SearchFilter[] {
  const filterTypes = [
    { type: "document_type", value: "pdf", label: "PDF" },
    { type: "document_type", value: "word", label: "Word" },
    { type: "document_type", value: "excel", label: "Excel" },
  ];
  return filterTypes.slice(0, count);
}

/**
 * Create mock search state
 */
export function createMockSearchState() {
  return {
    query: "test query",
    results: createMockSearchResults(5),
    filters: createMockSearchFilters(2),
    isLoading: false,
    error: null,
    totalResults: 5,
    page: 1,
    pageSize: 10,
  };
}

/**
 * Create mock cached search results
 */
export function createMockSearchCache() {
  return new Map<string, SearchResult[]>([
    ["test", createMockSearchResults(3)],
    ["document", createMockSearchResults(4)],
    ["pdf", createMockSearchResults(2)],
  ]);
}
