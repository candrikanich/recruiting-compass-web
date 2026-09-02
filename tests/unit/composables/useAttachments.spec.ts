import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockGetPublicUrl = vi.fn();
const mockDownload = vi.fn();
const mockRemove = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    storage: {
      from: () => ({
        getPublicUrl: mockGetPublicUrl,
        download: mockDownload,
        remove: mockRemove,
      }),
    },
  }),
}));

const { useAttachments } = await import("~/composables/useAttachments");

describe("useAttachments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getDownloadUrl returns the public URL for a filepath", () => {
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.example.com/file.pdf" },
    });

    const { getDownloadUrl } = useAttachments();
    const url = getDownloadUrl("uploads/file.pdf");

    expect(url).toBe("https://storage.example.com/file.pdf");
    expect(mockGetPublicUrl).toHaveBeenCalledWith("uploads/file.pdf");
  });

  it("deleteAttachment removes the file and returns true", async () => {
    mockRemove.mockResolvedValue({ error: null });

    const { deleteAttachment } = useAttachments();
    const result = await deleteAttachment("uploads/file.pdf");

    expect(result).toBe(true);
    expect(mockRemove).toHaveBeenCalledWith(["uploads/file.pdf"]);
  });

  it("deleteAttachment throws on storage error", async () => {
    mockRemove.mockResolvedValue({ error: new Error("not found") });

    const { deleteAttachment } = useAttachments();
    await expect(deleteAttachment("bad/path")).rejects.toThrow("not found");
  });

  it("downloadAttachment creates a blob download link", async () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    mockDownload.mockResolvedValue({ data: blob, error: null });

    // Mock DOM APIs
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(
      mockLink as unknown as HTMLElement,
    );
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => mockLink as unknown as HTMLElement,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => mockLink as unknown as HTMLElement,
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const { downloadAttachment } = useAttachments();
    await downloadAttachment("uploads/report.pdf", "report.pdf");

    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toBe("report.pdf");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });
});
