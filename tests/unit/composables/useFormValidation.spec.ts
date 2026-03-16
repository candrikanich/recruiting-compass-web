import { describe, it, expect } from "vitest";
import { useFormValidation } from "~/composables/useFormValidation";
import { z } from "zod";

describe("validateField — immutable error update", () => {
  it("creates new error object on re-validate (no in-place mutation)", async () => {
    const { validateField, errors } = useFormValidation();
    const schema = z.string().min(5, "Too short");

    // Create initial error
    await validateField("name", "ab", schema);
    const firstRef = errors.value[0];

    // Re-validate with different (still-failing) input to trigger an update
    await validateField("name", "xyz", schema);

    // Immutable update creates a new object — the first ref must not be the same object
    expect(errors.value[0]).not.toBe(firstRef);
    expect(errors.value[0].field).toBe("name");
  });
});
