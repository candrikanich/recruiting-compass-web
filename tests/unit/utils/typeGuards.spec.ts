import { describe, it, expect } from "vitest";
import {
  isError,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isRecord,
  hasProperty,
  satisfiesProperties,
  isPartial,
} from "~/utils/typeGuards";

describe("typeGuards", () => {
  describe("isError", () => {
    it("should return true for Error instances", () => {
      expect(isError(new Error("test"))).toBe(true);
      expect(isError(new TypeError("type error"))).toBe(true);
    });

    it("should return false for non-Error values", () => {
      expect(isError("error")).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError({ message: "not an error" })).toBe(false);
    });
  });

  describe("isString", () => {
    it("should return true for strings", () => {
      expect(isString("hello")).toBe(true);
      expect(isString("")).toBe(true);
    });

    it("should return false for non-strings", () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(["string"])).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("should return true for valid numbers", () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });

    it("should return false for NaN", () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isNumber("42")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe("isBoolean", () => {
    it("should return true for boolean values", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it("should return false for non-booleans", () => {
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean("true")).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
    });
  });

  describe("isArray", () => {
    it("should return true for arrays", () => {
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray([])).toBe(true);
      expect(isArray(["string"])).toBe(true);
    });

    it("should return false for non-arrays", () => {
      expect(isArray("array")).toBe(false);
      expect(isArray({ length: 1 })).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
    });
  });

  describe("isRecord", () => {
    it("should return true for plain objects", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: "value" })).toBe(true);
      expect(isRecord({ nested: { key: "value" } })).toBe(true);
    });

    it("should return false for arrays", () => {
      expect(isRecord([])).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(42)).toBe(false);
    });
  });

  describe("hasProperty", () => {
    it("should return true when property exists", () => {
      expect(hasProperty({ name: "John" }, "name")).toBe(true);
      expect(hasProperty({ x: 1, y: 2 }, "x")).toBe(true);
    });

    it("should return false when property does not exist", () => {
      expect(hasProperty({ name: "John" }, "age")).toBe(false);
      expect(hasProperty({}, "anything")).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(hasProperty(null, "prop")).toBe(false);
      expect(hasProperty(undefined, "prop")).toBe(false);
      expect(hasProperty("string", "prop")).toBe(false);
    });
  });

  describe("satisfiesProperties", () => {
    it("should return true when all properties exist", () => {
      const obj = { id: 1, name: "John", email: "john@example.com" };
      expect(satisfiesProperties(obj, ["id", "name", "email"])).toBe(true);
      expect(satisfiesProperties(obj, ["id", "name"])).toBe(true);
    });

    it("should return false when some properties are missing", () => {
      const obj = { id: 1, name: "John" };
      expect(satisfiesProperties(obj, ["id", "name", "email"])).toBe(false);
      expect(satisfiesProperties(obj, ["email"])).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(satisfiesProperties(null, ["id"])).toBe(false);
      expect(satisfiesProperties(undefined, ["id"])).toBe(false);
      expect(satisfiesProperties("string", ["id"])).toBe(false);
    });

    it("should return true for empty properties array", () => {
      expect(satisfiesProperties({}, [])).toBe(true);
      expect(satisfiesProperties({ id: 1 }, [])).toBe(true);
    });
  });

  describe("isPartial", () => {
    it("should return true for records", () => {
      expect(isPartial({}, () => true)).toBe(true);
      expect(isPartial({ key: "value" }, () => true)).toBe(true);
    });

    it("should return false for non-records", () => {
      expect(isPartial(null, () => true)).toBe(false);
      expect(isPartial(undefined, () => true)).toBe(false);
      expect(isPartial("string", () => true)).toBe(false);
      expect(isPartial([], () => true)).toBe(false);
    });
  });
});
