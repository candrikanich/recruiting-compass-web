import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const { useVideoLinks } = await import("~/composables/useVideoLinks");

const ROW_1 = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "u1",
  family_unit_id: null,
  platform: "hudl" as const,
  url: "https://hudl.com/v/1",
  title: "Highlights",
  position: 0,
  health_status: "unknown" as const,
  last_health_check: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const ROW_2 = {
  ...ROW_1,
  id: "22222222-2222-2222-2222-222222222222",
  url: "https://youtube.com/watch?v=2",
  platform: "youtube" as const,
  position: 1,
};

describe("useVideoLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("load", () => {
    it("GETs /api/video-links and populates links", async () => {
      mockFetchAuth.mockResolvedValue({ videoLinks: [ROW_1, ROW_2] });
      const { links, load } = useVideoLinks();
      await load();
      expect(mockFetchAuth).toHaveBeenCalledWith("/api/video-links");
      expect(links.value).toEqual([ROW_1, ROW_2]);
    });
  });

  describe("add", () => {
    it("POSTs to /api/video-links and appends the returned row", async () => {
      mockFetchAuth.mockResolvedValue({ videoLink: ROW_1 });
      const { links, add } = useVideoLinks();
      const result = await add({ platform: "hudl", url: ROW_1.url });
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/video-links",
        expect.objectContaining({
          method: "POST",
          body: { platform: "hudl", url: ROW_1.url },
        }),
      );
      expect(result).toEqual(ROW_1);
      expect(links.value).toEqual([ROW_1]);
    });

    it("appends after any existing links rather than overwriting them", async () => {
      mockFetchAuth
        .mockResolvedValueOnce({ videoLink: ROW_1 })
        .mockResolvedValueOnce({ videoLink: ROW_2 });
      const { links, add } = useVideoLinks();
      await add({ platform: "hudl", url: ROW_1.url });
      await add({ platform: "youtube", url: ROW_2.url });
      expect(links.value).toEqual([ROW_1, ROW_2]);
    });
  });

  describe("update", () => {
    it("PATCHes /api/video-links/:id and replaces the row in place", async () => {
      mockFetchAuth.mockResolvedValueOnce({ videoLinks: [ROW_1] });
      const { links, load, update } = useVideoLinks();
      await load();

      const updatedRow = { ...ROW_1, title: "New Title" };
      mockFetchAuth.mockResolvedValueOnce({ videoLink: updatedRow });
      const result = await update(ROW_1.id, { title: "New Title" });

      expect(mockFetchAuth).toHaveBeenCalledWith(
        `/api/video-links/${ROW_1.id}`,
        expect.objectContaining({
          method: "PATCH",
          body: { title: "New Title" },
        }),
      );
      expect(result).toEqual(updatedRow);
      expect(links.value).toEqual([updatedRow]);
    });
  });

  describe("remove", () => {
    it("DELETEs /api/video-links/:id and drops it from links", async () => {
      mockFetchAuth.mockResolvedValueOnce({ videoLinks: [ROW_1, ROW_2] });
      const { links, load, remove } = useVideoLinks();
      await load();

      mockFetchAuth.mockResolvedValueOnce({ success: true });
      await remove(ROW_1.id);

      expect(mockFetchAuth).toHaveBeenCalledWith(
        `/api/video-links/${ROW_1.id}`,
        {
          method: "DELETE",
        },
      );
      expect(links.value).toEqual([ROW_2]);
    });
  });
});
