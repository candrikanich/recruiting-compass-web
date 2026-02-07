import { z } from "zod";
import { loginSchema } from "./schemas";

/**
 * Schema for email field validation
 * Extracted for reuse across login and other forms
 */
export const EMAIL_SCHEMA = z.object({
  email: loginSchema.shape.email,
});

/**
 * Schema for password field validation
 * Extracted for reuse across login and other forms
 */
export const PASSWORD_SCHEMA = z.object({
  password: loginSchema.shape.password,
});
