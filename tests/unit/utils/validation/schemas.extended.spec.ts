import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  adminSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  schoolSchema,
  coachSchema,
  interactionSchema,
  eventSchema,
  offerSchema,
  playerDetailsSchema,
  documentSchema,
  socialMediaPostSchema,
  collegeScorecardResponseSchema,
  feedbackSchema,
  schoolPreferenceSchema,
  playerPreferencesSchema,
} from "~/utils/validation/schemas";

// ============================================================================
// AUTHENTICATION SCHEMAS - Extended Tests
// ============================================================================

describe("loginSchema - Extended", () => {
  it("should validate with rememberMe flag", () => {
    const data = {
      email: "user@example.com",
      password: "SecurePass123",
      rememberMe: true,
    };
    expect(() => loginSchema.parse(data)).not.toThrow();
  });

  it("should default rememberMe to false when omitted", () => {
    const data = {
      email: "user@example.com",
      password: "SecurePass123",
    };
    const result = loginSchema.parse(data);
    expect(result.rememberMe).toBe(false);
  });

  it("should normalize email to lowercase", () => {
    const data = {
      email: "USER@EXAMPLE.COM",
      password: "SecurePass123",
    };
    const result = loginSchema.parse(data);
    expect(result.email).toBe("user@example.com");
  });

  it("should reject email with spaces", () => {
    const data = {
      email: "user @example.com",
      password: "SecurePass123",
    };
    expect(() => loginSchema.parse(data)).toThrow();
  });

  it("should reject password shorter than 8 characters", () => {
    const data = {
      email: "user@example.com",
      password: "Short",
    };
    expect(() => loginSchema.parse(data)).toThrow();
  });

  it("should reject password longer than 128 characters", () => {
    const data = {
      email: "user@example.com",
      password: "A".repeat(129),
    };
    expect(() => loginSchema.parse(data)).toThrow();
  });
});

describe("signupSchema - Extended", () => {
  it("should accept parent role", () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "parent",
    };
    const result = signupSchema.parse(data);
    expect(result.role).toBe("parent");
  });

  it("should accept player role", () => {
    const data = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "player",
    };
    const result = signupSchema.parse(data);
    expect(result.role).toBe("player");
  });

  it("should reject invalid role", () => {
    const data = {
      fullName: "Test User",
      email: "test@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "invalid",
    };
    expect(() => signupSchema.parse(data)).toThrow();
  });

  it("should require password with uppercase letter", () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "securepass123",
      confirmPassword: "securepass123",
      role: "parent",
    };
    expect(() => signupSchema.parse(data)).toThrow();
  });

  it("should require password with lowercase letter", () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SECUREPASS123",
      confirmPassword: "SECUREPASS123",
      role: "parent",
    };
    expect(() => signupSchema.parse(data)).toThrow();
  });

  it("should require password with number", () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass",
      confirmPassword: "SecurePass",
      role: "parent",
    };
    expect(() => signupSchema.parse(data)).toThrow();
  });

  it("should sanitize fullName by removing HTML tags", () => {
    const data = {
      fullName: "<script>alert('xss')</script>John Doe",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "parent",
    };
    const result = signupSchema.parse(data);
    expect(result.fullName).not.toContain("script");
  });

  it("should reject fullName exceeding 255 characters", () => {
    const data = {
      fullName: "A".repeat(256),
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "parent",
    };
    expect(() => signupSchema.parse(data)).toThrow();
  });
});

describe("adminSignupSchema - Extended", () => {
  it("should validate admin signup with admin role only", () => {
    const data = {
      fullName: "Admin User",
      email: "admin@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "admin",
    };
    const result = adminSignupSchema.parse(data);
    expect(result.role).toBe("admin");
  });

  it("should reject non-admin role", () => {
    const data = {
      fullName: "Admin User",
      email: "admin@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "parent",
    };
    expect(() => adminSignupSchema.parse(data)).toThrow();
  });

  it("should reject mismatched passwords in admin signup", () => {
    const data = {
      fullName: "Admin User",
      email: "admin@example.com",
      password: "SecurePass123",
      confirmPassword: "DifferentPass123",
      role: "admin",
    };
    expect(() => adminSignupSchema.parse(data)).toThrow("Passwords");
  });
});

describe("forgotPasswordSchema - Extended", () => {
  it("should validate forgot password request", () => {
    const data = {
      email: "user@example.com",
    };
    expect(() => forgotPasswordSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid email format", () => {
    const data = {
      email: "notanemail",
    };
    expect(() => forgotPasswordSchema.parse(data)).toThrow();
  });

  it("should normalize email to lowercase", () => {
    const data = {
      email: "USER@EXAMPLE.COM",
    };
    const result = forgotPasswordSchema.parse(data);
    expect(result.email).toBe("user@example.com");
  });
});

describe("resetPasswordSchema - Extended", () => {
  it("should validate reset password with matching passwords", () => {
    const data = {
      password: "NewSecurePass123",
      confirmPassword: "NewSecurePass123",
    };
    expect(() => resetPasswordSchema.parse(data)).not.toThrow();
  });

  it("should reject mismatched passwords", () => {
    const data = {
      password: "NewSecurePass123",
      confirmPassword: "DifferentPass123",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow("Passwords");
  });

  it("should require password with uppercase", () => {
    const data = {
      password: "newsecurepass123",
      confirmPassword: "newsecurepass123",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });

  it("should require password with lowercase", () => {
    const data = {
      password: "NEWSECUREPASS123",
      confirmPassword: "NEWSECUREPASS123",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });

  it("should require password with number", () => {
    const data = {
      password: "NewSecurePass",
      confirmPassword: "NewSecurePass",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });

  it("should require minimum 8 characters", () => {
    const data = {
      password: "New1",
      confirmPassword: "New1",
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });

  it("should reject password exceeding 128 characters", () => {
    const longPassword = "A" + "b".repeat(126) + "C1";
    const data = {
      password: longPassword,
      confirmPassword: longPassword,
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });
});

// ============================================================================
// SCHOOL SCHEMAS - Extended Tests
// ============================================================================

describe("schoolSchema - Extended", () => {
  const validSchool = {
    name: "Test University",
    location: "Test City",
    city: "Test City",
    state: "CA",
    division: "D1",
    conference: "ACC",
    website: "https://test.edu",
    twitter_handle: "@test",
    instagram_handle: "@test",
    notes: "Test notes",
    status: "interested",
    is_favorite: false,
    pros: [],
    cons: [],
  };

  it("should accept all valid division values", () => {
    const divisions = ["D1", "D2", "D3", "NAIA", "JUCO"];
    divisions.forEach((division) => {
      const data = { ...validSchool, division };
      expect(() => schoolSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept nullable division", () => {
    const data = { ...validSchool, division: null };
    expect(() => schoolSchema.parse(data)).not.toThrow();
  });

  it("should accept all valid status values", () => {
    const statuses = [
      "researching",
      "contacted",
      "interested",
      "offer_received",
      "declined",
      "committed",
    ];
    statuses.forEach((status) => {
      const data = { ...validSchool, status };
      expect(() => schoolSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid status", () => {
    const data = { ...validSchool, status: "invalid" };
    expect(() => schoolSchema.parse(data)).toThrow();
  });

  it("should trim school name", () => {
    const data = { ...validSchool, name: "  Test University  " };
    const result = schoolSchema.parse(data);
    expect(result.name).toBe("Test University");
  });

  it("should reject school name shorter than 2 characters", () => {
    const data = { ...validSchool, name: "A" };
    expect(() => schoolSchema.parse(data)).toThrow();
  });

  it("should reject school name exceeding 255 characters", () => {
    const data = { ...validSchool, name: "A".repeat(256) };
    expect(() => schoolSchema.parse(data)).toThrow();
  });

  it("should accept nullable website", () => {
    const data = { ...validSchool, website: null };
    expect(() => schoolSchema.parse(data)).not.toThrow();
  });

  it("should sanitize notes HTML", () => {
    const data = {
      ...validSchool,
      notes: "<script>alert('xss')</script>Safe notes",
    };
    const result = schoolSchema.parse(data);
    expect(result.notes).not.toContain("script");
  });

  it("should default is_favorite to false", () => {
    const data = { ...validSchool };
    delete (data as any).is_favorite;
    const result = schoolSchema.parse(data);
    expect(result.is_favorite).toBe(false);
  });

  it("should default pros and cons to empty arrays", () => {
    const data = { ...validSchool };
    delete (data as any).pros;
    delete (data as any).cons;
    const result = schoolSchema.parse(data);
    expect(result.pros).toEqual([]);
    expect(result.cons).toEqual([]);
  });

  it("should accept array of pros", () => {
    const data = {
      ...validSchool,
      pros: ["Good coaches", "Great facilities", "Strong academics"],
    };
    const result = schoolSchema.parse(data);
    expect(result.pros.length).toBe(3);
  });

  it("should accept valid state code", () => {
    const data = { ...validSchool, state: "ny" };
    const result = schoolSchema.parse(data);
    expect(result.state).toBe("NY");
  });

  it("should reject invalid state code", () => {
    const data = { ...validSchool, state: "INVALID" };
    expect(() => schoolSchema.parse(data)).toThrow();
  });
});

// ============================================================================
// COACH SCHEMAS - Extended Tests
// ============================================================================

describe("coachSchema - Extended", () => {
  const validCoach = {
    school_id: "550e8400-e29b-41d4-a716-446655440000",
    first_name: "John",
    last_name: "Smith",
    role: "head",
    email: "john@example.com",
    phone: "555-123-4567",
    twitter_handle: "@jsmith",
    instagram_handle: "@jsmith",
    notes: "Great coach",
  };

  it("should accept all valid roles", () => {
    const roles = ["head", "assistant", "recruiting"];
    roles.forEach((role) => {
      const data = { ...validCoach, role };
      expect(() => coachSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid role", () => {
    const data = { ...validCoach, role: "invalid" };
    expect(() => coachSchema.parse(data)).toThrow();
  });

  it("should accept empty email string", () => {
    const data = { ...validCoach, email: "" };
    expect(() => coachSchema.parse(data)).not.toThrow();
  });

  it("should accept undefined email", () => {
    const data = { ...validCoach };
    delete (data as any).email;
    expect(() => coachSchema.parse(data)).not.toThrow();
  });

  it("should accept optional phone", () => {
    const data = { ...validCoach, phone: "" };
    expect(() => coachSchema.parse(data)).not.toThrow();
  });

  it("should accept various phone formats", () => {
    const phoneFormats = [
      "555-123-4567",
      "(555) 123-4567",
      "555.123.4567",
      "5551234567",
    ];
    phoneFormats.forEach((phone) => {
      const data = { ...validCoach, phone };
      expect(() => coachSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid phone format", () => {
    const data = { ...validCoach, phone: "invalid" };
    expect(() => coachSchema.parse(data)).toThrow();
  });

  it("should accept optional school_id", () => {
    const data = { ...validCoach, school_id: null };
    expect(() => coachSchema.parse(data)).not.toThrow();
  });

  it("should accept valid UUID as school_id", () => {
    const data = {
      ...validCoach,
      school_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(() => coachSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid UUID as school_id", () => {
    const data = { ...validCoach, school_id: "not-a-uuid" };
    expect(() => coachSchema.parse(data)).toThrow();
  });

  it("should sanitize first_name HTML", () => {
    const data = {
      ...validCoach,
      first_name: "<script>alert('xss')</script>John",
    };
    const result = coachSchema.parse(data);
    expect(result.first_name).not.toContain("script");
  });

  it("should sanitize last_name HTML", () => {
    const data = { ...validCoach, last_name: "<b>Smith</b>" };
    const result = coachSchema.parse(data);
    expect(result.last_name).not.toContain("script");
  });
});

// ============================================================================
// INTERACTION SCHEMAS - Extended Tests
// ============================================================================

describe("interactionSchema - Extended", () => {
  const validInteraction = {
    type: "email",
    direction: "outbound",
    subject: "Follow up",
    content: "Checking in",
    sentiment: "positive",
    occurred_at: new Date().toISOString(),
    coach_id: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("should accept all valid interaction types", () => {
    const types = [
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
    ];
    types.forEach((type) => {
      const data = { ...validInteraction, type };
      expect(() => interactionSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept outbound and inbound directions", () => {
    const data1 = { ...validInteraction, direction: "outbound" };
    const data2 = { ...validInteraction, direction: "inbound" };
    expect(() => interactionSchema.parse(data1)).not.toThrow();
    expect(() => interactionSchema.parse(data2)).not.toThrow();
  });

  it("should accept all valid sentiment values", () => {
    const sentiments = ["positive", "neutral", "negative", "very_positive"];
    sentiments.forEach((sentiment) => {
      const data = { ...validInteraction, sentiment };
      expect(() => interactionSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept null sentiment", () => {
    const data = { ...validInteraction, sentiment: null };
    expect(() => interactionSchema.parse(data)).not.toThrow();
  });

  it("should accept optional school_id", () => {
    const data = {
      ...validInteraction,
      school_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(() => interactionSchema.parse(data)).not.toThrow();
  });

  it("should accept optional event_id", () => {
    const data = {
      ...validInteraction,
      event_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(() => interactionSchema.parse(data)).not.toThrow();
  });

  it("should require coach_id", () => {
    const data = { ...validInteraction, coach_id: null };
    expect(() => interactionSchema.parse(data)).toThrow();
  });

  it("should sanitize content HTML", () => {
    const data = {
      ...validInteraction,
      content: "<script>alert('xss')</script>Safe content",
    };
    const result = interactionSchema.parse(data);
    expect(result.content).not.toContain("script");
  });

  it("should sanitize subject HTML", () => {
    const data = { ...validInteraction, subject: "<b>Bold</b> subject" };
    const result = interactionSchema.parse(data);
    expect(result.subject).not.toContain("script");
  });
});

// ============================================================================
// EVENT SCHEMAS - Extended Tests
// ============================================================================

describe("eventSchema - Extended", () => {
  const validEvent = {
    type: "showcase",
    name: "Baseball Showcase",
    location: "Miami, FL",
    city: "Miami",
    state: "FL",
    address: "123 Main St",
    start_date: "2024-06-15",
    end_date: "2024-06-16",
    start_time: "09:00",
    end_time: "17:00",
    url: "https://event.com",
    description: "Great event",
    cost: 100,
    registered: true,
    attended: true,
    performance_notes: "Played well",
  };

  it("should accept all valid event types", () => {
    const types = [
      "showcase",
      "camp",
      "official_visit",
      "unofficial_visit",
      "game",
    ];
    types.forEach((type) => {
      const data = { ...validEvent, type };
      expect(() => eventSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid event type", () => {
    const data = { ...validEvent, type: "invalid" };
    expect(() => eventSchema.parse(data)).toThrow();
  });

  it("should validate date format YYYY-MM-DD", () => {
    const data = { ...validEvent, start_date: "2024-06-15" };
    expect(() => eventSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid date format", () => {
    const data = { ...validEvent, start_date: "06-15-2024" };
    expect(() => eventSchema.parse(data)).toThrow();
  });

  it("should validate time format HH:MM", () => {
    const data = { ...validEvent, start_time: "14:30" };
    expect(() => eventSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid time format", () => {
    const data = { ...validEvent, start_time: "2:30 PM" };
    expect(() => eventSchema.parse(data)).toThrow();
  });

  it("should accept null end_date", () => {
    const data = { ...validEvent, end_date: null };
    expect(() => eventSchema.parse(data)).not.toThrow();
  });

  it("should reject end_date before start_date", () => {
    const data = {
      ...validEvent,
      start_date: "2024-06-16",
      end_date: "2024-06-15",
    };
    expect(() => eventSchema.parse(data)).toThrow("End date must be after");
  });

  it("should accept end_date on same day as start_date", () => {
    const data = {
      ...validEvent,
      start_date: "2024-06-15",
      end_date: "2024-06-15",
    };
    expect(() => eventSchema.parse(data)).not.toThrow();
  });

  it("should accept optional school_id", () => {
    const data = {
      ...validEvent,
      school_id: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(() => eventSchema.parse(data)).not.toThrow();
  });

  it("should reject cost below 0", () => {
    const data = { ...validEvent, cost: -10 };
    expect(() => eventSchema.parse(data)).toThrow();
  });

  it("should reject cost exceeding 100000", () => {
    const data = { ...validEvent, cost: 100001 };
    expect(() => eventSchema.parse(data)).toThrow();
  });
});

// ============================================================================
// OFFER SCHEMAS - Extended Tests
// ============================================================================

describe("offerSchema - Extended", () => {
  const validOffer = {
    school_id: "550e8400-e29b-41d4-a716-446655440000",
    coach_id: "550e8400-e29b-41d4-a716-446655440001",
    offer_type: "full_ride",
    scholarship_amount: 50000,
    scholarship_percentage: 0,
    offer_date: "2024-01-15",
    deadline_date: "2024-12-31",
    status: "pending",
    conditions: "Maintain 3.0 GPA",
    notes: "Great offer",
  };

  it("should accept all valid offer types", () => {
    const offerTypes = [
      "full_ride",
      "partial",
      "scholarship",
      "recruited_walk_on",
      "preferred_walk_on",
    ];
    offerTypes.forEach((offerType) => {
      const data = { ...validOffer, offer_type: offerType };
      expect(() => offerSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept all valid statuses", () => {
    const statuses = ["pending", "accepted", "declined", "expired"];
    statuses.forEach((status) => {
      const data = { ...validOffer, status };
      expect(() => offerSchema.parse(data)).not.toThrow();
    });
  });

  it("should default status to pending", () => {
    const data = { ...validOffer };
    delete (data as any).status;
    const result = offerSchema.parse(data);
    expect(result.status).toBe("pending");
  });

  it("should accept nullable coach_id", () => {
    const data = { ...validOffer, coach_id: null };
    expect(() => offerSchema.parse(data)).not.toThrow();
  });

  it("should reject both scholarship amount and percentage", () => {
    const data = {
      ...validOffer,
      scholarship_amount: 50000,
      scholarship_percentage: 75,
    };
    expect(() => offerSchema.parse(data)).toThrow(
      "Provide either scholarship amount or percentage",
    );
  });

  it("should accept scholarship amount only", () => {
    const data = {
      ...validOffer,
      scholarship_amount: 50000,
      scholarship_percentage: null,
    };
    expect(() => offerSchema.parse(data)).not.toThrow();
  });

  it("should accept scholarship percentage only", () => {
    const data = {
      ...validOffer,
      scholarship_amount: 0,
      scholarship_percentage: 75,
    };
    expect(() => offerSchema.parse(data)).not.toThrow();
  });

  it("should accept neither scholarship amount nor percentage", () => {
    const data = {
      ...validOffer,
      scholarship_amount: 0,
      scholarship_percentage: 0,
    };
    expect(() => offerSchema.parse(data)).not.toThrow();
  });

  it("should reject deadline before offer_date", () => {
    const data = {
      ...validOffer,
      offer_date: "2024-12-31",
      deadline_date: "2024-01-15",
    };
    expect(() => offerSchema.parse(data)).toThrow("Deadline must be after");
  });

  it("should accept deadline on same date as offer", () => {
    const data = {
      ...validOffer,
      offer_date: "2024-06-15",
      deadline_date: "2024-06-15",
    };
    expect(() => offerSchema.parse(data)).not.toThrow();
  });

  it("should reject scholarship_amount exceeding 100000", () => {
    const data = { ...validOffer, scholarship_amount: 100001 };
    expect(() => offerSchema.parse(data)).toThrow();
  });

  it("should reject scholarship_percentage exceeding 100", () => {
    const data = { ...validOffer, scholarship_percentage: 101 };
    expect(() => offerSchema.parse(data)).toThrow();
  });
});

// ============================================================================
// PLAYER DETAILS SCHEMAS - Extended Tests
// ============================================================================

describe("playerDetailsSchema - Extended", () => {
  const currentYear = new Date().getFullYear();
  const validPlayerDetails = {
    graduation_year: currentYear + 2,
    positions: ["SS", "2B"],
    bats: "R",
    throws: "R",
    height_inches: 72,
    weight_lbs: 200,
    gpa: 3.8,
    sat_score: 1400,
    act_score: 32,
    high_school: "Lincoln High",
    club_team: "Club Team USA",
    email: "player@example.com",
    phone: "555-123-4567",
    twitter_handle: "@player",
    instagram_handle: "@player",
    tiktok_handle: "@player",
    facebook_handle: "playerhandle",
    share_contact_with_coaches: true,
    ncaa_id: "12345",
    perfect_game_id: "PG123",
    showcase_id: "SHOW123",
  };

  it("should accept valid graduation year", () => {
    const data = {
      ...validPlayerDetails,
      graduation_year: currentYear + 5,
    };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject graduation year before current year", () => {
    const data = {
      ...validPlayerDetails,
      graduation_year: 2020,
    };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject graduation year more than 10 years in future", () => {
    const currentYear = new Date().getFullYear();
    const data = {
      ...validPlayerDetails,
      graduation_year: currentYear + 11,
    };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should accept multiple positions", () => {
    const data = { ...validPlayerDetails, positions: ["SS", "2B", "OF"] };
    const result = playerDetailsSchema.parse(data);
    expect(result.positions).toHaveLength(3);
  });

  it("should default positions to empty array", () => {
    const data = { ...validPlayerDetails };
    delete (data as any).positions;
    const result = playerDetailsSchema.parse(data);
    expect(result.positions).toEqual([]);
  });

  it("should accept all bat orientations", () => {
    const bats = ["L", "R", "S"];
    bats.forEach((bat) => {
      const data = { ...validPlayerDetails, bats: bat };
      expect(() => playerDetailsSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept null bats", () => {
    const data = { ...validPlayerDetails, bats: null };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should accept throw orientations", () => {
    const throws = ["L", "R"];
    throws.forEach((throwHand) => {
      const data = { ...validPlayerDetails, throws: throwHand };
      expect(() => playerDetailsSchema.parse(data)).not.toThrow();
    });
  });

  it("should accept null throws", () => {
    const data = { ...validPlayerDetails, throws: null };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should validate height range", () => {
    const data = { ...validPlayerDetails, height_inches: 50 };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject height below 48 inches", () => {
    const data = { ...validPlayerDetails, height_inches: 47 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject height above 96 inches", () => {
    const data = { ...validPlayerDetails, height_inches: 97 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should validate weight range", () => {
    const data = { ...validPlayerDetails, weight_lbs: 150 };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject weight below 100 lbs", () => {
    const data = { ...validPlayerDetails, weight_lbs: 99 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject weight above 400 lbs", () => {
    const data = { ...validPlayerDetails, weight_lbs: 401 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should validate GPA range", () => {
    const data = { ...validPlayerDetails, gpa: 4.5 };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject GPA below 0", () => {
    const data = { ...validPlayerDetails, gpa: -1 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject GPA above 5", () => {
    const data = { ...validPlayerDetails, gpa: 5.1 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should validate SAT score range", () => {
    const data = { ...validPlayerDetails, sat_score: 1000 };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject SAT score below 400", () => {
    const data = { ...validPlayerDetails, sat_score: 399 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject SAT score above 1600", () => {
    const data = { ...validPlayerDetails, sat_score: 1601 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should validate ACT score range", () => {
    const data = { ...validPlayerDetails, act_score: 20 };
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should reject ACT score below 1", () => {
    const data = { ...validPlayerDetails, act_score: 0 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should reject ACT score above 36", () => {
    const data = { ...validPlayerDetails, act_score: 37 };
    expect(() => playerDetailsSchema.parse(data)).toThrow();
  });

  it("should accept optional email", () => {
    const data = { ...validPlayerDetails };
    delete (data as any).email;
    expect(() => playerDetailsSchema.parse(data)).not.toThrow();
  });

  it("should default share_contact_with_coaches to false", () => {
    const data = { ...validPlayerDetails };
    delete (data as any).share_contact_with_coaches;
    const result = playerDetailsSchema.parse(data);
    expect(result.share_contact_with_coaches).toBe(false);
  });
});

// ============================================================================
// DOCUMENT SCHEMAS - Extended Tests
// ============================================================================

describe("documentSchema - Extended", () => {
  const validDocument = {
    type: "highlight_video",
    title: "Game Highlights",
    description: "Best plays from season",
    school_id: "550e8400-e29b-41d4-a716-446655440000",
    version: 1,
    is_current: true,
  };

  it("should accept all valid document types", () => {
    const types = [
      "highlight_video",
      "transcript",
      "resume",
      "rec_letter",
      "questionnaire",
      "stats_sheet",
    ];
    types.forEach((type) => {
      const data = { ...validDocument, type };
      expect(() => documentSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid document type", () => {
    const data = { ...validDocument, type: "invalid" };
    expect(() => documentSchema.parse(data)).toThrow();
  });

  it("should accept optional school_id", () => {
    const data = { ...validDocument, school_id: null };
    expect(() => documentSchema.parse(data)).not.toThrow();
  });

  it("should default version to 1", () => {
    const data = { ...validDocument };
    delete (data as any).version;
    const result = documentSchema.parse(data);
    expect(result.version).toBe(1);
  });

  it("should default is_current to true", () => {
    const data = { ...validDocument };
    delete (data as any).is_current;
    const result = documentSchema.parse(data);
    expect(result.is_current).toBe(true);
  });

  it("should reject version below 1", () => {
    const data = { ...validDocument, version: 0 };
    expect(() => documentSchema.parse(data)).toThrow();
  });

  it("should reject non-integer version", () => {
    const data = { ...validDocument, version: 1.5 };
    expect(() => documentSchema.parse(data)).toThrow();
  });

  it("should accept high version numbers", () => {
    const data = { ...validDocument, version: 100 };
    expect(() => documentSchema.parse(data)).not.toThrow();
  });
});

// ============================================================================
// SOCIAL MEDIA POST SCHEMAS - Extended Tests
// ============================================================================

describe("socialMediaPostSchema - Extended", () => {
  const validPost = {
    platform: "twitter",
    post_url: "https://twitter.com/user/status/123",
    post_content: "Great game today!",
    post_date: new Date().toISOString(),
    author_handle: "@user",
    author_name: "User Name",
    is_recruiting_related: true,
    flagged_for_review: false,
    notes: "Important post",
  };

  it("should accept twitter platform", () => {
    const data = { ...validPost, platform: "twitter" };
    expect(() => socialMediaPostSchema.parse(data)).not.toThrow();
  });

  it("should accept instagram platform", () => {
    const data = { ...validPost, platform: "instagram" };
    expect(() => socialMediaPostSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid platform", () => {
    const data = { ...validPost, platform: "invalid" };
    expect(() => socialMediaPostSchema.parse(data)).toThrow();
  });

  it("should accept valid URLs", () => {
    const data = {
      ...validPost,
      post_url: "https://example.com/post",
    };
    expect(() => socialMediaPostSchema.parse(data)).not.toThrow();
  });

  it("should reject invalid URLs", () => {
    const data = {
      ...validPost,
      post_url: "not a url",
    };
    expect(() => socialMediaPostSchema.parse(data)).toThrow();
  });

  it("should default is_recruiting_related to false", () => {
    const data = { ...validPost };
    delete (data as any).is_recruiting_related;
    const result = socialMediaPostSchema.parse(data);
    expect(result.is_recruiting_related).toBe(false);
  });

  it("should default flagged_for_review to false", () => {
    const data = { ...validPost };
    delete (data as any).flagged_for_review;
    const result = socialMediaPostSchema.parse(data);
    expect(result.flagged_for_review).toBe(false);
  });

  it("should accept optional notes", () => {
    const data = { ...validPost };
    delete (data as any).notes;
    expect(() => socialMediaPostSchema.parse(data)).not.toThrow();
  });

  it("should sanitize post_content HTML", () => {
    const data = {
      ...validPost,
      post_content: "<script>alert('xss')</script>Safe content",
    };
    const result = socialMediaPostSchema.parse(data);
    expect(result.post_content).not.toContain("script");
  });
});

// ============================================================================
// EXTERNAL API RESPONSE SCHEMAS - Extended Tests
// ============================================================================

describe("collegeScorecardResponseSchema - Extended", () => {
  it("should accept valid College Scorecard response", () => {
    const data = {
      results: [
        {
          id: 123456,
          "school.name": "University Name",
          "school.city": "City Name",
          "school.state": "CA",
          "school.school_url": "https://example.edu",
          "location.lat": 34.0522,
          "location.lon": -118.2437,
          "latest.admissions.admission_rate.overall": 0.25,
          "latest.student.size": 5000,
          "latest.cost.tuition.in_state": 15000,
          "latest.cost.tuition.out_of_state": 40000,
        },
      ],
    };
    expect(() => collegeScorecardResponseSchema.parse(data)).not.toThrow();
  });

  it("should accept nullable fields", () => {
    const data = {
      results: [
        {
          id: 123456,
          "school.name": "University Name",
          "school.city": null,
          "school.state": null,
          "school.school_url": null,
          "location.lat": null,
          "location.lon": null,
          "latest.admissions.admission_rate.overall": null,
          "latest.student.size": null,
          "latest.cost.tuition.in_state": null,
          "latest.cost.tuition.out_of_state": null,
        },
      ],
    };
    expect(() => collegeScorecardResponseSchema.parse(data)).not.toThrow();
  });

  it("should accept null results", () => {
    const data = { results: null };
    expect(() => collegeScorecardResponseSchema.parse(data)).not.toThrow();
  });

  it("should accept null entire response", () => {
    const data = null;
    expect(() => collegeScorecardResponseSchema.parse(data)).not.toThrow();
  });

  it("should accept empty results array", () => {
    const data = { results: [] };
    expect(() => collegeScorecardResponseSchema.parse(data)).not.toThrow();
  });
});

// ============================================================================
// FEEDBACK SCHEMAS - Extended Tests
// ============================================================================

describe("feedbackSchema - Extended", () => {
  const validFeedback = {
    name: "John Doe",
    email: "john@example.com",
    feedbackType: "bug",
    page: "/schools",
    message: "Found a bug in the UI",
  };

  it("should accept all feedback types", () => {
    const types = ["bug", "feature", "other"];
    types.forEach((type) => {
      const data = { ...validFeedback, feedbackType: type };
      expect(() => feedbackSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject invalid feedback type", () => {
    const data = { ...validFeedback, feedbackType: "invalid" };
    expect(() => feedbackSchema.parse(data)).toThrow();
  });

  it("should accept optional page", () => {
    const data = { ...validFeedback };
    delete (data as any).page;
    expect(() => feedbackSchema.parse(data)).not.toThrow();
  });

  it("should require email field", () => {
    const data = {
      name: "John Doe",
      feedbackType: "bug",
      message: "Bug report",
    };
    expect(() => feedbackSchema.parse(data)).toThrow();
  });
});

// ============================================================================
// PREFERENCE SCHEMAS - Extended Tests
// ============================================================================

describe("schoolPreferenceSchema - Extended", () => {
  const validPreference = {
    name: "Academic Prestige",
    description: "School must be well-ranked",
    priority: 5,
    is_dealbreaker: false,
  };

  it("should accept valid school preference", () => {
    expect(() => schoolPreferenceSchema.parse(validPreference)).not.toThrow();
  });

  it("should accept priority values 1-20", () => {
    for (let i = 1; i <= 20; i++) {
      const data = { ...validPreference, priority: i };
      expect(() => schoolPreferenceSchema.parse(data)).not.toThrow();
    }
  });

  it("should reject priority below 1", () => {
    const data = { ...validPreference, priority: 0 };
    expect(() => schoolPreferenceSchema.parse(data)).toThrow();
  });

  it("should reject priority above 20", () => {
    const data = { ...validPreference, priority: 21 };
    expect(() => schoolPreferenceSchema.parse(data)).toThrow();
  });

  it("should default is_dealbreaker to false", () => {
    const data = { ...validPreference };
    delete (data as any).is_dealbreaker;
    const result = schoolPreferenceSchema.parse(data);
    expect(result.is_dealbreaker).toBe(false);
  });

  it("should accept dealbreaker as true", () => {
    const data = { ...validPreference, is_dealbreaker: true };
    expect(() => schoolPreferenceSchema.parse(data)).not.toThrow();
  });
});

describe("playerPreferencesSchema - Extended", () => {
  it("should accept valid player preferences", () => {
    const data = {
      school_preferences: [
        {
          name: "Location",
          description: "Must be in warm climate",
          priority: 1,
          is_dealbreaker: true,
        },
      ],
      follow_up_days: 7,
    };
    expect(() => playerPreferencesSchema.parse(data)).not.toThrow();
  });

  it("should default school_preferences to empty array", () => {
    const data = { follow_up_days: 14 };
    const result = playerPreferencesSchema.parse(data);
    expect(result.school_preferences).toEqual([]);
  });

  it("should default follow_up_days to 14", () => {
    const data = { school_preferences: [] };
    const result = playerPreferencesSchema.parse(data);
    expect(result.follow_up_days).toBe(14);
  });

  it("should accept follow_up_days 1-365", () => {
    const data = { school_preferences: [], follow_up_days: 100 };
    expect(() => playerPreferencesSchema.parse(data)).not.toThrow();
  });

  it("should reject follow_up_days below 1", () => {
    const data = { school_preferences: [], follow_up_days: 0 };
    expect(() => playerPreferencesSchema.parse(data)).toThrow();
  });

  it("should reject follow_up_days above 365", () => {
    const data = { school_preferences: [], follow_up_days: 366 };
    expect(() => playerPreferencesSchema.parse(data)).toThrow();
  });
});
