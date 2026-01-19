import { r as readBody, a as createError, d as defineEventHandler, c as createLogger } from '../../nitro/nitro.mjs';
import { z, ZodError } from 'zod';
import { s as stripHtml, a as sanitizeUrl, b as sanitizeHtml, e as escapeHtml } from '../../_/sanitize.mjs';
import { b as auditLog } from '../../_/auditLog.mjs';
import { r as requireAuth } from '../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import 'isomorphic-dompurify';
import '../../_/supabase.mjs';
import '@supabase/supabase-js';

const emailSchema = z.string().min(5, "Email must be at least 5 characters").max(255, "Email must not exceed 255 characters").email("Please enter a valid email address").toLowerCase().trim();
const urlSchema = z.string().url("Please enter a valid URL").refine(
  (url) => {
    const sanitized = sanitizeUrl(url);
    return sanitized !== null;
  },
  "URL must start with http:// or https://"
);
const phoneSchema = z.string().regex(
  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  "Please enter a valid phone number"
).or(z.literal("")).optional();
const twitterHandleSchema = z.string().regex(
  /^@?[A-Za-z0-9_]{1,15}$/,
  "Invalid Twitter handle (1-15 characters, letters/numbers/underscore)"
).transform((val) => val.startsWith("@") ? val.slice(1) : val).or(z.literal("")).optional();
const instagramHandleSchema = z.string().regex(
  /^@?[A-Za-z0-9_.]{1,30}$/,
  "Invalid Instagram handle (1-30 characters, letters/numbers/dots/underscore)"
).transform((val) => val.startsWith("@") ? val.slice(1) : val).or(z.literal("")).optional();
const tiktokHandleSchema = z.string().regex(
  /^@?[A-Za-z0-9_.]{1,30}$/,
  "Invalid TikTok handle (1-30 characters)"
).transform((val) => val.startsWith("@") ? val.slice(1) : val).or(z.literal("")).optional();
const facebookHandleSchema = z.string().min(1, "Facebook handle required").max(50, "Facebook handle must not exceed 50 characters").or(z.literal("")).optional();
const sanitizedTextSchema = (maxLength = 1e3) => z.string().max(maxLength, `Text must not exceed ${maxLength} characters`).transform((val) => stripHtml(val).trim()).or(z.literal("")).optional();
const richTextSchema = (maxLength = 5e3) => z.string().max(maxLength, `Text must not exceed ${maxLength} characters`).transform((val) => sanitizeHtml(val).trim()).or(z.literal("")).optional();
const stateSchema = z.string().length(2, "State must be 2 letters").toUpperCase().or(z.literal("")).optional();
const percentageSchema = z.number().min(0, "Percentage must be at least 0").max(100, "Percentage must not exceed 100").or(z.null()).optional();
const currencySchema = z.number().min(0, "Amount must be positive").max(1e5, "Amount must not exceed $100,000").or(z.null()).optional();
const gpaSchema = z.number().min(0, "GPA must be at least 0").max(5, "GPA must not exceed 5.0").or(z.null()).optional();
const satSchema = z.number().min(400, "SAT score must be at least 400").max(1600, "SAT score must not exceed 1600").or(z.null()).optional();
const actSchema = z.number().min(1, "ACT score must be at least 1").max(36, "ACT score must not exceed 36").or(z.null()).optional();
const heightSchema = z.number().min(48, "Height must be at least 4 feet").max(96, "Height must not exceed 8 feet").or(z.null()).optional();
const weightSchema = z.number().min(100, "Weight must be at least 100 lbs").max(400, "Weight must not exceed 400 lbs").or(z.null()).optional();
const graduationYearSchema = z.number().int().min((/* @__PURE__ */ new Date()).getFullYear(), "Graduation year must be current year or later").max((/* @__PURE__ */ new Date()).getFullYear() + 10, "Graduation year must be within 10 years").or(z.null()).optional();
const uuidSchema = z.string().uuid("Invalid ID format").optional().or(z.null());
const dateTimeSchema = z.string().datetime("Invalid date-time format");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)");

z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must not exceed 128 characters")
});
z.object({
  fullName: sanitizedTextSchema(255),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must not exceed 128 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  role: z.enum(["parent", "student"])
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
z.object({
  name: z.string().min(2, "School name must be at least 2 characters").max(255, "School name must not exceed 255 characters").transform((val) => val.trim()),
  location: sanitizedTextSchema(255),
  city: sanitizedTextSchema(100),
  state: stateSchema,
  division: z.enum(["D1", "D2", "D3", "NAIA", "JUCO"]).nullable().optional(),
  conference: sanitizedTextSchema(100),
  website: urlSchema.nullable().optional(),
  twitter_handle: twitterHandleSchema,
  instagram_handle: instagramHandleSchema,
  notes: richTextSchema(5e3),
  status: z.enum(["researching", "contacted", "interested", "offer_received", "declined", "committed"]),
  is_favorite: z.boolean().default(false),
  pros: z.array(sanitizedTextSchema(500)).default([]),
  cons: z.array(sanitizedTextSchema(500)).default([])
});
z.object({
  school_id: uuidSchema.optional(),
  first_name: sanitizedTextSchema(100),
  last_name: sanitizedTextSchema(100),
  role: z.enum(["head", "assistant", "recruiting"]),
  email: emailSchema.nullable().optional(),
  phone: phoneSchema,
  twitter_handle: twitterHandleSchema,
  instagram_handle: instagramHandleSchema,
  notes: richTextSchema(5e3)
});
z.object({
  type: z.enum(["email", "phone_call", "text", "in_person_visit", "virtual_meeting", "camp", "showcase", "tweet", "dm"]),
  direction: z.enum(["outbound", "inbound"]),
  subject: sanitizedTextSchema(500),
  content: richTextSchema(1e4),
  // Sanitize to prevent XSS
  sentiment: z.enum(["positive", "neutral", "negative", "very_positive"]).nullable().optional(),
  occurred_at: dateTimeSchema,
  school_id: uuidSchema.optional(),
  coach_id: uuidSchema,
  event_id: uuidSchema.optional()
}).refine(
  (data) => data.school_id || data.coach_id,
  { message: "Must have either school or coach", path: ["school_id"] }
);
z.object({
  type: z.enum(["showcase", "camp", "official_visit", "unofficial_visit", "game"]),
  name: sanitizedTextSchema(255),
  location: sanitizedTextSchema(255),
  city: sanitizedTextSchema(100),
  state: stateSchema,
  address: sanitizedTextSchema(255),
  start_date: dateSchema,
  end_date: dateSchema.nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").nullable().optional(),
  url: urlSchema.nullable().optional(),
  description: richTextSchema(2e3),
  cost: currencySchema,
  school_id: uuidSchema.optional(),
  registered: z.boolean().default(false),
  attended: z.boolean().default(false),
  performance_notes: richTextSchema(2e3)
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  { message: "End date must be after start date", path: ["end_date"] }
);
z.object({
  school_id: z.string().uuid("Invalid school ID"),
  coach_id: uuidSchema.optional(),
  offer_type: z.enum(["full_ride", "partial", "scholarship", "recruited_walk_on", "preferred_walk_on"]),
  scholarship_amount: currencySchema,
  scholarship_percentage: percentageSchema,
  offer_date: dateSchema,
  deadline_date: dateSchema.nullable().optional(),
  status: z.enum(["pending", "accepted", "declined", "expired"]).default("pending"),
  conditions: richTextSchema(2e3),
  notes: richTextSchema(2e3)
}).refine(
  (data) => {
    const hasAmount = data.scholarship_amount && data.scholarship_amount > 0;
    const hasPercentage = data.scholarship_percentage && data.scholarship_percentage > 0;
    return !(hasAmount && hasPercentage);
  },
  { message: "Provide either scholarship amount or percentage, not both", path: ["scholarship_amount"] }
).refine(
  (data) => {
    if (data.deadline_date && data.offer_date) {
      return new Date(data.deadline_date) >= new Date(data.offer_date);
    }
    return true;
  },
  { message: "Deadline must be after offer date", path: ["deadline_date"] }
);
z.object({
  graduation_year: graduationYearSchema,
  positions: z.array(z.string()).default([]),
  bats: z.enum(["L", "R", "S"]).nullable().optional(),
  throws: z.enum(["L", "R"]).nullable().optional(),
  height_inches: heightSchema,
  weight_lbs: weightSchema,
  gpa: gpaSchema,
  sat_score: satSchema,
  act_score: actSchema,
  high_school: sanitizedTextSchema(255),
  club_team: sanitizedTextSchema(255),
  email: emailSchema.nullable().optional(),
  phone: phoneSchema,
  twitter_handle: twitterHandleSchema,
  instagram_handle: instagramHandleSchema,
  tiktok_handle: tiktokHandleSchema,
  facebook_handle: facebookHandleSchema,
  share_contact_with_coaches: z.boolean().default(false),
  ncaa_id: sanitizedTextSchema(50),
  perfect_game_id: sanitizedTextSchema(50),
  showcase_id: sanitizedTextSchema(50)
});
z.object({
  type: z.enum(["highlight_video", "transcript", "resume", "rec_letter", "questionnaire", "stats_sheet"]),
  title: sanitizedTextSchema(255),
  description: richTextSchema(2e3),
  school_id: uuidSchema.optional(),
  version: z.number().int().min(1).default(1),
  is_current: z.boolean().default(true)
});
z.object({
  platform: z.enum(["twitter", "instagram"]),
  post_url: urlSchema,
  post_content: richTextSchema(5e3),
  // CRITICAL: sanitize external content
  post_date: dateTimeSchema,
  author_handle: sanitizedTextSchema(100),
  author_name: sanitizedTextSchema(255),
  is_recruiting_related: z.boolean().default(false),
  flagged_for_review: z.boolean().default(false),
  notes: richTextSchema(2e3).optional()
});
z.object({
  results: z.array(z.object({
    id: z.number(),
    "school.name": z.string(),
    "school.city": z.string().nullable(),
    "school.state": z.string().nullable(),
    "school.school_url": z.string().nullable(),
    "location.lat": z.number().nullable(),
    "location.lon": z.number().nullable(),
    "latest.admissions.admission_rate.overall": z.number().nullable(),
    "latest.student.size": z.number().nullable(),
    "latest.cost.tuition.in_state": z.number().nullable(),
    "latest.cost.tuition.out_of_state": z.number().nullable()
  })).nullable()
}).nullable();
const feedbackSchema = z.object({
  name: sanitizedTextSchema(255),
  email: emailSchema,
  feedbackType: z.enum(["bug", "feature", "other"]),
  page: sanitizedTextSchema(255).optional(),
  message: sanitizedTextSchema(5e3)
});
const schoolPreferenceSchema = z.object({
  name: sanitizedTextSchema(255),
  description: richTextSchema(1e3),
  priority: z.number().int().min(1).max(20),
  is_dealbreaker: z.boolean().default(false)
});
z.object({
  school_preferences: z.array(schoolPreferenceSchema).default([]),
  follow_up_days: z.number().int().min(1).max(365).default(14)
});

async function validateBody(event, schema) {
  try {
    const body = await readBody(event);
    return await schema.parseAsync(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: "Validation failed",
        data: {
          errors: err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        }
      });
    }
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body"
    });
  }
}

function sanitizeError(error, defaultCode = 500) {
  if (error instanceof Error && "statusCode" in error) {
    const h3Error = error;
    return {
      statusCode: h3Error.statusCode || defaultCode,
      statusMessage: h3Error.statusMessage || "An error occurred",
      data: {
        message: "An error occurred",
        details: void 0
      }
    };
  }
  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      statusMessage: "Bad Request",
      data: {
        message: "Invalid request format"
      }
    };
  }
  if (error instanceof TypeError) {
    return {
      statusCode: 400,
      statusMessage: "Bad Request",
      data: {
        message: "Invalid request data"
      }
    };
  }
  if (error instanceof Error) {
    return {
      statusCode: defaultCode,
      statusMessage: "Internal Server Error" ,
      data: {
        message: "An error occurred" ,
        details: void 0
      }
    };
  }
  return {
    statusCode: defaultCode,
    statusMessage: "Internal Server Error",
    data: {
      message: "An error occurred" 
    }
  };
}
function createSafeErrorResponse(error, context, defaultCode = 500) {
  return sanitizeError(error, defaultCode);
}
function sanitizeExternalApiError(error, serviceName) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("api") || message.includes("key") || message.includes("credential")) {
      return {
        statusCode: 503,
        statusMessage: "Service Unavailable",
        data: {
          message: `${serviceName} is currently unavailable`
        }
      };
    }
    if (message.includes("timeout") || message.includes("econnrefused")) {
      return {
        statusCode: 504,
        statusMessage: "Gateway Timeout",
        data: {
          message: `${serviceName} is not responding`
        }
      };
    }
  }
  return {
    statusCode: 502,
    statusMessage: "Bad Gateway",
    data: {
      message: `Error communicating with ${serviceName}`
    }
  };
}

const logger = createLogger();
const feedback_post = defineEventHandler(async (event) => {
  var _a;
  try {
    const userId = await tryGetUserId(event);
    const validated = await validateBody(event, feedbackSchema);
    if (!process.env.RESEND_API_KEY) {
      logger.error("Email service not configured");
      throw createError({
        statusCode: 500,
        statusMessage: "Email service not configured"
      });
    }
    const feedbackTypeLabel = validated.feedbackType === "bug" ? "Bug Report" : validated.feedbackType === "feature" ? "Feature Request" : "Other Feedback";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
            <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #111827;">
              New ${feedbackTypeLabel}
            </h1>
            <div style="margin: 16px 0;">
              <p style="margin: 8px 0;"><strong>From:</strong> ${escapeHtml(validated.name)}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${escapeHtml(validated.email)}</p>
              <p style="margin: 8px 0;"><strong>Type:</strong> ${feedbackTypeLabel}</p>
              ${validated.page ? `<p style="margin: 8px 0;"><strong>Page:</strong> ${escapeHtml(validated.page)}</p>` : ""}
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; font-weight: bold;">Message:</p>
              <p style="margin: 0; white-space: pre-wrap; color: #4b5563;">
                ${((_a = validated.message) != null ? _a : "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              </p>
            </div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
            College Baseball Recruiting Compass
          </p>
        </body>
      </html>
    `;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "feedback@resend.dev",
        to: "chris@andrikanich.com",
        subject: `[Feedback] ${feedbackTypeLabel} from ${validated.name}`,
        html: htmlContent
      })
    });
    if (!response.ok) {
      const apiError = await response.json();
      logger.error("Email service error", apiError);
      const safeError = sanitizeExternalApiError(apiError, "Email service");
      throw createError({
        statusCode: safeError.statusCode,
        statusMessage: safeError.statusMessage,
        data: safeError.data
      });
    }
    if (userId) {
      await auditLog(event, {
        userId,
        action: "CREATE",
        resourceType: "feedback",
        description: `Submitted ${validated.feedbackType} feedback`,
        status: "success",
        metadata: {
          feedbackType: validated.feedbackType,
          page: validated.page
        }
      });
    }
    return { success: true, message: "Thank you for your feedback!" };
  } catch (error) {
    const userId = await tryGetUserId(event);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (userId) {
      await auditLog(event, {
        userId,
        action: "CREATE",
        resourceType: "feedback",
        errorMessage,
        status: "failure",
        description: "Failed to submit feedback"
      });
    }
    const safeError = createSafeErrorResponse(error);
    throw createError({
      statusCode: safeError.statusCode,
      statusMessage: safeError.statusMessage,
      data: safeError.data
    });
  }
});
async function tryGetUserId(event) {
  try {
    const user = await requireAuth(event);
    return user.id;
  } catch {
    return null;
  }
}

export { feedback_post as default };
//# sourceMappingURL=feedback.post.mjs.map
