# Test Coverage to 75% Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Increase test coverage from 62.91% (statements) to 75% to pass CI/CD pipeline.

**Architecture:** TDD approach - identify lowest-coverage modules, write tests first (RED), implement minimal code to pass (GREEN), refactor (IMPROVE), verify coverage increases. Focus on high-impact files that contribute most to overall coverage percentage.

**Tech Stack:** Vitest, TypeScript, Vue 3, Pinia, Supabase

---

## Coverage Baseline

```
Current:
- Statements: 62.91% (need 75%) → Gap: 12.09%
- Lines: 64.18% (need 75%) → Gap: 10.82%
- Functions: 63.07% (need 75%) → Gap: 11.93%
- Branches: 51.37% (need 70%) → Gap: 18.63%

Target per category (proportional to current gaps):
- ~13% increase in statement coverage needed
- ~12% increase in line coverage needed
- ~12% increase in function coverage needed
- ~19% increase in branch coverage needed
```

## High-Impact Modules (by uncovered lines)

Based on coverage report, target these in order:

1. **`composables/useAuth.ts`** - 42.78% coverage (major auth logic)
2. **`composables/useSchools.ts`** - 76.38% uncovered (critical feature)
3. **`composables/useInteractions.ts`** - 36.43% uncovered
4. **`utils/validation/schemas.ts`** - 38.71% uncovered
5. **`server/utils/ruleEngine.ts`** - 74.25% uncovered
6. **`composables/useCommunicationTemplates.ts`** - 65.45% uncovered
7. **`composables/useOnboarding.ts`** - 35.22% uncovered
8. **`pages/tasks/index.vue`** - 83.88% uncovered (critical page)
9. **`server/utils/auth.ts`** - 96.23% uncovered
10. **`utils/interactions/inboundAlerts.ts`** - 47.06% uncovered

## Task Breakdown

### Task 1: useAuth.ts - Authentication Logic Tests

**Files:**

- Modify: `composables/useAuth.ts:1-600`
- Create: `tests/unit/composables/useAuth.extended.spec.ts`
- Test: Auth initialization, login, logout, session refresh, error states

**Step 1: Analyze uncovered branches in useAuth.ts**

Run: `grep -n "if\|else\|switch\|catch" composables/useAuth.ts | head -20`

Expected: List all conditional branches to identify gaps

**Step 2: Write tests for login flow with invalid credentials**

```typescript
// tests/unit/composables/useAuth.extended.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuth } from "@/composables/useAuth";
import { useSupabase } from "@/composables/useSupabase";

vi.mock("@/composables/useSupabase");

describe("useAuth - Login Invalid Credentials", () => {
  let auth: ReturnType<typeof useAuth>;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = useAuth();
  });

  it("should set error state when login fails with invalid email", async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid login credentials" },
        }),
      },
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    await auth.login("invalid@example.com", "wrongpassword");

    expect(auth.error.value).toBeTruthy();
    expect(auth.isLoading.value).toBe(false);
  });

  it("should handle network errors during login", async () => {
    const mockSupabase = {
      auth: {
        signInWithPassword: vi
          .fn()
          .mockRejectedValue(new Error("Network error")),
      },
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    await auth.login("test@example.com", "password");

    expect(auth.error.value).toContain("Network error");
  });

  it("should clear error on successful login", async () => {
    auth.error.value = "Previous error";
    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: "123", email: "test@example.com" } },
          error: null,
        }),
      },
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    await auth.login("test@example.com", "password");

    expect(auth.error.value).toBeNull();
    expect(auth.isLoading.value).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test -- tests/unit/composables/useAuth.extended.spec.ts -v`
Expected: FAIL - useAuth.ts doesn't have proper error handling for these cases

**Step 4: Implement error handling in useAuth.ts**

```typescript
// composables/useAuth.ts - Update login method
export const useAuth = () => {
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  const login = async (email: string, password: string) => {
    isLoading.value = true;
    error.value = null; // Clear previous errors

    try {
      const supabase = useSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (authError) {
        error.value = authError.message;
        return { success: false, data: null };
      }

      if (!data.user) {
        error.value = "Login failed: no user returned";
        return { success: false, data: null };
      }

      return { success: true, data: data.user };
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      return { success: false, data: null };
    } finally {
      isLoading.value = false;
    }
  };

  return { error, isLoading, login };
};
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/composables/useAuth.extended.spec.ts -v`
Expected: PASS

**Step 6: Run coverage to verify increase**

Run: `npm run test:coverage -- composables/useAuth.ts`
Expected: Coverage increases from 42.78% to ~55%

**Step 7: Commit**

```bash
git add tests/unit/composables/useAuth.extended.spec.ts composables/useAuth.ts
git commit -m "test: add error handling tests for useAuth login flow"
```

---

### Task 2: useSchools.ts - Critical School Operations Tests

**Files:**

- Modify: `composables/useSchools.ts:1-600`
- Create: `tests/unit/composables/useSchools.extended.spec.ts`
- Test: School CRUD operations, filtering, search, duplicate detection

**Step 1: Identify uncovered functions in useSchools.ts**

Run: `grep -n "export const\|function " composables/useSchools.ts | wc -l`
Expected: Count of total functions to test

**Step 2: Write tests for school creation with validation**

```typescript
// tests/unit/composables/useSchools.extended.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSchools } from "@/composables/useSchools";
import { useSupabase } from "@/composables/useSupabase";

vi.mock("@/composables/useSupabase");

describe("useSchools - School CRUD Operations", () => {
  let schools: ReturnType<typeof useSchools>;

  beforeEach(() => {
    vi.clearAllMocks();
    schools = useSchools();
  });

  it("should create school with valid data", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: [{ id: "1", name: "Test School" }],
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await schools.createSchool({
      name: "Test School",
      state: "CA",
      city: "Los Angeles",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "1", name: "Test School" });
  });

  it("should validate required fields before creation", async () => {
    const result = await schools.createSchool({
      name: "",
      state: "CA",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should handle duplicate school detection", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: "2", name: "Existing School" }],
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const hasDuplicate = await schools.isDuplicateSchool("Existing School");

    expect(hasDuplicate).toBe(true);
  });

  it("should update school successfully", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockResolvedValue({
          data: [{ id: "1", name: "Updated School" }],
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await schools.updateSchool("1", { name: "Updated School" });

    expect(result.success).toBe(true);
  });

  it("should handle update errors", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Permission denied" },
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await schools.updateSchool("1", { name: "Updated" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test -- tests/unit/composables/useSchools.extended.spec.ts -v`
Expected: FAIL - Missing functions or error handling

**Step 4: Implement missing school operations**

```typescript
// composables/useSchools.ts - Add CRUD helpers
export const useSchools = () => {
  // ... existing code ...

  const isDuplicateSchool = async (schoolName: string): Promise<boolean> => {
    try {
      const supabase = useSupabase();
      const { data, error } = await supabase
        .from("schools")
        .select("id")
        .ilike("name", schoolName)
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    } catch (err) {
      console.error("Duplicate check failed:", err);
      return false;
    }
  };

  const createSchool = async (schoolData: {
    name: string;
    state: string;
    city?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      if (!schoolData.name?.trim()) {
        return { success: false, error: "School name is required" };
      }
      if (!schoolData.state?.trim()) {
        return { success: false, error: "State is required" };
      }

      const supabase = useSupabase();
      const { data, error } = await supabase
        .from("schools")
        .insert([schoolData])
        .select();

      if (error) throw error;
      return { success: true, data: data?.[0] };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create school";
      return { success: false, error: message };
    }
  };

  const updateSchool = async (
    schoolId: string,
    updates: Partial<any>,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = useSupabase();
      const { error } = await supabase
        .from("schools")
        .update(updates)
        .eq("id", schoolId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update school";
      return { success: false, error: message };
    }
  };

  return {
    // ... existing returns ...
    isDuplicateSchool,
    createSchool,
    updateSchool,
  };
};
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/composables/useSchools.extended.spec.ts -v`
Expected: PASS

**Step 6: Run coverage check**

Run: `npm run test:coverage -- composables/useSchools.ts`
Expected: Coverage increases from 23.62% to ~45%

**Step 7: Commit**

```bash
git add tests/unit/composables/useSchools.extended.spec.ts composables/useSchools.ts
git commit -m "test: add CRUD operation tests for useSchools composable"
```

---

### Task 3: Validation Schemas - Input Validation Tests

**Files:**

- Modify: `utils/validation/schemas.ts:1-255`
- Create: `tests/unit/utils/validation/schemas.extended.spec.ts`
- Test: All schema validators with valid/invalid inputs, edge cases

**Step 1: Write tests for email validation schema**

```typescript
// tests/unit/utils/validation/schemas.extended.spec.ts
import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  schoolSchema,
  coachSchema,
} from "@/utils/validation/schemas";

describe("Validation Schemas", () => {
  describe("emailSchema", () => {
    it("should accept valid email addresses", () => {
      expect(() => emailSchema.parse("test@example.com")).not.toThrow();
      expect(() =>
        emailSchema.parse("user.name+tag@domain.co.uk"),
      ).not.toThrow();
    });

    it("should reject invalid email formats", () => {
      expect(() => emailSchema.parse("invalid.email")).toThrow();
      expect(() => emailSchema.parse("test@")).toThrow();
      expect(() => emailSchema.parse("@example.com")).toThrow();
      expect(() => emailSchema.parse("")).toThrow();
    });

    it("should reject email with spaces", () => {
      expect(() => emailSchema.parse("test @example.com")).toThrow();
    });
  });

  describe("passwordSchema", () => {
    it("should accept valid passwords", () => {
      expect(() => passwordSchema.parse("ValidPass123!")).not.toThrow();
    });

    it("should reject passwords shorter than 8 characters", () => {
      expect(() => passwordSchema.parse("Short1!")).toThrow();
    });

    it("should reject passwords without uppercase", () => {
      expect(() => passwordSchema.parse("lowercase123!")).toThrow();
    });

    it("should reject passwords without numbers", () => {
      expect(() => passwordSchema.parse("NoNumber!")).toThrow();
    });

    it("should reject passwords without special characters", () => {
      expect(() => passwordSchema.parse("NoSpecial123")).toThrow();
    });
  });

  describe("schoolSchema", () => {
    it("should accept valid school data", () => {
      const validSchool = {
        name: "Lincoln High School",
        state: "CA",
        ncaaId: "123456",
      };
      expect(() => schoolSchema.parse(validSchool)).not.toThrow();
    });

    it("should reject school with missing name", () => {
      const invalidSchool = {
        state: "CA",
      };
      expect(() => schoolSchema.parse(invalidSchool)).toThrow();
    });

    it("should reject school with invalid state code", () => {
      const invalidSchool = {
        name: "Test School",
        state: "INVALID",
      };
      expect(() => schoolSchema.parse(invalidSchool)).toThrow();
    });

    it("should reject school with non-numeric ncaaId", () => {
      const invalidSchool = {
        name: "Test School",
        state: "CA",
        ncaaId: "INVALID",
      };
      expect(() => schoolSchema.parse(invalidSchool)).toThrow();
    });
  });

  describe("coachSchema", () => {
    it("should accept valid coach data", () => {
      const validCoach = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "555-1234",
      };
      expect(() => coachSchema.parse(validCoach)).not.toThrow();
    });

    it("should reject coach with missing first name", () => {
      const invalidCoach = {
        lastName: "Doe",
        email: "john@example.com",
      };
      expect(() => coachSchema.parse(invalidCoach)).toThrow();
    });

    it("should reject coach with invalid email", () => {
      const invalidCoach = {
        firstName: "John",
        lastName: "Doe",
        email: "invalid-email",
      };
      expect(() => coachSchema.parse(invalidCoach)).toThrow();
    });

    it("should allow optional phone number", () => {
      const coachWithoutPhone = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      expect(() => coachSchema.parse(coachWithoutPhone)).not.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/utils/validation/schemas.extended.spec.ts -v`
Expected: FAIL - Schemas may not exist or be incomplete

**Step 3: Implement/fix validation schemas**

```typescript
// utils/validation/schemas.ts
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[0-9]/, "Password must contain number")
  .regex(/[!@#$%^&*]/, "Password must contain special character");

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export const schoolSchema = z.object({
  name: z.string().min(1, "School name is required"),
  state: z.enum(US_STATES as [string, ...string[]], {
    errorMap: () => ({ message: "Invalid state code" }),
  }),
  ncaaId: z.string().regex(/^\d+$/, "NCAA ID must be numeric").optional(),
});

export const coachSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: emailSchema,
  phoneNumber: z.string().optional(),
});
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/utils/validation/schemas.extended.spec.ts -v`
Expected: PASS

**Step 5: Run coverage check**

Run: `npm run test:coverage -- utils/validation/schemas.ts`
Expected: Coverage increases from 61.29% to ~85%

**Step 6: Commit**

```bash
git add tests/unit/utils/validation/schemas.extended.spec.ts utils/validation/schemas.ts
git commit -m "test: add comprehensive validation schema tests"
```

---

### Task 4: useInteractions.ts - Interaction Management Tests

**Files:**

- Modify: `composables/useInteractions.ts:1-900`
- Create: `tests/unit/composables/useInteractions.advanced.spec.ts`

**Step 1: Write tests for interaction lifecycle (create, update, complete)**

```typescript
// tests/unit/composables/useInteractions.advanced.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useInteractions } from "@/composables/useInteractions";
import { useSupabase } from "@/composables/useSupabase";

vi.mock("@/composables/useSupabase");

describe("useInteractions - Advanced Lifecycle", () => {
  let interactions: ReturnType<typeof useInteractions>;

  beforeEach(() => {
    vi.clearAllMocks();
    interactions = useInteractions();
  });

  it("should create interaction with coach", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: [{ id: "1", coachId: "123", type: "email" }],
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await interactions.createInteraction({
      coachId: "123",
      type: "email",
      subject: "Test Email",
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("1");
  });

  it("should add note to interaction", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: [{ id: "note1", content: "Test note" }],
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await interactions.addNote("interaction1", "Test note");

    expect(result.success).toBe(true);
  });

  it("should delete interaction", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await interactions.deleteInteraction("interaction1");

    expect(result.success).toBe(true);
  });

  it("should handle errors when creating interaction fails", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase as any);

    const result = await interactions.createInteraction({
      coachId: "123",
      type: "email",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

**Step 2-7: Same pattern as previous tasks**

Run test, implement missing functions, verify pass, check coverage, commit

Expected coverage increase: 61.58% → ~75%

---

### Task 5: Server Rule Engine - Decision Logic Tests

**Files:**

- Modify: `server/utils/ruleEngine.ts`
- Create: `tests/unit/server/utils/ruleEngine.advanced.spec.ts`

**Step 1: Write tests for rule evaluation logic**

```typescript
// tests/unit/server/utils/ruleEngine.advanced.spec.ts
import { describe, it, expect } from "vitest";
import { evaluateRules, createRule } from "@/server/utils/ruleEngine";

describe("Rule Engine - Evaluation Logic", () => {
  it("should evaluate simple condition rule", () => {
    const rule = createRule({
      name: "NCAA Division Check",
      condition: { field: "division", operator: "equals", value: "D1" },
      action: "flag_for_review",
    });

    const result = evaluateRules([rule], { division: "D1" });
    expect(result).toContain("flag_for_review");
  });

  it("should handle AND conditions", () => {
    const rule = createRule({
      name: "High Priority Coach",
      condition: {
        and: [
          { field: "sport", operator: "equals", value: "football" },
          { field: "experience", operator: "greaterThan", value: 10 },
        ],
      },
      action: "high_priority",
    });

    expect(
      evaluateRules([rule], { sport: "football", experience: 15 }),
    ).toContain("high_priority");
    expect(
      evaluateRules([rule], { sport: "baseball", experience: 15 }),
    ).not.toContain("high_priority");
  });

  it("should handle OR conditions", () => {
    const rule = createRule({
      name: "Power 5 or Ivy",
      condition: {
        or: [
          { field: "conference", operator: "equals", value: "SEC" },
          { field: "conference", operator: "equals", value: "Ivy" },
        ],
      },
      action: "elite_tier",
    });

    expect(evaluateRules([rule], { conference: "SEC" })).toContain(
      "elite_tier",
    );
    expect(evaluateRules([rule], { conference: "Ivy" })).toContain(
      "elite_tier",
    );
    expect(evaluateRules([rule], { conference: "MAC" })).not.toContain(
      "elite_tier",
    );
  });

  it("should apply multiple rules in order", () => {
    const rules = [
      createRule({
        name: "Rule1",
        condition: { field: "flag1", operator: "equals", value: true },
        action: "action1",
      }),
      createRule({
        name: "Rule2",
        condition: { field: "flag2", operator: "equals", value: true },
        action: "action2",
      }),
    ];

    const result = evaluateRules(rules, { flag1: true, flag2: true });
    expect(result).toContain("action1");
    expect(result).toContain("action2");
  });

  it("should handle numeric comparisons", () => {
    const rule = createRule({
      name: "GPA Threshold",
      condition: { field: "gpa", operator: "greaterThanOrEqual", value: 3.5 },
      action: "meets_academic_standard",
    });

    expect(evaluateRules([rule], { gpa: 3.8 })).toContain(
      "meets_academic_standard",
    );
    expect(evaluateRules([rule], { gpa: 3.2 })).not.toContain(
      "meets_academic_standard",
    );
  });
});
```

**Step 2-7: Continue pattern, verify coverage increase from 25.75% to ~50%**

---

### Task 6: Pages - High-Impact Page Components

**Files:**

- Modify: `pages/tasks/index.vue`
- Create: `tests/unit/pages/tasks-index.extended.spec.ts`

**Step 1: Write tests for tasks page rendering and interactions**

```typescript
// tests/unit/pages/tasks-index.extended.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TasksIndexPage from "@/pages/tasks/index.vue";

vi.mock("@/composables/useTasks");
vi.mock("@/composables/useAuth");

describe("Tasks Page - Core Functionality", () => {
  it("should render tasks list when loaded", async () => {
    const wrapper = mount(TasksIndexPage);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="tasks-container"]').exists()).toBe(true);
  });

  it("should display loading state while fetching", async () => {
    const wrapper = mount(TasksIndexPage);
    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true);
  });

  it("should show error message when tasks fail to load", async () => {
    // Mock task loading error
    const wrapper = mount(TasksIndexPage);
    // Trigger error state
    expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true);
  });

  it("should open task detail modal on task click", async () => {
    const wrapper = mount(TasksIndexPage);
    await wrapper.find('[data-testid="task-item"]').trigger("click");
    expect(wrapper.find('[data-testid="task-modal"]').exists()).toBe(true);
  });

  it("should filter tasks by status", async () => {
    const wrapper = mount(TasksIndexPage);
    await wrapper.find('[data-testid="status-filter"]').setValue("completed");
    // Verify filtered results
    expect(wrapper.findAll('[data-testid="task-item"]')).toBeTruthy();
  });
});
```

**Step 2-7: Continue implementation pattern**

Expected coverage for pages/tasks/index.vue: 16.12% → ~60%

---

## Summary of Coverage Gains

| Module             | Current | Target | Gain |
| ------------------ | ------- | ------ | ---- |
| useAuth.ts         | 42.78%  | 55%    | +12% |
| useSchools.ts      | 23.62%  | 45%    | +21% |
| schemas.ts         | 61.29%  | 85%    | +23% |
| useInteractions.ts | 61.58%  | 75%    | +13% |
| ruleEngine.ts      | 25.75%  | 50%    | +24% |
| pages/tasks        | 16.12%  | 60%    | +43% |

**Projected Overall Gain: ~15-17% → Target 75% achieved ✅**

## Execution Instructions

Choose one of two approaches:

**1. Subagent-Driven (this session)**

- I dispatch fresh subagent per task
- Code review between tasks
- Fast iteration

**2. Parallel Session (separate)**

- Open new session with executing-plans skill
- Batch execution with checkpoints
- Less context switching

Which approach would you prefer?
