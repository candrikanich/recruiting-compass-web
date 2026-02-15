import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CoachForm from "~/components/Coach/CoachForm.vue";
import type { ComponentPublicInstance } from "vue";

// Mock the validation composable
const mockValidate = vi.fn();
const mockValidateField = vi.fn();
const mockClearErrors = vi.fn();

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({
    errors: { value: {} },
    fieldErrors: { value: {} },
    validate: mockValidate,
    validateField: mockValidateField,
    clearErrors: mockClearErrors,
    hasErrors: { value: false },
  }),
}));

// Mock the validation schemas
vi.mock("~/utils/validation/schemas", () => ({
  coachSchema: {
    shape: {
      role: {},
      first_name: {},
      last_name: {},
      email: {},
      phone: {},
      twitter_handle: {},
      instagram_handle: {},
      notes: {},
    },
  },
}));

describe("CoachForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue({
      role: "head",
      first_name: "John",
      last_name: "Doe",
    });
  });

  const mountForm = (props = {}) =>
    mount(CoachForm, {
      props: {
        loading: false,
        ...props,
      },
      global: {
        stubs: {
          FormErrorSummary: true,
          DesignSystemFieldError: true,
          DesignSystemFormInput: {
            template: '<input :id="getFieldId(label)" v-model="modelValue" :type="type || \'text\'" :disabled="disabled" :required="required" :placeholder="placeholder" @blur="$emit(\'blur\')" />',
            props: ['modelValue', 'label', 'type', 'disabled', 'required', 'placeholder', 'error'],
            emits: ['update:modelValue', 'blur'],
            setup(props: any) {
              const getFieldId = (label: string) => label.toLowerCase().replace(/\s+/g, '').replace(/\W/g, '')
              return { getFieldId }
            }
          },
          DesignSystemFormSelect: {
            template: '<select :id="getFieldId(label)" v-model="modelValue" :disabled="disabled" :required="required" @blur="$emit(\'blur\')"><option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>',
            props: ['modelValue', 'label', 'disabled', 'required', 'options', 'error'],
            emits: ['update:modelValue', 'blur'],
            setup(props: any) {
              const getFieldId = (label: string) => label.toLowerCase().replace(/\s+/g, '').replace(/\W/g, '')
              return { getFieldId }
            }
          },
          DesignSystemFormTextarea: {
            template: '<textarea :id="getFieldId(label)" v-model="modelValue" :disabled="disabled" :rows="rows" :placeholder="placeholder" @blur="$emit(\'blur\')"></textarea>',
            props: ['modelValue', 'label', 'disabled', 'rows', 'placeholder', 'error'],
            emits: ['update:modelValue', 'blur'],
            setup(props: any) {
              const getFieldId = (label: string) => label.toLowerCase().replace(/\s+/g, '').replace(/\W/g, '')
              return { getFieldId }
            }
          }
        },
      },
    });

  describe("Form Rendering", () => {
    it("should render all required fields", () => {
      const wrapper = mountForm();

      expect(wrapper.find("#role").exists()).toBe(true);
      expect(wrapper.find("#firstname").exists()).toBe(true);
      expect(wrapper.find("#lastname").exists()).toBe(true);
    });

    it("should render role select with all options", () => {
      const wrapper = mountForm();
      const roleSelect = wrapper.find("#role");
      const options = roleSelect.findAll("option");

      expect(options.length).toBeGreaterThanOrEqual(4);
      expect(options[1].text()).toContain("Head Coach");
      expect(options[2].text()).toContain("Assistant Coach");
      expect(options[3].text()).toContain("Recruiting Coordinator");
    });

    it("should render optional fields", () => {
      const wrapper = mountForm();

      expect(wrapper.find("#email").exists()).toBe(true);
      expect(wrapper.find("#phone").exists()).toBe(true);
      expect(wrapper.find("#twitterhandle").exists()).toBe(true);
      expect(wrapper.find("#instagramhandle").exists()).toBe(true);
      expect(wrapper.find("#notes").exists()).toBe(true);
    });

    it("should render submit and cancel buttons", () => {
      const wrapper = mountForm();

      const submitButton = wrapper.find('button[type="submit"]');
      const cancelButton = wrapper.find('button[type="button"]');

      expect(submitButton.exists()).toBe(true);
      expect(submitButton.text()).toContain("Add Coach");
      expect(cancelButton.exists()).toBe(true);
      expect(cancelButton.text()).toContain("Cancel");
    });
  });

  describe("Form Validation", () => {
    it("should require role field", () => {
      const wrapper = mountForm();
      const roleSelect = wrapper.find("#role");

      expect(roleSelect.attributes("required")).toBeDefined();
    });

    it("should require first name field", () => {
      const wrapper = mountForm();
      const firstNameInput = wrapper.find("#firstname");

      expect(firstNameInput.attributes("required")).toBeDefined();
    });

    it("should require last name field", () => {
      const wrapper = mountForm();
      const lastNameInput = wrapper.find("#lastname");

      expect(lastNameInput.attributes("required")).toBeDefined();
    });

    it("should validate email format", () => {
      const wrapper = mountForm();
      const emailInput = wrapper.find("#email");

      expect(emailInput.attributes("type")).toBe("email");
    });

    it("should validate phone format", () => {
      const wrapper = mountForm();
      const phoneInput = wrapper.find("#phone");

      expect(phoneInput.attributes("type")).toBe("tel");
    });
  });

  describe("Form Submission", () => {
    it("should emit submit event with form data", async () => {
      const wrapper = mountForm();

      await wrapper.find("#role").setValue("head");
      await wrapper.find("#firstname").setValue("John");
      await wrapper.find("#lastname").setValue("Doe");
      await wrapper.find("#email").setValue("john@example.com");

      await wrapper.find("form").trigger("submit");
      await wrapper.vm.$nextTick();

      expect(mockValidate).toHaveBeenCalled();
      expect(wrapper.emitted("submit")).toBeTruthy();
    });

    it("should emit cancel event when cancel clicked", async () => {
      const wrapper = mountForm();

      const cancelButton = wrapper.find('button[type="button"]');
      await cancelButton.trigger("click");

      expect(wrapper.emitted("cancel")).toBeTruthy();
    });

    it("should disable submit button when loading", () => {
      const wrapper = mountForm({ loading: true });
      const submitButton = wrapper.find('button[type="submit"]');

      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should disable submit button when required fields are empty", () => {
      const wrapper = mountForm();
      const submitButton = wrapper.find('button[type="submit"]');

      expect(submitButton.attributes("disabled")).toBeDefined();
    });

    it("should show loading text when submitting", () => {
      const wrapper = mountForm({ loading: true });
      const submitButton = wrapper.find('button[type="submit"]');

      expect(submitButton.text()).toContain("Adding...");
    });
  });

  describe("Initial Data", () => {
    it("should pre-fill form with initial data", async () => {
      const initialData = {
        role: "assistant",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
      };

      const wrapper = mountForm({ initialData });
      await wrapper.vm.$nextTick();

      expect((wrapper.find("#role").element as HTMLSelectElement).value).toBe(
        "assistant",
      );
      expect(
        (wrapper.find("#firstname").element as HTMLInputElement).value,
      ).toBe("Jane");
      expect(
        (wrapper.find("#lastname").element as HTMLInputElement).value,
      ).toBe("Smith");
      expect((wrapper.find("#email").element as HTMLInputElement).value).toBe(
        "jane@example.com",
      );
    });

    it("should handle empty initial data", () => {
      const wrapper = mountForm({ initialData: {} });

      expect((wrapper.find("#role").element as HTMLSelectElement).value).toBe(
        "",
      );
      expect(
        (wrapper.find("#firstname").element as HTMLInputElement).value,
      ).toBe("");
    });
  });

  describe("Loading States", () => {
    it("should disable all inputs when loading", () => {
      const wrapper = mountForm({ loading: true });

      expect(wrapper.find("#role").attributes("disabled")).toBeDefined();
      expect(wrapper.find("#firstname").attributes("disabled")).toBeDefined();
      expect(wrapper.find("#lastname").attributes("disabled")).toBeDefined();
      expect(wrapper.find("#email").attributes("disabled")).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in names", async () => {
      const wrapper = mountForm();

      await wrapper.find("#firstname").setValue("O'Brien");
      await wrapper.find("#lastname").setValue("O'Connor-Smith");

      expect(
        (wrapper.find("#firstname").element as HTMLInputElement).value,
      ).toBe("O'Brien");
      expect(
        (wrapper.find("#lastname").element as HTMLInputElement).value,
      ).toBe("O'Connor-Smith");
    });

    it("should handle XSS attempt in input fields", async () => {
      const wrapper = mountForm();

      const xssString = '<script>alert("xss")</script>';
      await wrapper.find("#firstname").setValue(xssString);
      await wrapper.find("form").trigger("submit");

      expect(mockValidate).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper required attributes", () => {
      const wrapper = mountForm();

      expect(wrapper.find("#role").attributes("required")).toBeDefined();
      expect(wrapper.find("#firstname").attributes("required")).toBeDefined();
      expect(wrapper.find("#lastname").attributes("required")).toBeDefined();
    });

    it("should have placeholder text for guidance", () => {
      const wrapper = mountForm();

      expect(wrapper.find("#firstname").attributes("placeholder")).toBeTruthy();
      expect(wrapper.find("#lastname").attributes("placeholder")).toBeTruthy();
    });
  });
});
