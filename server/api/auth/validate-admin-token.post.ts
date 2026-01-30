/**
 * POST /api/auth/validate-admin-token
 * Validates an admin registration token
 *
 * Request body: { token: string }
 * Response: { valid: boolean, message?: string }
 *
 * This endpoint is called during signup when a user selects the "Admin" role.
 * It validates that the provided token matches the ADMIN_TOKEN_SECRET.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { validateAdminToken } from "~/server/utils/adminToken";
import { createLogger } from "~/server/utils/logger";

interface ValidateAdminTokenRequest {
  token: string;
}

interface ValidateAdminTokenResponse {
  valid: boolean;
  message?: string;
}

const logger = createLogger("auth/validate-admin-token");

export default defineEventHandler(
  async (event): Promise<ValidateAdminTokenResponse> => {
    try {
      const body = await readBody<ValidateAdminTokenRequest>(event);
      const { token } = body;

      if (!token || typeof token !== "string") {
        logger.warn("Admin token validation attempt with missing/invalid token");
        throw createError({
          statusCode: 400,
          statusMessage: "Token is required",
        });
      }

      const config = useRuntimeConfig(event);
      const isValid = validateAdminToken(token, config.adminTokenSecret);

      if (!isValid) {
        logger.warn("Invalid admin token provided during signup");
        return {
          valid: false,
          message: "Invalid admin registration token",
        };
      }

      logger.info("Admin token validated successfully");

      return {
        valid: true,
      };
    } catch (error) {
      logger.error("Admin token validation failed", error);

      // Re-throw HTTP errors
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Token validation failed",
      });
    }
  },
);
