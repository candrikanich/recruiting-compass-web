/**
 * Test Fixtures: Document-related mock data factories
 * Used across unit, integration, and E2E tests
 */

import type { Database } from "~/types/database";

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentVersion =
  Database["public"]["Tables"]["document_versions"]["Row"];
export type DocumentShare =
  Database["public"]["Tables"]["document_shares"]["Row"];

/**
 * Create a mock Document object
 */
export function createMockDocument(
  overrides: Partial<Document> = {},
): Document {
  const now = new Date().toISOString();
  return {
    id: `doc-${Math.random().toString(36).substring(7)}`,
    user_id: "user-123",
    title: "Test Document",
    description: "Test document description",
    type: "pdf",
    size: 1024 * 100, // 100 KB
    mime_type: "application/pdf",
    url: "https://example.com/documents/test.pdf",
    storage_path: "documents/user-123/test.pdf",
    status: "ready",
    is_public: false,
    tags: ["test", "sample"],
    metadata: { pages: 5, author: "Test User" },
    created_by: "user-123",
    updated_by: "user-123",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  } as Document;
}

/**
 * Create a mock DocumentVersion object
 */
export function createMockDocumentVersion(
  overrides: Partial<DocumentVersion> = {},
): DocumentVersion {
  const now = new Date().toISOString();
  return {
    id: `version-${Math.random().toString(36).substring(7)}`,
    document_id: "doc-123",
    version_number: 1,
    url: "https://example.com/documents/test-v1.pdf",
    storage_path: "documents/user-123/test-v1.pdf",
    size: 1024 * 100,
    mime_type: "application/pdf",
    created_by: "user-123",
    created_at: now,
    deleted_at: null,
    ...overrides,
  } as DocumentVersion;
}

/**
 * Create a mock DocumentShare object
 */
export function createMockDocumentShare(
  overrides: Partial<DocumentShare> = {},
): DocumentShare {
  const now = new Date().toISOString();
  return {
    id: `share-${Math.random().toString(36).substring(7)}`,
    document_id: "doc-123",
    shared_by: "user-123",
    shared_with: "user-456",
    permission: "view",
    created_at: now,
    expires_at: null,
    deleted_at: null,
    ...overrides,
  } as DocumentShare;
}

/**
 * Create multiple mock documents
 */
export function createMockDocuments(
  count: number = 5,
  overrides: Partial<Document> = {},
): Document[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDocument({
      id: `doc-${i + 1}`,
      title: `Test Document ${i + 1}`,
      ...overrides,
    }),
  );
}

/**
 * Create multiple mock versions for a document
 */
export function createMockDocumentVersions(
  documentId: string,
  count: number = 3,
): DocumentVersion[] {
  return Array.from({ length: count }, (_, i) =>
    createMockDocumentVersion({
      document_id: documentId,
      version_number: i + 1,
      url: `https://example.com/documents/test-v${i + 1}.pdf`,
    }),
  );
}

/**
 * Create a file object for upload tests
 */
export function createMockFile(
  content: string = "test content",
  filename: string = "test.pdf",
  mimeType: string = "application/pdf",
): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Create multiple mock files
 */
export function createMockFiles(count: number = 3): File[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFile(`content-${i}`, `test-${i}.pdf`),
  );
}
