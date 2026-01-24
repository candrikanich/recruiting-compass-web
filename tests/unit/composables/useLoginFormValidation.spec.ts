import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFormValidation } from "~/composables/useFormValidation";
import { loginSchema } from "~/utils/validation/schemas";
import { z } from "zod";

describe("Login Form Validation Integration", () => {
  let validation: ReturnType<typeof useFormValidation>;

  beforeEach(() => {
    validation = useFormValidation();
    vi.clearAllMocks();
  });

  describe("Login Schema Validation", () => {
    it("should validate correct login data", async () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };

      const result = await validation.validate(validData, loginSchema);

      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.password).toBe("password123");
      expect(validation.hasErrors.value).toBe(false);
    });

    it("should reject invalid email format", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "password123",
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.email).toContain(
        "Please enter a valid email address",
      );
    });

    it("should reject short password", async () => {
      const invalidData = {
        email: "test@example.com",
        password: "123",
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.password).toContain(
        "at least 8 characters",
      );
    });

    it("should reject long password", async () => {
      const invalidData = {
        email: "test@example.com",
        password: "a".repeat(129), // 129 characters
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.password).toContain(
        "not exceed 128 characters",
      );
    });

    it("should reject empty email", async () => {
      const invalidData = {
        email: "",
        password: "password123",
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.email).toContain(
        "Please enter a valid email address",
      );
    });

    it("should reject empty password", async () => {
      const invalidData = {
        email: "test@example.com",
        password: "",
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.password).toContain(
        "at least 8 characters",
      );
    });

    it("should collect multiple validation errors", async () => {
      const invalidData = {
        email: "bad-email",
        password: "123",
      };

      const result = await validation.validate(invalidData, loginSchema);

      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.errors.value).toHaveLength(2);
      expect(validation.fieldErrors.value.email).toBeDefined();
      expect(validation.fieldErrors.value.password).toBeDefined();
    });
  });

  describe("Field-Level Validation", () => {
    it("should validate email field independently", async () => {
      const emailSchema = loginSchema.shape.email;

      // Valid email
      const isValid = await validation.validateField(
        "email",
        "test@example.com",
        emailSchema,
      );
      expect(isValid).toBe(true);
      expect(validation.fieldErrors.value.email).toBeUndefined();

      // Invalid email
      const isInvalid = await validation.validateField(
        "email",
        "bad-email",
        emailSchema,
      );
      expect(isInvalid).toBe(false);
      expect(validation.fieldErrors.value.email).toContain(
        "Please enter a valid email address",
      );
    });

    it("should validate password field independently", async () => {
      const passwordSchema = loginSchema.shape.password;

      // Valid password
      const isValid = await validation.validateField(
        "password",
        "validpassword123",
        passwordSchema,
      );
      expect(isValid).toBe(true);
      expect(validation.fieldErrors.value.password).toBeUndefined();

      // Invalid password (too short)
      const isInvalid = await validation.validateField(
        "password",
        "123",
        passwordSchema,
      );
      expect(isInvalid).toBe(false);
      expect(validation.fieldErrors.value.password).toContain(
        "at least 8 characters",
      );
    });

    it("should update existing field error on revalidation", async () => {
      const emailSchema = loginSchema.shape.email;

      // First validation - invalid (too short)
      await validation.validateField("email", "bad", emailSchema);
      expect(validation.fieldErrors.value.email).toContain(
        "at least 5 characters",
      );

      // Second validation - still invalid but different message
      await validation.validateField("email", "", emailSchema);
      expect(validation.fieldErrors.value.email).toContain(
        "at least 5 characters",
      );

      // Third validation - valid
      await validation.validateField("email", "test@example.com", emailSchema);
      expect(validation.fieldErrors.value.email).toBeUndefined();
    });

    it("should handle multiple field validations independently", async () => {
      const emailSchema = loginSchema.shape.email;
      const passwordSchema = loginSchema.shape.password;

      await validation.validateField("email", "bad-email", emailSchema);
      await validation.validateField("password", "short", passwordSchema);

      expect(validation.fieldErrors.value.email).toBeDefined();
      expect(validation.fieldErrors.value.password).toBeDefined();

      // Clear only email error
      await validation.validateField("email", "good@example.com", emailSchema);

      expect(validation.fieldErrors.value.email).toBeUndefined();
      expect(validation.fieldErrors.value.password).toBeDefined();
    });
  });

  describe("Error Management", () => {
    it("should clear all errors", async () => {
      // Create errors
      await validation.validate(
        {
          email: "bad-email",
          password: "short",
        },
        loginSchema,
      );

      expect(validation.hasErrors.value).toBe(true);

      // Clear errors
      validation.clearErrors();

      expect(validation.hasErrors.value).toBe(false);
      expect(validation.errors.value).toHaveLength(0);
      expect(Object.keys(validation.fieldErrors.value)).toHaveLength(0);
    });

    it("should clear specific field error", async () => {
      await validation.validateField(
        "email",
        "bad-email",
        loginSchema.shape.email,
      );
      await validation.validateField(
        "password",
        "short",
        loginSchema.shape.password,
      );

      expect(validation.fieldErrors.value.email).toBeDefined();
      expect(validation.fieldErrors.value.password).toBeDefined();

      // Clear only email error
      validation.clearFieldError("email");

      expect(validation.fieldErrors.value.email).toBeUndefined();
      expect(validation.fieldErrors.value.password).toBeDefined();
    });

    it("should set custom errors", () => {
      const customErrors = [
        { field: "form", message: "Login failed" },
        { field: "email", message: "Email not found" },
      ];

      validation.setErrors(customErrors);

      expect(validation.errors.value).toEqual(customErrors);
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.form).toBe("Login failed");
      expect(validation.fieldErrors.value.email).toBe("Email not found");
    });

    it("should handle errors without schema", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await validation.validate({ email: "test@example.com" });

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[useFormValidation] No schema provided to validate()",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases for Login", () => {
    it("should handle email with leading/trailing spaces", async () => {
      const dataWithSpaces = {
        email: "  test@example.com  ",
        password: "password123",
      };

      const result = await validation.validate(dataWithSpaces, loginSchema);

      // Email with spaces should fail validation at schema level
      expect(result).toBeNull();
      expect(validation.hasErrors.value).toBe(true);
      expect(validation.fieldErrors.value.email).toContain(
        "Please enter a valid email address",
      );
    });

    it("should handle common valid email formats", async () => {
      const validEmails = [
        "simple@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user123@example.co.uk",
        "test.email.with+symbol@example.com",
      ];

      for (const email of validEmails) {
        validation.clearErrors();
        const result = await validation.validate(
          {
            email,
            password: "password123",
          },
          loginSchema,
        );

        expect(result).not.toBeNull();
        expect(validation.hasErrors.value).toBe(false);
      }
    });

    it("should handle invalid email formats", async () => {
      const invalidEmails = [
        "plainaddress",
        "@domain.com",
        "user@",
        "user..name@example.com",
        "user@.com",
        "user@domain.",
      ];

      for (const email of invalidEmails) {
        validation.clearErrors();
        const result = await validation.validate(
          {
            email,
            password: "password123",
          },
          loginSchema,
        );

        expect(result).toBeNull();
        expect(validation.hasErrors.value).toBe(true);
        expect(validation.fieldErrors.value.email).toBeDefined();
      }
    });

    it("should handle password edge cases", async () => {
      const edgeCases = [
        {
          password: "a".repeat(8),
          expected: true,
          desc: "minimum valid length",
        },
        {
          password: "a".repeat(128),
          expected: true,
          desc: "maximum valid length",
        },
        {
          password: "a".repeat(7),
          expected: false,
          desc: "one character too short",
        },
        {
          password: "a".repeat(129),
          expected: false,
          desc: "one character too long",
        },
      ];

      for (const { password, expected, desc } of edgeCases) {
        validation.clearErrors();
        const result = await validation.validate(
          {
            email: "test@example.com",
            password,
          },
          loginSchema,
        );

        if (expected) {
          expect(result).not.toBeNull();
          expect(validation.hasErrors.value).toBe(false);
        } else {
          expect(result).toBeNull();
          expect(validation.hasErrors.value).toBe(true);
        }
      }
    });

    it("should handle special characters in password", async () => {
      const specialPasswords = [
        "P@$$w0rd!",
        "password!@#$%^&*()",
        "Test123_+-=",
        "ñáéíóú123", // Unicode characters
      ];

      for (const password of specialPasswords) {
        validation.clearErrors();
        const result = await validation.validate(
          {
            email: "test@example.com",
            password,
          },
          loginSchema,
        );

        expect(result).not.toBeNull();
        expect(validation.hasErrors.value).toBe(false);
      }
    });
  });

  describe("Reactivity", () => {
    it("should update hasErrors reactively", async () => {
      expect(validation.hasErrors.value).toBe(false);

      await validation.validate(
        {
          email: "bad-email",
          password: "password123",
        },
        loginSchema,
      );

      expect(validation.hasErrors.value).toBe(true);

      validation.clearErrors();
      expect(validation.hasErrors.value).toBe(false);
    });

    it("should update fieldErrors reactively", async () => {
      expect(Object.keys(validation.fieldErrors.value)).toHaveLength(0);

      await validation.validateField(
        "email",
        "bad-email",
        loginSchema.shape.email,
      );
      expect("email" in validation.fieldErrors.value).toBe(true);

      validation.clearFieldError("email");
      expect("email" in validation.fieldErrors.value).toBe(false);
    });

    it("should maintain error state between validations", async () => {
      // First invalid validation
      await validation.validate(
        {
          email: "badmail", // This will fail email format validation (single error)
          password: "short", // This will fail password length validation
        },
        loginSchema,
      );
      expect(validation.errors.value).toHaveLength(2);

      // Second invalid validation for same fields
      await validation.validate(
        {
          email: "badmail2", // This will also fail email format validation
          password: "short2", // This will also fail password length validation
        },
        loginSchema,
      );
      expect(validation.errors.value).toHaveLength(2); // Should replace rather than accumulate
    });
  });
});
