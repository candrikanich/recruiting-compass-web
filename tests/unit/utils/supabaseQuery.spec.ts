import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  querySelect,
  querySingle,
  queryInsert,
  queryUpdate,
  queryDelete,
  isQuerySuccess,
  isQueryError,
  getQueryErrorMessage,
  type QueryResult,
} from "~/utils/supabaseQuery";
import { useSupabase } from "~/composables/useSupabase";

// Mock useSupabase and errorHandling
vi.mock("~/composables/useSupabase");
vi.mock("~/utils/errorHandling", () => ({
  getErrorMessage: (error: Error) => error.message,
}));

describe("supabaseQuery utilities", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a chainable mock that resolves to async data
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(useSupabase).mockReturnValue(mockSupabase);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // querySelect Tests
  // ============================================

  describe("querySelect", () => {
    it("should select all records without options", async () => {
      const mockData = [{ id: "1", name: "Coach A" }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await querySelect("coaches");

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith("coaches");
    });

    it("should apply select columns when specified", async () => {
      const mockData = [{ id: "1", first_name: "John", last_name: "Doe" }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await querySelect("coaches", {
        select: "id, first_name, last_name",
      });

      expect(mockSupabase.select).toHaveBeenCalledWith(
        "id, first_name, last_name",
      );
      expect(result.data).toEqual(mockData);
    });

    it("should apply eq filters for non-null values", async () => {
      const mockData = [{ id: "1", school_id: "school-1" }];
      mockSupabase.eq.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await querySelect("coaches", {
        filters: { school_id: "school-1" },
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("school_id", "school-1");
      expect(result.data).toEqual(mockData);
    });

    it("should apply is filters for null values", async () => {
      const mockData = [{ id: "1", deleted_at: null }];
      mockSupabase.is.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await querySelect("coaches", {
        filters: { deleted_at: null },
      });

      expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
      expect(result.data).toEqual(mockData);
    });

    it("should apply ordering", async () => {
      const mockData = [{ id: "1", last_name: "Adams" }];
      mockSupabase.order.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await querySelect("coaches", {
        order: { column: "last_name", ascending: true },
      });

      expect(mockSupabase.order).toHaveBeenCalledWith("last_name", {
        ascending: true,
      });
      expect(result.data).toEqual(mockData);
    });

    it("should apply limit", async () => {
      const mockData = [{ id: "1" }, { id: "2" }, { id: "3" }];
      mockSupabase.limit.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await querySelect("coaches", { limit: 3 });

      expect(mockSupabase.limit).toHaveBeenCalledWith(3);
      expect(result.data).toEqual(mockData);
    });

    it("should handle Supabase error", async () => {
      const error = new Error("Connection failed");
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await querySelect("coaches");

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it("should log when not silent", async () => {
      const mockData = [{ id: "1" }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await querySelect("coaches", {}, { context: "fetchCoaches" });

      expect(console.log).toHaveBeenCalled();
    });

    it("should not log when silent is true", async () => {
      const mockData = [{ id: "1" }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await querySelect("coaches", {}, { silent: true });

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should handle exception thrown", async () => {
      mockSupabase.select.mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      const result = await querySelect("coaches");

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  // ============================================
  // querySingle Tests
  // ============================================

  describe("querySingle", () => {
    it("should select single record with filters", async () => {
      const mockData = { id: "1", first_name: "John" };
      mockSupabase.single.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await querySingle("coaches", { id: "1" });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockData);
    });

    it("should handle PGRST116 error (no rows found)", async () => {
      const error = { code: "PGRST116", message: "No rows" };
      mockSupabase.single.mockResolvedValueOnce({ data: null, error });

      const result = await querySingle("coaches", { id: "nonexistent" });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("No record found");
    });

    it("should handle other Supabase errors", async () => {
      const error = { code: "CONNECTION_ERROR", message: "Network failed" };
      mockSupabase.single.mockResolvedValueOnce({ data: null, error });

      const result = await querySingle("coaches", { id: "1" });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it("should apply multiple filters", async () => {
      const mockData = { id: "1", school_id: "school-1" };
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await querySingle("coaches", { id: "1", school_id: "school-1" });

      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
    });

    it("should apply is filter for null", async () => {
      const mockData = { id: "1", deleted_at: null };
      mockSupabase.is.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await querySingle("coaches", { deleted_at: null });

      expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should log success when not silent", async () => {
      const mockData = { id: "1" };
      mockSupabase.single.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await querySingle("coaches", { id: "1" }, { context: "getCoach" });

      expect(console.log).toHaveBeenCalled();
    });
  });

  // ============================================
  // queryInsert Tests
  // ============================================

  describe("queryInsert", () => {
    it("should insert single record", async () => {
      const record = { first_name: "John", last_name: "Doe" };
      const mockData = [{ id: "1", ...record }];
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await queryInsert("coaches", record);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should insert multiple records as array", async () => {
      const records = [
        { first_name: "John", school_id: "1" },
        { first_name: "Jane", school_id: "1" },
      ];
      const mockData = [
        { id: "1", ...records[0] },
        { id: "2", ...records[1] },
      ];
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await queryInsert("coaches", records);

      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should handle insert error", async () => {
      const error = new Error("Duplicate key value");
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await queryInsert("coaches", { first_name: "John" });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it("should log insert count", async () => {
      const records = [{ first_name: "John" }, { first_name: "Jane" }];
      const mockData = [
        { id: "1", ...records[0] },
        { id: "2", ...records[1] },
      ];
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await queryInsert("coaches", records, { context: "bulkImport" });

      expect(console.log).toHaveBeenCalled();
    });
  });

  // ============================================
  // queryUpdate Tests
  // ============================================

  describe("queryUpdate", () => {
    it("should update records with filters", async () => {
      const mockData = [{ id: "1", responsiveness_score: 8.5 }];
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const result = await queryUpdate(
        "coaches",
        { responsiveness_score: 8.5 },
        { id: "1" },
      );

      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should apply multiple filters", async () => {
      const mockData = [{ id: "1", school_id: "1", status: "active" }];
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await queryUpdate(
        "coaches",
        { status: "inactive" },
        { id: "1", school_id: "1" },
      );

      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
    });

    it("should handle null filter values", async () => {
      const mockData = [{ id: "1", deleted_at: null }];
      mockSupabase.update.mockReturnThis();
      mockSupabase.is.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await queryUpdate("coaches", { status: "active" }, { deleted_at: null });

      expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should handle update error", async () => {
      const error = new Error("Permission denied");
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await queryUpdate(
        "coaches",
        { status: "active" },
        { id: "1" },
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it("should log update count", async () => {
      const mockData = [{ id: "1" }, { id: "2" }];
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      await queryUpdate(
        "coaches",
        { status: "active" },
        { school_id: "1" },
        { context: "bulkActivate" },
      );

      expect(console.log).toHaveBeenCalled();
    });
  });

  // ============================================
  // queryDelete Tests
  // ============================================

  describe("queryDelete", () => {
    it("should delete records with filters", async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await queryDelete("coaches", { id: "1" });

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    it("should apply multiple filters", async () => {
      mockSupabase.delete.mockReturnThis();
      let eqCallCount = 0;
      mockSupabase.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({ data: null, error: null });
        }
        return mockSupabase;
      });

      await queryDelete("coaches", { id: "1", school_id: "1" });

      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
    });

    it("should handle null filter values", async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.is.mockResolvedValueOnce({ data: null, error: null });

      await queryDelete("coaches", { deleted_at: null });

      expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("should handle delete error", async () => {
      const error = new Error("Permission denied");
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ error });

      const result = await queryDelete("coaches", { id: "1" });

      expect(result.error).toBeDefined();
    });

    it("should log delete action", async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      await queryDelete("coaches", { id: "1" }, { context: "deleteCoach" });

      expect(console.log).toHaveBeenCalled();
    });
  });

  // ============================================
  // Type Guard Tests
  // ============================================

  describe("isQuerySuccess", () => {
    it("should return true for successful query", () => {
      const result: QueryResult<{ id: string }> = {
        data: { id: "1" },
        error: null,
      };

      expect(isQuerySuccess(result)).toBe(true);
    });

    it("should return false for failed query", () => {
      const result: QueryResult<{ id: string }> = {
        data: null,
        error: new Error("Failed"),
      };

      expect(isQuerySuccess(result)).toBe(false);
    });

    it("should return false for null data", () => {
      const result: QueryResult<{ id: string }> = {
        data: null,
        error: null,
      };

      expect(isQuerySuccess(result)).toBe(false);
    });
  });

  describe("isQueryError", () => {
    it("should return true for failed query", () => {
      const result: QueryResult<{ id: string }> = {
        data: null,
        error: new Error("Failed"),
      };

      expect(isQueryError(result)).toBe(true);
    });

    it("should return false for successful query", () => {
      const result: QueryResult<{ id: string }> = {
        data: { id: "1" },
        error: null,
      };

      expect(isQueryError(result)).toBe(false);
    });
  });

  describe("getQueryErrorMessage", () => {
    it("should extract error message", () => {
      const error = new Error("Connection failed");
      const message = getQueryErrorMessage(error);

      expect(message).toBe("Connection failed");
    });

    it("should use default message when error is empty", () => {
      const error = new Error("");
      const message = getQueryErrorMessage(error, "Custom default");

      expect(message).toBeDefined();
    });
  });
});
