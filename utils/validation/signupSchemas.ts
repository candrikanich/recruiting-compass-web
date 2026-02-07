import { z } from "zod";
import { signupSchema } from "./schemas";

/**
 * Schema for email field validation in signup
 * Extracted for reuse across signup and other forms
 */
export const SIGNUP_EMAIL_SCHEMA = z.object({
  email: signupSchema.shape.email,
});

/**
 * Schema for password field validation in signup
 * Extracted for reuse across signup and other forms
 */
export const SIGNUP_PASSWORD_SCHEMA = z.object({
  password: signupSchema.shape.password,
});
