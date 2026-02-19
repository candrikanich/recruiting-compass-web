import { z, ZodError } from "zod";
import type { H3Event } from "h3";
import { getRouterParam, createError } from "h3";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads a route param and validates it is a well-formed UUID.
 * Throws 400 Bad Request if the value is missing or not a UUID.
 *
 * @param event H3Event from server handler
 * @param paramName Router param name (e.g. "id", "taskId")
 * @returns The validated UUID string
 * @throws 400 Bad Request if param is missing or not a valid UUID
 *
 * @example
 * const schoolId = requireUuidParam(event, "id");
 */
export function requireUuidParam(event: H3Event, paramName: string): string {
  const value = getRouterParam(event, paramName);
  if (!value || !UUID_REGEX.test(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${paramName}: must be a valid UUID`,
    });
  }
  return value;
}

/**
 * Validates request body against a Zod schema.
 * Throws an error with structured validation details if invalid.
 *
 * @param event H3Event from server handler
 * @param schema Zod schema to validate against
 * @returns Validated and parsed data
 * @throws 400 Bad Request with validation errors
 *
 * @example
 * export default defineEventHandler(async (event) => {
 *   const body = await validateBody(event, schoolSchema)
 *   // Use body safely with full type safety
 * })
 */
export async function validateBody<T>(
  event: H3Event,
  schema: z.ZodSchema<T>,
): Promise<T> {
  try {
    const body = await readBody(event);
    return await schema.parseAsync(body);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Validation failed",
        data: {
          errors: err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }
}

/**
 * Validates query parameters against a Zod schema.
 * Throws an error with structured validation details if invalid.
 *
 * @param event H3Event from server handler
 * @param schema Zod schema to validate against
 * @returns Validated and parsed query data
 * @throws 400 Bad Request with validation errors
 *
 * @example
 * export default defineEventHandler((event) => {
 *   const query = validateQuery(event, searchSchema)
 *   // Use query safely with full type safety
 * })
 */
export function validateQuery<T>(event: H3Event, schema: z.ZodSchema<T>): T {
  try {
    const query = getQuery(event);
    return schema.parse(query);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid query parameters",
        data: {
          errors: err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
    });
  }
}

/**
 * Validates URL parameters against a Zod schema.
 * Throws an error if validation fails.
 *
 * @param event H3Event from server handler
 * @param schema Zod schema to validate against
 * @returns Validated and parsed parameters
 * @throws 400 Bad Request with validation errors
 */
export function validateParams<T>(event: H3Event, schema: z.ZodSchema<T>): T {
  try {
    const params = event.context.params || {};
    return schema.parse(params);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid URL parameters",
        data: {
          errors: err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid URL parameters",
    });
  }
}
