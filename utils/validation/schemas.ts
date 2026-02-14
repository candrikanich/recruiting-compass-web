import { z } from "zod";
import {
  emailSchema,
  urlSchema,
  phoneSchema,
  twitterHandleSchema,
  instagramHandleSchema,
  tiktokHandleSchema,
  facebookHandleSchema,
  sanitizedTextSchema,
  richTextSchema,
  stateSchema,
  percentageSchema,
  currencySchema,
  gpaSchema,
  satSchema,
  actSchema,
  heightSchema,
  weightSchema,
  graduationYearSchema,
  uuidSchema,
  dateTimeSchema,
  dateSchema,
  strongPasswordSchema,
  weakPasswordSchema,
} from "./validators";

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: weakPasswordSchema,
  rememberMe: z.boolean().optional().default(false),
});

export const signupSchema = z
  .object({
    fullName: sanitizedTextSchema(255),
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    role: z.enum(["parent", "player"]),
    familyCode: z.string().optional().default(""),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const adminSignupSchema = z
  .object({
    fullName: sanitizedTextSchema(255),
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    role: z.literal("admin"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================================
// SCHOOL SCHEMAS
// ============================================================================

const academicInfoSchema = z
  .object({
    gpa_requirement: z.number().optional(),
    sat_requirement: z.number().optional(),
    act_requirement: z.number().optional(),
    additional_requirements: z.array(z.string()).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    student_size: z.number().nullable().optional(),
    carnegie_size: z.string().nullable().optional(),
    enrollment_all: z.number().nullable().optional(),
    admission_rate: z.number().nullable().optional(),
    tuition_in_state: z.number().nullable().optional(),
    tuition_out_of_state: z.number().nullable().optional(),
  })
  .passthrough() // Allow additional properties for flexibility
  .optional();

export const schoolSchema = z.object({
  name: z
    .string()
    .min(2, "School name must be at least 2 characters")
    .max(255, "School name must not exceed 255 characters")
    .transform((val) => val.trim()),
  location: sanitizedTextSchema(255),
  city: sanitizedTextSchema(100),
  state: stateSchema,
  division: z.enum(["D1", "D2", "D3", "NAIA", "JUCO"]).nullable().optional(),
  conference: sanitizedTextSchema(100),
  website: urlSchema.nullable().optional(),
  twitter_handle: twitterHandleSchema,
  instagram_handle: instagramHandleSchema,
  notes: richTextSchema(5000),
  status: z.enum([
    "researching",
    "contacted",
    "interested",
    "offer_received",
    "declined",
    "committed",
  ]),
  is_favorite: z.boolean().default(false),
  pros: z.array(sanitizedTextSchema(500)).default([]),
  cons: z.array(sanitizedTextSchema(500)).default([]),
  academic_info: academicInfoSchema,
});

// ============================================================================
// COACH SCHEMAS
// ============================================================================

export const coachSchema = z.object({
  school_id: uuidSchema.optional(),
  first_name: sanitizedTextSchema(100),
  last_name: sanitizedTextSchema(100),
  role: z.enum(["head", "assistant", "recruiting"]),
  email: emailSchema.or(z.literal("")).optional(),
  phone: phoneSchema,
  twitter_handle: twitterHandleSchema,
  instagram_handle: instagramHandleSchema,
  notes: richTextSchema(5000),
});

// ============================================================================
// INTERACTION SCHEMAS
// ============================================================================

export const interactionSchema = z
  .object({
    type: z.enum([
      "email",
      "phone_call",
      "text",
      "in_person_visit",
      "virtual_meeting",
      "camp",
      "showcase",
      "tweet",
      "dm",
      "game",
      "unofficial_visit",
      "official_visit",
      "other",
    ]),
    direction: z.enum(["outbound", "inbound"]),
    subject: sanitizedTextSchema(500),
    content: richTextSchema(10000), // Sanitize to prevent XSS
    sentiment: z
      .enum(["positive", "neutral", "negative", "very_positive"])
      .nullable()
      .optional(),
    occurred_at: dateTimeSchema,
    school_id: uuidSchema.optional(),
    coach_id: uuidSchema,
    event_id: uuidSchema.optional(),
  })
  .refine((data) => data.school_id || data.coach_id, {
    message: "Must have either school or coach",
    path: ["school_id"],
  });

// ============================================================================
// EVENT SCHEMAS
// ============================================================================

export const eventSchema = z
  .object({
    type: z.enum([
      "showcase",
      "camp",
      "official_visit",
      "unofficial_visit",
      "game",
    ]),
    name: sanitizedTextSchema(255),
    location: sanitizedTextSchema(255),
    city: sanitizedTextSchema(100),
    state: stateSchema,
    address: sanitizedTextSchema(255),
    start_date: dateSchema,
    end_date: dateSchema.nullable().optional(),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format")
      .nullable()
      .optional(),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format")
      .nullable()
      .optional(),
    url: urlSchema.nullable().optional(),
    description: richTextSchema(2000),
    cost: currencySchema,
    school_id: uuidSchema.optional(),
    registered: z.boolean().default(false),
    attended: z.boolean().default(false),
    performance_notes: richTextSchema(2000),
  })
  .refine(
    (data) => {
      if (data.end_date && data.start_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["end_date"] },
  );

// ============================================================================
// OFFER SCHEMAS
// ============================================================================

export const offerSchema = z
  .object({
    school_id: z.string().uuid("Invalid school ID"),
    coach_id: uuidSchema.optional(),
    offer_type: z.enum([
      "full_ride",
      "partial",
      "scholarship",
      "recruited_walk_on",
      "preferred_walk_on",
    ]),
    scholarship_amount: currencySchema,
    scholarship_percentage: percentageSchema,
    offer_date: dateSchema,
    deadline_date: dateSchema.nullable().optional(),
    status: z
      .enum(["pending", "accepted", "declined", "expired"])
      .default("pending"),
    conditions: richTextSchema(2000),
    notes: richTextSchema(2000),
  })
  .refine(
    (data) => {
      // Either amount or percentage, not both
      const hasAmount = data.scholarship_amount && data.scholarship_amount > 0;
      const hasPercentage =
        data.scholarship_percentage && data.scholarship_percentage > 0;
      return !(hasAmount && hasPercentage);
    },
    {
      message: "Provide either scholarship amount or percentage, not both",
      path: ["scholarship_amount"],
    },
  )
  .refine(
    (data) => {
      if (data.deadline_date && data.offer_date) {
        return new Date(data.deadline_date) >= new Date(data.offer_date);
      }
      return true;
    },
    { message: "Deadline must be after offer date", path: ["deadline_date"] },
  );

// ============================================================================
// PLAYER DETAILS SCHEMAS
// ============================================================================

export const playerDetailsSchema = z.object({
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
  showcase_id: sanitizedTextSchema(50),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const documentSchema = z.object({
  type: z.enum([
    "highlight_video",
    "transcript",
    "resume",
    "rec_letter",
    "questionnaire",
    "stats_sheet",
  ]),
  title: sanitizedTextSchema(255),
  description: richTextSchema(2000),
  school_id: uuidSchema.optional(),
  version: z.number().int().min(1).default(1),
  is_current: z.boolean().default(true),
});

// ============================================================================
// SOCIAL MEDIA SCHEMAS
// ============================================================================

export const socialMediaPostSchema = z.object({
  platform: z.enum(["twitter", "instagram"]),
  post_url: urlSchema,
  post_content: richTextSchema(5000), // CRITICAL: sanitize external content
  post_date: dateTimeSchema,
  author_handle: sanitizedTextSchema(100),
  author_name: sanitizedTextSchema(255),
  is_recruiting_related: z.boolean().default(false),
  flagged_for_review: z.boolean().default(false),
  notes: richTextSchema(2000).optional(),
});

// ============================================================================
// EXTERNAL API RESPONSE SCHEMAS
// ============================================================================

export const collegeScorecardResponseSchema = z
  .object({
    results: z
      .array(
        z.object({
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
          "latest.cost.tuition.out_of_state": z.number().nullable(),
        }),
      )
      .nullable(),
  })
  .nullable();

// ============================================================================
// FEEDBACK SCHEMAS
// ============================================================================

export const feedbackSchema = z.object({
  name: sanitizedTextSchema(255),
  email: emailSchema,
  feedbackType: z.enum(["bug", "feature", "other"]),
  page: sanitizedTextSchema(255).optional(),
  message: sanitizedTextSchema(5000),
});

// ============================================================================
// PREFERENCES SCHEMAS
// ============================================================================

export const schoolPreferenceSchema = z.object({
  name: sanitizedTextSchema(255),
  description: richTextSchema(1000),
  priority: z.number().int().min(1).max(20),
  is_dealbreaker: z.boolean().default(false),
});

export const playerPreferencesSchema = z.object({
  school_preferences: z.array(schoolPreferenceSchema).default([]),
  follow_up_days: z.number().int().min(1).max(365).default(14),
});

// ============================================================================
// EXPORTS FOR TYPE INFERENCE
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type { SessionPreferences, SessionTimeoutConfig } from "~/types/session";
export type SchoolInput = z.infer<typeof schoolSchema>;
export type CoachInput = z.infer<typeof coachSchema>;
export type InteractionInput = z.infer<typeof interactionSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type OfferInput = z.infer<typeof offerSchema>;
export type PlayerDetailsInput = z.infer<typeof playerDetailsSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type SocialMediaPostInput = z.infer<typeof socialMediaPostSchema>;
