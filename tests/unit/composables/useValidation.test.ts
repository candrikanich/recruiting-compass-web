import { describe, it, expect, beforeEach } from "vitest";
import { useValidation } from "~/composables/useValidation";
import { z } from "zod";

const testSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  age: z.number().min(0, "Age must be positive").max(120, "Invalid age"),
});

describe("useValidation composable", () => {
  let validation: any;

  beforeEach(() => {
    validation = useValidation(testSchema);
  });

  describe("validate", () => {
    it("should validate correct data", async () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };
      const result = await validation.validate(data);
      expect(result).not.toBeNull();
      expect(result.name).toBe("John Doe");
      expect(validation.hasErrors.value).toBe(false);
    });

    it("should return null and set errors on validation failure", async () => {
      const data = {
        name: "J",
        email: "invalid",
        age: -5,
      };
      const result = await validation.validate(data);
      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.errors.value.length).toBeGreaterThan(0);
    });

    it("should collect all validation errors", async () => {
      const data = {
        name: "",
        email: "not-an-email",
        age: 150,
      };
      const result = await validation.validate(data);
      expect(result).toBeNull();
      expect(validation.errors.value.length).toBeGreaterThan(0);
    });

    it("should clear previous errors on new validation", async () => {
      // First invalid validation
      await validation.validate({ name: "", email: "bad", age: -1 });
      expect(validation.hasErrors.value).toBe(true);

      // Second valid validation
      const result = await validation.validate({
        name: "Test",
        email: "test@example.com",
        age: 30,
      });
      expect(result).not.toBeNull();
      expect(validation.hasErrors.value).toBe(false);
    });
  });

  describe("validateField", () => {
    it("should validate a single field", async () => {
      const validator = validation.validateField(
        "email",
        z.object({ email: testSchema.shape.email }),
      );
      const result = await validator("test@example.com");
      expect(validation.fieldErrors.value.email).toBeUndefined();
    });

    it("should set error for invalid field", async () => {
      const validator = validation.validateField(
        "email",
        z.object({ email: testSchema.shape.email }),
      );
      await validator("not-an-email");
      expect(validation.fieldErrors.value.email).toBeDefined();
      expect(validation.fieldErrors.value.email).toBeTruthy();
    });

    it("should support multiple field validations", async () => {
      const nameValidator = validation.validateField(
        "name",
        z.object({ name: testSchema.shape.name }),
      );
      const emailValidator = validation.validateField(
        "email",
        z.object({ email: testSchema.shape.email }),
      );

      await nameValidator("A");
      await emailValidator("invalid");

      expect(validation.fieldErrors.value.name).toBeDefined();
      expect(validation.fieldErrors.value.email).toBeDefined();
    });
  });

  describe("clearErrors", () => {
    it("should clear all errors", async () => {
      await validation.validate({
        name: "",
        email: "bad",
        age: -1,
      });
      expect(validation.hasErrors.value).toBe(true);

      validation.clearErrors();
      expect(validation.hasErrors.value).toBe(false);
      expect(validation.errors.value.length).toBe(0);
      expect(Object.keys(validation.fieldErrors.value).length).toBe(0);
    });

    it("should clear field errors specifically", async () => {
      const validator = validation.validateField(
        "email",
        z.object({ email: testSchema.shape.email }),
      );
      await validator("bad");
      expect(validation.fieldErrors.value.email).toBeDefined();

      validation.clearErrors();
      expect(validation.fieldErrors.value.email).toBeUndefined();
    });
  });

  describe("setErrors", () => {
    it("should set custom errors", () => {
      const customErrors = [
        { field: "name", message: "Custom name error" },
        { field: "email", message: "Custom email error" },
      ];
      validation.setErrors(customErrors);
      expect(validation.errors.value).toEqual(customErrors);
      expect(validation.hasErrors.value).toBe(true);
    });

    it("should update fieldErrors from setErrors", () => {
      const customErrors = [
        { field: "name", message: "Custom name error" },
        { field: "email", message: "Custom email error" },
      ];
      validation.setErrors(customErrors);
      expect(validation.fieldErrors.value.name).toBeDefined();
      expect(validation.fieldErrors.value.email).toBeDefined();
    });
  });

  describe("error state reactivity", () => {
    it("should update hasErrors reactively", async () => {
      expect(validation.hasErrors.value).toBe(false);

      await validation.validate({
        name: "",
        email: "bad",
        age: -1,
      });
      expect(validation.hasErrors.value).toBe(true);

      validation.clearErrors();
      expect(validation.hasErrors.value).toBe(false);
    });

    it("should maintain fieldErrors for specific fields", async () => {
      const validator = validation.validateField(
        "name",
        z.object({ name: testSchema.shape.name }),
      );

      await validator("A");
      expect("name" in validation.fieldErrors.value).toBe(true);

      validation.clearErrors();
      expect("name" in validation.fieldErrors.value).toBe(false);
    });
  });

  describe("error message formatting", () => {
    it("should include validation messages in errors", async () => {
      await validation.validate({
        name: "A",
        email: "test@example.com",
        age: 25,
      });
      expect(validation.errors.value.length).toBeGreaterThan(0);
      expect(validation.errors.value[0].message).toBeDefined();
      expect(validation.errors.value[0].message).toContain("Name must be");
    });
  });
});
