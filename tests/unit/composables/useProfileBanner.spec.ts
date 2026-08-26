import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useProfileBanner } from "~/composables/useProfileBanner";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";

vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");

const mockUseSupabase = vi.mocked(useSupabase);
const mockUseUserStore = vi.mocked(useUserStore);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
describe("useProfileBanner", () => {
  let mockSupabase: any;
  let mockStorage: any;
  let mockUserStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockStorage = {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue({
        data: { path: "user-123/banner-123.png" },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://example.com/banner.png" },
      }),
    };

    mockSupabase = {
      storage: mockStorage,
    };

    mockUseSupabase.mockReturnValue(mockSupabase);

    mockUserStore = {
      user: { id: "user-123", email: "test@example.com" },
    };
    mockUseUserStore.mockReturnValue(mockUserStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct initial state", () => {
    const { uploading, error } = useProfileBanner();
    expect(uploading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("rejects a >4MB file with a friendly error", async () => {
    const { uploadBanner, error } = useProfileBanner();
    const big = new File([new Uint8Array(4_200_000)], "b.png", {
      type: "image/png",
    });
    await expect(uploadBanner(big)).rejects.toThrow(/4\s?MB/i);
    expect(error.value).toMatch(/4\s?MB/i);
  });

  it("rejects a non-image type", async () => {
    const { uploadBanner } = useProfileBanner();
    const bad = new File([new Uint8Array(10)], "b.gif", {
      type: "image/gif",
    });
    await expect(uploadBanner(bad)).rejects.toThrow(/jpe?g|png|webp/i);
  });

  it("uploads a valid file and returns the public URL", async () => {
    const { uploadBanner, uploading, error } = useProfileBanner();
    const file = new File([new Uint8Array(10)], "banner.png", {
      type: "image/png",
    });

    const uploadPromise = uploadBanner(file);
    expect(uploading.value).toBe(true);

    const url = await uploadPromise;

    expect(url).toBe("https://example.com/banner.png");
    expect(uploading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockStorage.from).toHaveBeenCalledWith("profile-banners");
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\/banner-\d+\.png$/),
      file,
      expect.objectContaining({ upsert: true }),
    );
  });

  it("throws when no authenticated user is available", async () => {
    mockUserStore.user = null;
    const { uploadBanner } = useProfileBanner();
    const file = new File([new Uint8Array(10)], "banner.png", {
      type: "image/png",
    });

    await expect(uploadBanner(file)).rejects.toThrow();
  });
});
