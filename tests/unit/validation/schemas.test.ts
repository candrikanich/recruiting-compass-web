import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  schoolSchema,
  coachSchema,
  interactionSchema,
  playerDetailsSchema,
  eventSchema,
  offerSchema,
} from "~/utils/validation/schemas";

describe("loginSchema", () => {
  it("should validate correct login data", async () => {
    const data = {
      email: "user@example.com",
      password: "SecurePass123",
    };
    const result = await loginSchema.parseAsync(data);
    expect(result.email).toBe("user@example.com");
  });

  it("should reject invalid email", async () => {
    const data = {
      email: "notanemail",
      password: "SecurePass123",
    };
    await expect(loginSchema.parseAsync(data)).rejects.toThrow();
  });

  it("should reject short password", async () => {
    const data = {
      email: "user@example.com",
      password: "short",
    };
    await expect(loginSchema.parseAsync(data)).rejects.toThrow();
  });
});

describe("signupSchema", () => {
  it("should validate correct signup data", async () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "parent",
    };
    const result = await signupSchema.parseAsync(data);
    expect(result.fullName).toBe("John Doe");
    expect(result.role).toBe("parent");
  });

  it("should reject mismatched passwords", async () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
      confirmPassword: "DifferentPass123",
      role: "parent",
    };
    await expect(signupSchema.parseAsync(data)).rejects.toThrow("Passwords");
  });

  it("should require uppercase letter in password", async () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "securepass123",
      confirmPassword: "securepass123",
      role: "parent",
    };
    await expect(signupSchema.parseAsync(data)).rejects.toThrow();
  });

  it("should require number in password", async () => {
    const data = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "SecurePass",
      confirmPassword: "SecurePass",
      role: "parent",
    };
    await expect(signupSchema.parseAsync(data)).rejects.toThrow();
  });

  it("should accept valid role", async () => {
    const data = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      role: "student",
    };
    const result = await signupSchema.parseAsync(data);
    expect(result.role).toBe("student");
  });
});

describe("schoolSchema", () => {
  it("should validate correct school data", async () => {
    const data = {
      name: "Florida State University",
      location: "Tallahassee, FL",
      city: "Tallahassee",
      state: "FL",
      division: "D1",
      conference: "ACC",
      website: "https://fsu.edu",
      twitter_handle: "@FSUBaseball",
      instagram_handle: "@fsubaseball",
      notes: "Great program",
      status: "interested",
      is_favorite: true,
      pros: ["Strong program", "Good coaches"],
      cons: ["Cold weather"],
    };
    const result = await schoolSchema.parseAsync(data);
    expect(result.name).toBe("Florida State University");
    expect(result.pros.length).toBe(2);
  });

  it("should sanitize HTML in notes", async () => {
    const data = {
      name: "Test School",
      location: "Test",
      city: "Test",
      state: "FL",
      division: "D1",
      conference: "ACC",
      website: null,
      twitter_handle: "@test",
      instagram_handle: "@test",
      notes: '<script>alert("xss")</script>Good school',
      status: "researching",
      is_favorite: false,
      pros: [],
      cons: [],
    };
    const result = await schoolSchema.parseAsync(data);
    expect(result.notes).not.toContain("script");
  });

  it("should require name", async () => {
    const data = {
      name: "",
      location: "Test",
      city: "Test",
      state: "FL",
      division: "D1",
      conference: "ACC",
      website: null,
      twitter_handle: "@test",
      instagram_handle: "@test",
      notes: "notes",
      status: "researching",
      is_favorite: false,
      pros: [],
      cons: [],
    };
    await expect(schoolSchema.parseAsync(data)).rejects.toThrow();
  });
});

describe("coachSchema", () => {
  it("should validate correct coach data", async () => {
    const data = {
      first_name: "John",
      last_name: "Smith",
      role: "head",
      email: "john@example.com",
      phone: "555-123-4567",
      twitter_handle: "@jsmith",
      instagram_handle: "@jsmith",
      notes: "Great coach",
    };
    const result = await coachSchema.parseAsync(data);
    expect(result.first_name).toBe("John");
    expect(result.role).toBe("head");
  });

  it("should accept optional email", async () => {
    const data = {
      first_name: "Jane",
      last_name: "Doe",
      role: "assistant",
      email: null,
      phone: "555-123-4567",
      twitter_handle: "@jdoe",
      instagram_handle: "@jdoe",
      notes: "Assistant coach",
    };
    const result = await coachSchema.parseAsync(data);
    expect(result.email).toBeNull();
  });

  it("should reject invalid role", async () => {
    const data = {
      first_name: "Test",
      last_name: "Coach",
      role: "invalid",
      email: "test@example.com",
      phone: "555-123-4567",
      twitter_handle: "@test",
      instagram_handle: "@test",
      notes: "Test",
    };
    await expect(coachSchema.parseAsync(data)).rejects.toThrow();
  });
});

describe("interactionSchema", () => {
  it("should validate correct interaction data", async () => {
    const data = {
      type: "email",
      direction: "outbound",
      subject: "Follow up",
      content: "Checking in about roster",
      sentiment: "positive",
    };
    const result = await interactionSchema.parseAsync(data);
    expect(result.type).toBe("email");
    expect(result.direction).toBe("outbound");
  });

  it("should sanitize HTML in content", async () => {
    const data = {
      type: "phone_call",
      direction: "inbound",
      subject: "Discussion",
      content: '<script>alert("xss")</script>We talked about recruitment',
      sentiment: null,
    };
    const result = await interactionSchema.parseAsync(data);
    expect(result.content).not.toContain("script");
  });

  it("should allow null sentiment", async () => {
    const data = {
      type: "in_person_visit",
      direction: "outbound",
      subject: "Campus visit",
      content: "Great facility tour",
      sentiment: null,
    };
    const result = await interactionSchema.parseAsync(data);
    expect(result.sentiment).toBeNull();
  });
});

describe("playerDetailsSchema", () => {
  it("should validate correct player data", async () => {
    const data = {
      height: 72,
      weight: 200,
      position: "SS",
      bats: "R",
      throws: "R",
      gpa: 3.8,
      sat_score: 1200,
      act_score: 34,
      graduation_year: 2024,
      email: "player@example.com",
      phone: "555-123-4567",
      twitter_handle: "@player",
      instagram_handle: "@player",
    };
    const result = await playerDetailsSchema.parseAsync(data);
    expect(result.graduation_year).toBe(2024);
    expect(result.gpa).toBe(3.8);
  });

  it("should allow null optional fields", async () => {
    const data = {
      height: 72,
      weight: 200,
      position: "OF",
      bats: "L",
      throws: "L",
      gpa: null,
      sat_score: null,
      act_score: null,
      graduation_year: 2025,
      email: null,
      phone: null,
      twitter_handle: null,
      instagram_handle: null,
    };
    const result = await playerDetailsSchema.parseAsync(data);
    expect(result.gpa).toBeNull();
  });

  it("should reject invalid height", async () => {
    const data = {
      height: 0,
      weight: 200,
      position: "C",
      bats: "R",
      throws: "R",
      gpa: 3.5,
      sat_score: 1200,
      act_score: 32,
      graduation_year: 2024,
      email: "test@example.com",
      phone: "555-123-4567",
      twitter_handle: "@test",
      instagram_handle: "@test",
    };
    await expect(playerDetailsSchema.parseAsync(data)).rejects.toThrow();
  });
});

describe("eventSchema", () => {
  it("should validate correct event data", async () => {
    const data = {
      title: "Showcase",
      location: "Miami",
      event_date: "2024-06-15",
      performance_notes: "Played well",
      description: "Baseball showcase event",
      school_id: null,
      coach_id: null,
    };
    const result = await eventSchema.parseAsync(data);
    expect(result.title).toBe("Showcase");
    expect(result.event_date).toBe("2024-06-15");
  });
});

describe("offerSchema", () => {
  it("should validate correct offer data", async () => {
    const data = {
      school_id: "12345",
      offer_type: "academic",
      scholarship_percentage: 75,
      scholarship_amount: null,
      deadline_date: "2024-12-31",
      status: "active",
      notes: "Good offer",
    };
    const result = await offerSchema.parseAsync(data);
    expect(result.scholarship_percentage).toBe(75);
  });

  it("should accept scholarship amount instead of percentage", async () => {
    const data = {
      school_id: "12345",
      offer_type: "athletic",
      scholarship_percentage: null,
      scholarship_amount: 50000,
      deadline_date: "2024-12-31",
      status: "active",
      notes: "Athletic scholarship",
    };
    const result = await offerSchema.parseAsync(data);
    expect(result.scholarship_amount).toBe(50000);
  });
});
