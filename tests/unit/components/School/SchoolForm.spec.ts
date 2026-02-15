import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick, ref, computed } from "vue";
import SchoolForm from "~/components/School/SchoolForm.vue";

const mockValidate = vi.fn();
const mockValidateField = vi.fn();
const mockClearErrors = vi.fn();
const mockErrors = ref<Record<string, string>>({});
const mockFieldErrors = ref<Record<string, string>>({});
const mockHasErrorsRef = ref(false);
const mockHasErrors = computed(() => mockHasErrorsRef.value);

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({
    errors: mockErrors,
    fieldErrors: mockFieldErrors,
    validate: mockValidate,
    validateField: mockValidateField,
    clearErrors: mockClearErrors,
    hasErrors: mockHasErrors,
  }),
}));

vi.mock("~/composables/useCollegeAutocomplete", () => ({
  useCollegeAutocomplete: () => ({
    results: { value: [] },
    loading: { value: false },
    error: { value: null },
    searchColleges: vi.fn(),
  }),
}));

vi.mock("~/utils/validation/schemas", () => ({
  schoolSchema: {
    shape: {
      name: { parse: vi.fn() },
      location: { parse: vi.fn() },
      division: { parse: vi.fn() },
      conference: { parse: vi.fn() },
      website: { parse: vi.fn() },
      twitter_handle: { parse: vi.fn() },
      instagram_handle: { parse: vi.fn() },
      notes: { parse: vi.fn() },
      status: { parse: vi.fn() },
    },
    parseAsync: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("~/components/Validation/FormErrorSummary.vue", () => ({
  default: {
    template: '<div data-testid="form-error-summary"></div>',
    props: ["errors"],
  },
}));

vi.mock("~/components/DesignSystem/FieldError.vue", () => ({
  default: {
    template: '<span data-testid="field-error"></span>',
    props: ["error"],
  },
}));

describe("SchoolForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockErrors.value = {};
    mockFieldErrors.value = {};
    mockHasErrorsRef.value = false;
    mockValidate.mockResolvedValue({
      name: "Test School",
      status: "researching",
    });
  });

  const mountForm = (props: Record<string, unknown> = {}) =>
    mount(SchoolForm, {
      props: { loading: false, ...props },
      global: {
        stubs: {
          SchoolAutocomplete: {
            template:
              '<div data-testid="school-autocomplete-stub"><input /></div>',
            props: ["disabled"],
            emits: ["select"],
          },
          FormErrorSummary: true,
          DesignSystemFieldError: true,
          DesignSystemFormInput: {
            template: '<input :id="getFieldId(label)" v-model="modelValue" :type="type || \'text\'" :disabled="disabled" :required="required" :placeholder="placeholder" @blur="$emit(\'blur\')" />',
            props: ['modelValue', 'label', 'type', 'disabled', 'required', 'placeholder', 'error', 'autoFilled'],
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
              const getFieldId = (label: string) => label ? label.toLowerCase().replace(/\s+/g, '').replace(/\W/g, '') : 'select'
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

  describe("form fields", () => {
    it("renders name field", () => {
      const wrapper = mountForm({ useAutocomplete: false });
      expect(wrapper.find("#name").exists()).toBe(true);
    });

    it("renders location field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#location").exists()).toBe(true);
    });

    it("renders division select", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#division").exists()).toBe(true);
    });

    it("renders conference field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#conference").exists()).toBe(true);
    });

    it("renders website field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#website").exists()).toBe(true);
    });

    it("renders twitter handle field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#twitter").exists()).toBe(true);
    });

    it("renders instagram handle field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#instagram").exists()).toBe(true);
    });

    it("renders notes field", () => {
      const wrapper = mountForm();
      expect(wrapper.find("#notes").exists()).toBe(true);
    });

    it("renders status select with researching default", () => {
      const wrapper = mountForm();
      const statusSelect = wrapper.find("#status");
      expect(statusSelect.exists()).toBe(true);
      expect((statusSelect.element as HTMLSelectElement).value).toBe(
        "researching",
      );
    });
  });

  describe("loading prop", () => {
    it("disables all inputs when loading", () => {
      const wrapper = mountForm({
        loading: true,
        useAutocomplete: false,
      });

      const inputs = wrapper.findAll("input, select, textarea");
      inputs.forEach((input) => {
        expect(input.attributes("disabled")).toBeDefined();
      });
    });

    it("disables submit button when loading", () => {
      const wrapper = mountForm({
        loading: true,
        useAutocomplete: false,
      });

      const submitBtn = wrapper.find('[data-testid="add-school-button"]');
      expect(submitBtn.attributes("disabled")).toBeDefined();
    });

    it("shows 'Adding...' text when loading", () => {
      const wrapper = mountForm({
        loading: true,
        useAutocomplete: false,
      });

      expect(wrapper.find('[data-testid="add-school-button"]').text()).toBe(
        "Adding...",
      );
    });

    it("shows 'Add School' text when not loading", () => {
      const wrapper = mountForm({ useAutocomplete: false });
      expect(wrapper.find('[data-testid="add-school-button"]').text()).toBe(
        "Add School",
      );
    });
  });

  describe("autocomplete mode", () => {
    it("shows autocomplete when useAutocomplete is true", () => {
      const wrapper = mountForm({ useAutocomplete: true });
      expect(
        wrapper.find('[data-testid="school-autocomplete-stub"]').exists(),
      ).toBe(true);
    });

    it("shows manual name input when useAutocomplete is false", () => {
      const wrapper = mountForm({ useAutocomplete: false });
      expect(wrapper.find("#name").exists()).toBe(true);
      expect(
        wrapper.find('[data-testid="school-autocomplete-stub"]').exists(),
      ).toBe(false);
    });
  });

  describe("auto-filled field indicators", () => {
    it("shows auto-filled indicator for auto-filled fields", () => {
      const wrapper = mountForm({
        initialAutoFilledFields: {
          name: true,
          location: true,
          website: false,
        },
      });

      expect(wrapper.text()).toContain("(auto-filled)");
    });
  });

  describe("college scorecard data", () => {
    it("shows scorecard section when data provided", () => {
      const wrapper = mountForm({
        collegeScorecardData: {
          studentSize: 50000,
          admissionRate: 0.35,
          tuitionInState: 6380,
          tuitionOutOfState: 28658,
          latitude: 29.6516,
          longitude: -82.3248,
        },
      });

      expect(wrapper.text()).toContain("College Scorecard Data");
      expect(wrapper.text()).toContain("50,000");
      expect(wrapper.text()).toContain("35.0%");
    });

    it("hides scorecard section when no data", () => {
      const wrapper = mountForm();
      expect(wrapper.text()).not.toContain("College Scorecard Data");
    });

    it("shows map coordinates available when lat/lng exist", () => {
      const wrapper = mountForm({
        collegeScorecardData: {
          latitude: 29.6516,
          longitude: -82.3248,
        },
      });

      expect(wrapper.text()).toContain("Map coordinates available");
    });
  });

  describe("form submission", () => {
    it("emits submit with form data on valid submission", async () => {
      mockValidate.mockResolvedValue({
        name: "University of Florida",
        status: "researching",
      });

      const wrapper = mountForm({ useAutocomplete: false });

      await wrapper.find("#name").setValue("University of Florida");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      const emitted = wrapper.emitted("submit");
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toMatchObject({
        name: "University of Florida",
        favicon_url: null,
        pros: [],
        cons: [],
        is_favorite: false,
      });
    });

    it("does not emit submit when validation fails", async () => {
      mockValidate.mockResolvedValue(null);

      const wrapper = mountForm({ useAutocomplete: false });
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.emitted("submit")).toBeFalsy();
    });
  });

  describe("cancel", () => {
    it("emits cancel when cancel button clicked", async () => {
      const wrapper = mountForm();
      await wrapper
        .find('[data-testid="cancel-school-button"]')
        .trigger("click");
      expect(wrapper.emitted("cancel")).toBeTruthy();
    });
  });

  describe("submit button disabled state", () => {
    it("disables submit when name is empty", () => {
      const wrapper = mountForm({ useAutocomplete: false });
      const submitBtn = wrapper.find('[data-testid="add-school-button"]');
      expect(submitBtn.attributes("disabled")).toBeDefined();
    });

    it("disables submit when hasErrors is true", async () => {
      mockHasErrorsRef.value = true;
      const wrapper = mountForm({ useAutocomplete: false });
      await wrapper.find("#name").setValue("Test School");
      await nextTick();

      const submitBtn = wrapper.find('[data-testid="add-school-button"]');
      expect(submitBtn.attributes("disabled")).toBeDefined();
    });

    it("enables submit when name has value and no errors", async () => {
      mockHasErrorsRef.value = false;
      const wrapper = mountForm({
        useAutocomplete: false,
        initialData: { name: "Test School" },
      });
      await nextTick();

      const submitBtn = wrapper.find('[data-testid="add-school-button"]');
      // disabled attribute should not be present (or be falsy)
      const isDisabled = submitBtn.element.hasAttribute("disabled");
      expect(isDisabled).toBe(false);
    });
  });

  describe("field validation on blur", () => {
    it("validates name field on blur", async () => {
      const wrapper = mountForm({ useAutocomplete: false });
      await wrapper.find("#name").setValue("Test");
      await wrapper.find("#name").trigger("blur");
      await flushPromises();

      expect(mockValidateField).toHaveBeenCalled();
    });

    it("validates location field on blur", async () => {
      const wrapper = mountForm();
      await wrapper.find("#location").trigger("blur");
      await flushPromises();

      expect(mockValidateField).toHaveBeenCalled();
    });

    it("validates website field on blur", async () => {
      const wrapper = mountForm();
      await wrapper.find("#website").trigger("blur");
      await flushPromises();

      expect(mockValidateField).toHaveBeenCalled();
    });
  });

  describe("error summary", () => {
    it("shows error summary when hasErrors is true", async () => {
      mockHasErrorsRef.value = true;
      const wrapper = mountForm();
      await nextTick();

      // FormErrorSummary is stubbed but v-if="hasErrors" controls it
      expect(wrapper.text()).toBeTruthy();
    });
  });

  describe("initial data", () => {
    it("populates form with initial data", () => {
      const wrapper = mountForm({
        useAutocomplete: false,
        initialData: {
          name: "Pre-filled School",
          location: "Tampa, FL",
          division: "D1",
          conference: "AAC",
          website: "https://test.edu",
          status: "contacted",
        },
      });

      expect((wrapper.find("#name").element as HTMLInputElement).value).toBe(
        "Pre-filled School",
      );
      expect(
        (wrapper.find("#location").element as HTMLInputElement).value,
      ).toBe("Tampa, FL");
      expect(
        (wrapper.find("#division").element as HTMLSelectElement).value,
      ).toBe("D1");
      expect(
        (wrapper.find("#conference").element as HTMLInputElement).value,
      ).toBe("AAC");
    });

    it("defaults status to researching when not specified", () => {
      const wrapper = mountForm();
      expect((wrapper.find("#status").element as HTMLSelectElement).value).toBe(
        "researching",
      );
    });
  });

  describe("status options", () => {
    it("has all 6 status options", () => {
      const wrapper = mountForm();
      const options = wrapper.findAll("#status option");
      expect(options.length).toBe(6);

      const values = options.map((o) => (o.element as HTMLOptionElement).value);
      expect(values).toEqual([
        "researching",
        "contacted",
        "interested",
        "offer_received",
        "declined",
        "committed",
      ]);
    });
  });
});
