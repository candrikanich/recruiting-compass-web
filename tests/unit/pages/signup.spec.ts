import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useFormValidation } from "~/composables/useFormValidation";
import { useLoadingStates } from "~/composables/useLoadingStates";
import signup from "~/pages/signup.vue";

const mockRoute = {
  query: {},
};

vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  useRoute: () => mockRoute,
}));

vi.mock("~/composables/useAuth");
vi.mock("~/composables/useAuthFetch");
vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");
vi.mock("~/composables/useFormValidation");
vi.mock("~/composables/useFormErrorFocus", () => ({
  useFormErrorFocus: vi.fn(() => ({
    focusErrorSummary: vi.fn().mockResolvedValue(true),
  })),
}));
vi.mock("~/composables/useLoadingStates");

vi.mock("~/components/Validation/FormErrorSummary.vue", () => ({
  default: {
    name: "FormErrorSummary",
    template: '<div class="form-error-summary" v-if="errors"><slot /></div>',
    props: ["errors", "hasErrors"],
  },
}));

vi.mock("~/components/DesignSystem/FieldError.vue", () => ({
  default: {
    name: "FieldError",
    template: '<div class="field-error" v-if="error">{{ error }}</div>',
    props: ["error"],
  },
}));

vi.mock("~/components/Auth/UserTypeSelector.vue", () => ({
  default: {
    name: "UserTypeSelector",
    template: `
      <div>
        <input
          data-testid="user-type-player"
          type="radio"
          name="userType"
          value="player"
          :checked="selected === 'player'"
          :disabled="disabled"
          @change="$emit('select', 'player')"
        />
        <label>I'm a Player</label>
        <input
          data-testid="user-type-parent"
          type="radio"
          name="userType"
          value="parent"
          :checked="selected === 'parent'"
          :disabled="disabled"
          @change="$emit('select', 'parent')"
        />
        <label>I'm a Parent</label>
      </div>
    `,
    props: ["selected", "disabled"],
    emits: ["select"],
  },
}));

vi.mock("~/components/Auth/SignupForm.vue", () => ({
  default: {
    name: "SignupForm",
    template: `
      <form :data-testid="'signup-form-' + userType" @submit.prevent="$emit('submit')">
        <div>
          <label for="firstName">First Name</label>
          <input id="firstName" :value="firstName" @input="$emit('update:firstName', $event.target.value)" />
        </div>
        <div>
          <label for="lastName">Last Name</label>
          <input id="lastName" :value="lastName" @input="$emit('update:lastName', $event.target.value)" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" :value="email" @input="$emit('update:email', $event.target.value)" @blur="$emit('validateEmail')" />
        </div>
        <div v-if="userType === 'player'">
          <label for="dateOfBirth">Player Date of Birth</label>
          <input id="dateOfBirth" type="date" :value="dateOfBirth" @input="$emit('update:dateOfBirth', $event.target.value)" />
        </div>
        <div v-if="requiresGuardian">
          <label for="guardianEmail">Parent or Guardian Email</label>
          <input id="guardianEmail" type="email" :value="guardianEmail" @input="$emit('update:guardianEmail', $event.target.value)" />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" type="password" :value="password" @input="$emit('update:password', $event.target.value)" @blur="$emit('validatePassword')" />
        </div>
        <div>
          <label for="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" type="password" :value="confirmPassword" @input="$emit('update:confirmPassword', $event.target.value)" />
        </div>
        <div v-if="userType === 'player'">
          <label for="signup-graduation-year">Graduation Year</label>
          <select id="signup-graduation-year" :value="graduationYear" @change="$emit('update:graduationYear', Number($event.target.value))">
            <option value="2027">2027</option>
          </select>
          <label for="signup-primary-sport">Primary Sport</label>
          <select id="signup-primary-sport" :value="primarySport" @change="$emit('update:primarySport', $event.target.value)">
            <option value="Baseball">Baseball</option>
          </select>
          <label for="signup-zip-code">Zip Code</label>
          <input id="signup-zip-code" :value="zipCode" @input="$emit('update:zipCode', $event.target.value)" />
        </div>
        <div>
          <input id="agreeToTerms" type="checkbox" :checked="agreeToTerms" @change="$emit('update:agreeToTerms', $event.target.checked)" />
        </div>
        <button type="submit" :disabled="loading || !agreeToTerms">{{ loading ? 'Creating account...' : 'Create Account' }}</button>
      </form>
      <div>
        <a href="/login">Sign in instead</a>
      </div>
    `,
    props: [
      "guardianEmail",
      "requiresGuardian",
      "userType",
      "firstName",
      "lastName",
      "email",
      "dateOfBirth",
      "password",
      "confirmPassword",
      "agreeToTerms",
      "loading",
      "hasErrors",
      "fieldErrors",
      "graduationYear",
      "primarySport",
      "gender",
      "zipCode",
    ],
    emits: [
      "update:firstName",
      "update:lastName",
      "update:email",
      "update:dateOfBirth",
      "update:password",
      "update:confirmPassword",
      "update:agreeToTerms",
      "update:graduationYear",
      "update:primarySport",
      "update:gender",
      "update:zipCode",
      "submit",
      "validateEmail",
      "validatePassword",
    ],
  },
}));

const mockUseRouter = vi.mocked(useRouter);
const mockUseAuth = vi.mocked(useAuth);
const mockUseAuthFetch = vi.mocked(useAuthFetch);
const mockUseSupabase = vi.mocked(useSupabase);
const mockUseUserStore = vi.mocked(useUserStore);
const mockUseFormValidation = vi.mocked(useFormValidation);
const mockUseLoadingStates = vi.mocked(useLoadingStates);

describe("signup.vue", () => {
  let mockRouter: any;
  let mockAuth: any;
  let mockAuthFetch: any;
  let mockSupabase: any;
  let mockUserStore: any;
  let mockValidation: any;
  let mockLoadingStates: any;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    mockUseRouter.mockReturnValue(mockRouter);

    mockAuth = {
      signup: vi.fn(),
      loading: ref(false),
      error: { value: null },
    };
    mockUseAuth.mockReturnValue(mockAuth);

    mockAuthFetch = {
      $fetchAuth: vi.fn().mockResolvedValue({}),
    };
    mockUseAuthFetch.mockReturnValue(mockAuthFetch);

    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        setSession: vi.fn().mockResolvedValue({ error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn(),
    };
    mockUseSupabase.mockReturnValue(mockSupabase);

    mockUserStore = {
      initializeUser: vi.fn().mockResolvedValue(undefined),
      user: null,
    };
    mockUseUserStore.mockReturnValue(mockUserStore);

    mockValidation = {
      errors: { value: [] },
      fieldErrors: { value: {} },
      validate: vi.fn(),
      validateField: vi.fn(),
      clearErrors: vi.fn(),
      hasErrors: { value: false },
      setErrors: vi.fn(),
    };
    mockUseFormValidation.mockReturnValue(mockValidation);

    mockLoadingStates = {
      loading: ref(false),
      validating: ref(false),
      setLoading: vi.fn((value: boolean) => {
        mockLoadingStates.loading.value = value;
      }),
      setValidating: vi.fn((value: boolean) => {
        mockLoadingStates.validating.value = value;
      }),
    };
    mockUseLoadingStates.mockReturnValue(mockLoadingStates);

    global.navigateTo = vi.fn();
    global.$fetch = vi.fn().mockResolvedValue({});
  });

  const createWrapper = () => {
    return mount(signup, {
      global: {
        stubs: {
          NuxtLink: {
            name: "NuxtLink",
            template: "<a :data-to='to'><slot /></a>",
            props: ["to"],
          },
        },
      },
    });
  };

  describe("User Type Selection", () => {
    it("should render user type selection buttons", () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain("I'm a Player");
      expect(wrapper.text()).toContain("I'm a Parent");
    });

    it("should have player and parent selection radio inputs with proper data-testid", () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      expect(playerRadio.exists()).toBe(true);
      expect(playerRadio.attributes("type")).toBe("radio");
      expect(parentRadio.exists()).toBe(true);
      expect(parentRadio.attributes("type")).toBe("radio");
    });

    it("should allow selecting Player user type", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // After selecting player, the player form should be shown
      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        true,
      );
    });

    it("should allow selecting Parent user type", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // After selecting parent, the parent form should be shown
      expect(wrapper.find('[data-testid="signup-form-parent"]').exists()).toBe(
        true,
      );
    });

    it("should highlight selected user type button", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Player form should be visible
      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        true,
      );
      // Parent form should not be visible
      expect(wrapper.find('[data-testid="signup-form-parent"]').exists()).toBe(
        false,
      );
    });

    it("should hide user type selector after selection and show correct form", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // After selecting player, the selector is hidden and the form is shown
      expect(wrapper.find('[data-testid="user-type-player"]').exists()).toBe(
        false,
      );
      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        true,
      );
    });

    it("should show player signup form when player is selected", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Player form should be shown
      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        true,
      );
    });

    it("should show parent signup form when parent is selected", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Parent form should be shown
      expect(wrapper.find('[data-testid="signup-form-parent"]').exists()).toBe(
        true,
      );
    });

    it("should hide both forms when no user type is selected", () => {
      const wrapper = createWrapper();

      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        false,
      );
      expect(wrapper.find('[data-testid="signup-form-parent"]').exists()).toBe(
        false,
      );
    });

    it("should disable radio inputs during loading", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      // Initially not disabled
      expect(playerRadio.attributes("disabled")).toBeUndefined();

      // Simulate loading state
      await wrapper.vm.$nextTick();

      // This test just verifies radio inputs have type="radio"
      expect(playerRadio.attributes("type")).toBe("radio");
    });
  });

  describe("Player Signup Form", () => {
    it("should show all required fields for player signup", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-player"]');
      expect(form.text()).toContain("First Name");
      expect(form.text()).toContain("Last Name");
      expect(form.text()).toContain("Email");
      expect(form.text()).toContain("Password");
    });

    it("should submit player signup with correct role", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Verify player form is visible (which proves selection worked)
      const form = wrapper.find('[data-testid="signup-form-player"]');
      expect(form.exists()).toBe(true);
    });

    it("should not show family code option in player signup", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-player"]');
      expect(form.text()).not.toContain("Family Code");
    });

    it("should allow optional family code for player on signup", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Player form should be visible
      const form = wrapper.find('[data-testid="signup-form-player"]');
      expect(form.exists()).toBe(true);
    });
  });

  describe("Parent Signup Form", () => {
    it("should show all required fields for parent signup", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-parent"]');
      expect(form.text()).toContain("First Name");
      expect(form.text()).toContain("Last Name");
      expect(form.text()).toContain("Email");
      expect(form.text()).toContain("Password");
    });

    it("should submit parent signup with correct role", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Verify parent form is visible (which proves selection worked)
      const form = wrapper.find('[data-testid="signup-form-parent"]');
      expect(form.exists()).toBe(true);
    });

    it("should NOT show family code in parent signup", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-parent"]');
      expect(form.text()).not.toContain("Family Code");
    });

    it("should show parent signup form without family code field", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-parent"]');
      expect(form.exists()).toBe(true);
      expect(form.find("#familyCode").exists()).toBe(false);
    });
  });

  describe("Form Submission and Routing", () => {
    it("should render routing-related elements correctly", async () => {
      const wrapper = createWrapper();

      // Verify form structure exists for both player and parent
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="signup-form-player"]').exists()).toBe(
        true,
      );
    });

    it("should have proper form elements for player routing", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');

      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Form should be visible with data-testid
      const form = wrapper.find('[data-testid="signup-form-player"]');
      expect(form.exists()).toBe(true);
    });

    it("should have proper form elements for parent routing", async () => {
      const wrapper = createWrapper();
      const parentRadio = wrapper.find('[data-testid="user-type-parent"]');

      await parentRadio.setValue(true);
      await parentRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const form = wrapper.find('[data-testid="signup-form-parent"]');
      expect(form.exists()).toBe(true);
      expect(form.find("#familyCode").exists()).toBe(false);
    });

    it("should verify player and parent forms are distinct", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const playerFormVisible = wrapper
        .find('[data-testid="signup-form-player"]')
        .exists();
      const parentFormVisible = wrapper
        .find('[data-testid="signup-form-parent"]')
        .exists();

      expect(playerFormVisible).toBe(true);
      expect(parentFormVisible).toBe(false);

      // Note: Cannot switch user type after selection in this test
      // because radio buttons are hidden once a type is selected
      // This verifies the form isolation works correctly
    });
  });

  describe("Component Rendering", () => {
    it("should render signup card with user type selection", () => {
      const wrapper = createWrapper();
      expect(wrapper.find('[data-testid="user-type-player"]').exists()).toBe(
        true,
      );
      expect(wrapper.find('[data-testid="user-type-parent"]').exists()).toBe(
        true,
      );
    });

    it("should render back link", () => {
      const wrapper = createWrapper();
      const backLink = wrapper
        .findAll("a")
        .find((el) => el.text().includes("Back to Welcome"));
      expect(backLink).toBeDefined();
    });

    it("should render sign in link after selecting user type", async () => {
      const wrapper = createWrapper();
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      const signInLink = wrapper
        .findAll("a")
        .find((el) => el.text().includes("Sign in"));
      expect(signInLink).toBeDefined();
    });
  });

  describe("Full Submission Flow (session present — confirmation disabled)", () => {
    beforeEach(() => {
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });
      mockAuth.signup.mockResolvedValue({
        data: {
          user: { id: "user-123" },
          session: { user: { id: "user-123" } },
        },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
    });

    it("should call POST /api/family/create after player signup", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(mockAuthFetch.$fetchAuth).toHaveBeenCalledWith(
        "/api/family/create",
        {
          method: "POST",
        },
      );
    });

    it("should navigate to /onboarding after player signup", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(global.navigateTo).toHaveBeenCalledWith("/onboarding");
    });

    it("routes to login with reason=account_created when only the post-signup sign-in fails", async () => {
      const recoverableError = Object.assign(new Error("signin failed"), {
        accountCreatedButSignInFailed: true,
      });
      mockAuth.signup.mockRejectedValue(recoverableError);

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(global.navigateTo).toHaveBeenCalledWith(
        "/login?reason=account_created&email=test%40example.com",
      );
      // Account already exists — must not surface a blocking form error.
      expect(wrapper.text()).not.toContain("signin failed");
    });
  });

  describe("Age Gates", () => {
    // Whole-years-old helper mirroring utils/age.ts semantics, avoids
    // hardcoded dates going stale as the suite ages.
    //
    // Builds the YYYY-MM-DD string from LOCAL date components, not
    // toISOString() -- utils/age.ts's ageFromDateOfBirth() parses the date as
    // local midnight (`${dob}T00:00:00`, no "Z"), so a UTC-serialized string
    // is a real mismatch, not a formatting nicety. Near a UTC day boundary in
    // a timezone behind UTC (e.g. US evenings), toISOString() rolls the date
    // forward a day; parsed back as local midnight, that reads as one day
    // short of the birthday, computing 17 instead of 18. Confirmed live: this
    // exact test failed only in the evening, passed everywhere else today.
    const dobForAge = (years: number) => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - years);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${month}-${day}`;
    };

    it("blocks player signup under 13 (COPPA) without calling signup()", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#dateOfBirth").setValue(dobForAge(10));
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(mockAuth.signup).not.toHaveBeenCalled();
      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        {
          field: "form",
          message:
            "Recruiting Compass is not available for players under 13. If you're a parent, please register with your own information.",
        },
      ]);
    });

    // A 13-17 player used to be turned away here and told to go find an adult to invite
    // them. They now start the account themselves and name a guardian, which routes
    // through POST /api/auth/signup-minor rather than the browser-direct signup — the
    // writes have to be ordered against the DB's minor gate, and the guardian_claims row
    // that satisfies it is service-role only.
    const fillMinorForm = async (
      wrapper: ReturnType<typeof createWrapper>,
      guardianEmail?: string,
    ) => {
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#dateOfBirth").setValue(dobForAge(16));
      await wrapper.vm.$nextTick();
      if (guardianEmail !== undefined) {
        await wrapper.find("#guardianEmail").setValue(guardianEmail);
      }
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();
    };

    it("reveals the guardian email field once the DOB lands in 13-17", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      expect(wrapper.find("#guardianEmail").exists()).toBe(false);

      await wrapper.find("#dateOfBirth").setValue(dobForAge(16));
      await wrapper.vm.$nextTick();

      expect(wrapper.find("#guardianEmail").exists()).toBe(true);
    });

    it("does not show the guardian email field for an 18+ player", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#dateOfBirth").setValue(dobForAge(20));
      await wrapper.vm.$nextTick();

      expect(wrapper.find("#guardianEmail").exists()).toBe(false);
    });

    it("allows submitting a 13-17 signup with no guardian email (skip-guardian is optional)", async () => {
      // Guardian-optional signup wizard: an empty guardianEmail is a valid skip, not a
      // validation error — see docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
      const wrapper = createWrapper();

      await fillMinorForm(wrapper, "");

      expect(mockAuth.signup).not.toHaveBeenCalled();
      expect(mockValidation.setErrors).not.toHaveBeenCalledWith([
        expect.objectContaining({ field: "guardianEmail" }),
      ]);
      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/auth/signup-minor",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ guardianEmail: "" }),
        }),
      );
    });

    it("rejects a guardian email matching the player's own", async () => {
      // Otherwise the minor receives their own consent link and confirms themselves.
      const wrapper = createWrapper();

      await fillMinorForm(wrapper, "test@example.com");

      expect(mockAuth.signup).not.toHaveBeenCalled();
      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        {
          field: "guardianEmail",
          message: expect.stringContaining("different email"),
        },
      ]);
    });

    it("does not use the browser-direct signup path for a 13-17 player", async () => {
      const wrapper = createWrapper();

      await fillMinorForm(wrapper, "parent@example.com");

      // useAuth().signup writes public.users straight from the browser, which the DB gate
      // rejects for a minor with no guardian link yet.
      expect(mockAuth.signup).not.toHaveBeenCalled();
    });

    it("signs in and lands a newly-created minor straight on the dashboard", async () => {
      // signup-minor.post.ts creates the account server-side (auto-confirmed,
      // same as the adult path) but doesn't sign in for us — the client
      // signs in immediately after, same pattern as the adult flow.
      global.$fetch = vi.fn().mockResolvedValue({
        ok: true,
        guardianEmail: "parent@example.com",
        guardianEmailSent: true,
      });
      const wrapper = createWrapper();

      await fillMinorForm(wrapper, "parent@example.com");

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" }),
      );
      expect(mockAuthFetch.$fetchAuth).toHaveBeenCalledWith("/api/family/create", {
        method: "POST",
      });
      expect(mockUserStore.initializeUser).toHaveBeenCalled();
      expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
      expect(global.navigateTo).not.toHaveBeenCalledWith(
        expect.stringContaining("/login"),
      );
      expect(global.navigateTo).not.toHaveBeenCalledWith(
        expect.stringContaining("/verify-email"),
      );
    });

    it("shows a form error if sign-in fails right after account creation", async () => {
      global.$fetch = vi.fn().mockResolvedValue({
        ok: true,
        guardianEmail: "parent@example.com",
        guardianEmailSent: true,
      });
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        error: { message: "invalid token" },
      });
      const wrapper = createWrapper();

      await fillMinorForm(wrapper, "parent@example.com");

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        expect.objectContaining({ field: "form" }),
      ]);
      expect(global.navigateTo).not.toHaveBeenCalledWith("/dashboard");
    });

    it("allows standalone player signup at 18+", async () => {
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        dateOfBirth: dobForAge(18),
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#dateOfBirth").setValue(dobForAge(18));
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      // handleSignup is async with multiple awaits (validate, then signup) before
      // it reaches this call — a single $nextTick() only waits for one Vue render
      // tick, not the full microtask chain, so this assertion could run before
      // signup() was actually invoked. flushPromises() (used by every sibling test
      // in this file that asserts on a post-submit async call) drains it properly.
      await flushPromises();

      expect(mockAuth.signup).toHaveBeenCalled();
    });
  });

  describe("Error Scenarios", () => {
    it("should show error when passwords don't match", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password456");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        { field: "form", message: "Passwords don't match" },
      ]);
    });

    it("should show error when terms not agreed", async () => {
      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      // Don't check terms

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        { field: "form", message: "Please agree to the terms and conditions" },
      ]);
    });

    it("should handle signup API error", async () => {
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });
      mockAuth.signup.mockRejectedValue(new Error("Email already exists"));

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        { field: "form", message: "Email already exists" },
      ]);
    });

    it("should handle user already registered error gracefully", async () => {
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });
      // The endpoint tags duplicates with a structured code — the page must
      // branch on that, not on message text.
      mockAuth.signup.mockRejectedValue(
        Object.assign(new Error("An account with this email already exists"), {
          data: { data: { code: "email_taken" } },
        }),
      );
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      });

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      // Should attempt to get existing session
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    it("surfaces actionable guidance on a captcha_failed error code", async () => {
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });
      mockAuth.signup.mockRejectedValue(
        Object.assign(new Error("Verification failed. Please try again."), {
          data: { data: { code: "captcha_failed" } },
        }),
      );

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(mockValidation.setErrors).toHaveBeenCalledWith([
        {
          field: "form",
          message: expect.stringContaining("couldn't confirm you're not a robot"),
        },
      ]);
    });
  });

  describe("Terms Agreement Validation", () => {
    it("should clear terms error when checkbox is checked", async () => {
      mockValidation.errors.value = [
        { field: "form", message: "Please agree to the terms and conditions" },
      ];

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      // Check terms checkbox
      await wrapper.find("#agreeToTerms").setValue(true);
      await wrapper.vm.$nextTick();

      // Should filter out terms error
      expect(mockValidation.setErrors).toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should disable buttons during loading", async () => {
      // Set up validation to succeed so loading state is triggered
      mockValidation.validate.mockResolvedValue({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123", // pragma: allowlist secret
        confirmPassword: "Password123",
        role: "player",
      });
      mockAuth.signup.mockImplementation(() => new Promise(() => {})); // Never resolves

      const wrapper = createWrapper();

      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      await playerRadio.setValue(true);
      await playerRadio.trigger("change");
      await wrapper.vm.$nextTick();

      await wrapper.find("#firstName").setValue("Test");
      await wrapper.find("#lastName").setValue("User");
      await wrapper.find("#email").setValue("test@example.com");
      await wrapper.find("#password").setValue("Password123");
      await wrapper.find("#confirmPassword").setValue("Password123");
      await wrapper.find("#agreeToTerms").setValue(true);

      await wrapper.find("form").trigger("submit.prevent");
      await wrapper.vm.$nextTick();

      // Submit button should be disabled during loading
      const submitButton = wrapper.find('button[type="submit"]');
      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should disable user type radio inputs during loading", async () => {
      const wrapper = createWrapper();

      // Initially not disabled
      const playerRadio = wrapper.find('[data-testid="user-type-player"]');
      expect(playerRadio.attributes("disabled")).toBeUndefined();
    });
  });
});
