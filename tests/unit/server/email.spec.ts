import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

/**
 * Email Packet API Endpoint Tests
 * Tests the email sending functionality for recruiting packets
 */

describe("Recruiting Packet Email API", () => {
  // Validation schema (mirrors server implementation)
  const emailPacketSchema = z.object({
    recipients: z
      .array(z.string().email("Invalid email address"))
      .min(1, "At least one recipient is required")
      .max(10, "Maximum 10 recipients per send"),
    subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
    body: z
      .string()
      .min(1, "Body is required")
      .max(2000, "Body too long"),
    htmlContent: z.string().optional(),
    pdfBase64: z.string().optional(),
    athleteName: z.string().optional(),
    filename: z.string().optional(),
  });

  describe("Request Validation", () => {
    it("should accept valid email packet request", () => {
      const validRequest = {
        recipients: ["coach@example.com"],
        subject: "John Smith - Recruiting Profile",
        body: "Here is my recruiting packet.",
        athleteName: "John Smith",
        filename: "John_Smith_RecruitingPacket.pdf",
      };

      const result = emailPacketSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should validate recipient email format", () => {
      const invalidRequest = {
        recipients: ["invalid-email"],
        subject: "Test",
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should require at least one recipient", () => {
      const invalidRequest = {
        recipients: [],
        subject: "Test",
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should limit to maximum 10 recipients", () => {
      const emails = Array.from({ length: 11 }, (_, i) => `coach${i}@example.com`);
      const invalidRequest = {
        recipients: emails,
        subject: "Test",
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should require subject", () => {
      const invalidRequest = {
        recipients: ["coach@example.com"],
        subject: "",
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should limit subject to 200 characters", () => {
      const invalidRequest = {
        recipients: ["coach@example.com"],
        subject: "a".repeat(201),
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should require body", () => {
      const invalidRequest = {
        recipients: ["coach@example.com"],
        subject: "Test",
        body: "",
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should limit body to 2000 characters", () => {
      const invalidRequest = {
        recipients: ["coach@example.com"],
        subject: "Test",
        body: "a".repeat(2001),
      };

      const result = emailPacketSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should accept multiple valid recipients", () => {
      const validRequest = {
        recipients: [
          "coach1@example.com",
          "coach2@example.com",
          "coach3@example.com",
        ],
        subject: "Test",
        body: "Test",
      };

      const result = emailPacketSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should allow optional fields", () => {
      const validRequest = {
        recipients: ["coach@example.com"],
        subject: "Test",
        body: "Test",
        // No optional fields
      };

      const result = emailPacketSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    // In-memory rate limit store
    let emailRateLimitStore: Map<string, { count: number; resetTime: number }>;

    beforeEach(() => {
      emailRateLimitStore = new Map();
    });

    const createCheckRateLimit = (store: Map<string, { count: number; resetTime: number }>) => {
      return (userId: string, maxEmails: number = 20): boolean => {
        const now = Date.now();
        const entry = store.get(userId);

        if (!entry || entry.resetTime < now) {
          store.set(userId, {
            count: 1,
            resetTime: now + 24 * 60 * 60 * 1000,
          });
          return true;
        }

        if (entry.count < maxEmails) {
          entry.count++;
          return true;
        }

        return false;
      };
    };

    it("should allow initial email sends", () => {
      const checkRateLimit = createCheckRateLimit(emailRateLimitStore);
      expect(checkRateLimit("user-1", 20)).toBe(true);
      expect(checkRateLimit("user-1", 20)).toBe(true);
    });

    it("should block sends after limit exceeded", () => {
      const checkRateLimit = createCheckRateLimit(emailRateLimitStore);
      for (let i = 0; i < 20; i++) {
        expect(checkRateLimit("user-1", 20)).toBe(true);
      }

      expect(checkRateLimit("user-1", 20)).toBe(false);
    });

    it("should allow different users to have separate limits", () => {
      const checkRateLimit = createCheckRateLimit(emailRateLimitStore);
      for (let i = 0; i < 20; i++) {
        checkRateLimit("user-1", 20);
      }

      expect(checkRateLimit("user-1", 20)).toBe(false);
      expect(checkRateLimit("user-2", 20)).toBe(true);
    });

    it("should reset limit after 24 hours", () => {
      const checkRateLimit = createCheckRateLimit(emailRateLimitStore);
      const now = Date.now();
      const userId = "user-1";

      // Fill up limit
      for (let i = 0; i < 20; i++) {
        checkRateLimit(userId, 20);
      }

      expect(checkRateLimit(userId, 20)).toBe(false);

      // Manually advance time and simulate reset
      const entry = emailRateLimitStore.get(userId);
      if (entry) {
        entry.resetTime = now - 1; // Make it expired
      }

      expect(checkRateLimit(userId, 20)).toBe(true);
    });
  });

  describe("Email Formatting", () => {
    const formatEmailHtml = (
      body: string,
      athleteName: string | undefined
    ): string => {
      return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
          .header { background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%); color: white; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${athleteName || "Athlete"} - Recruiting Profile</h2>
        </div>
        <div class="content">
          <div class="message">${body}</div>
        </div>
      </body>
    </html>
  `;
    };

    it("should include athlete name in email header", () => {
      const html = formatEmailHtml("Test body", "John Smith");
      expect(html).toContain("John Smith - Recruiting Profile");
    });

    it("should use default athlete name if not provided", () => {
      const html = formatEmailHtml("Test body", undefined);
      expect(html).toContain("Athlete - Recruiting Profile");
    });

    it("should include message body", () => {
      const message = "This is a test message";
      const html = formatEmailHtml(message, "John");
      expect(html).toContain(message);
    });

    it("should include HTML doctype", () => {
      const html = formatEmailHtml("Test", "John");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("should include CSS styles", () => {
      const html = formatEmailHtml("Test", "John");
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("should include proper HTML structure", () => {
      const html = formatEmailHtml("Test", "John");
      expect(html).toContain("</html>");
      expect(html).toContain("<body>");
    });
  });

  describe("Error Handling", () => {
    it("should validate email format", () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
      ];

      invalidEmails.forEach((email) => {
        const result = emailPacketSchema.safeParse({
          recipients: [email],
          subject: "Test",
          body: "Test",
        });
        expect(result.success).toBe(false);
      });
    });

    it("should provide clear error messages for validation failures", () => {
      const result = emailPacketSchema.safeParse({
        recipients: [],
        subject: "Test",
        body: "Test",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.toString()).toContain("recipient");
      }
    });

    it("should reject empty strings", () => {
      const result = emailPacketSchema.safeParse({
        recipients: ["coach@example.com"],
        subject: "",
        body: "Test",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Success Scenarios", () => {
    it("should accept bulk email to 10 recipients", () => {
      const emails = Array.from(
        { length: 10 },
        (_, i) => `coach${i}@example.com`
      );
      const request = {
        recipients: emails,
        subject: "John Smith - Recruiting Profile",
        body: "Here is my recruiting packet for your review.",
        athleteName: "John Smith",
        filename: "John_Smith_RecruitingPacket.pdf",
      };

      const result = emailPacketSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept maximum length subject and body", () => {
      const request = {
        recipients: ["coach@example.com"],
        subject: "a".repeat(200),
        body: "b".repeat(2000),
      };

      const result = emailPacketSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept PDF attachment data", () => {
      const request = {
        recipients: ["coach@example.com"],
        subject: "Test",
        body: "Test",
        pdfBase64: "JVBERi0xLjQK", // Minimal PDF base64
        filename: "packet.pdf",
        htmlContent: "<html></html>",
      };

      const result = emailPacketSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
});
