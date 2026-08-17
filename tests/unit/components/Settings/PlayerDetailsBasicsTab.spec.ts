import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PlayerDetailsBasicsTab from "~/components/Settings/PlayerDetailsBasicsTab.vue";
import type { PlayerDetails } from "~/types/models";

vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({ activeAthleteId: { value: null } }),
}));

const stubs = {
  SettingsProfilePhotoUpload: {
    name: "SettingsProfilePhotoUpload",
    template: "<div>Photo</div>",
  },
};

const createForm = (overrides: Partial<PlayerDetails> = {}): PlayerDetails => ({
  graduation_year: 2027,
  primary_sport: "Baseball",
  email: "athlete@example.com",
  phone: "440-555-0134",
  allow_share_phone: false,
  allow_share_email: false,
  twitter_handle: "",
  campus_size_preference: undefined,
  cost_sensitivity: undefined,
  ...overrides,
});

const defaultProps = {
  form: createForm(),
  isParentRole: false,
  graduationYears: [2026, 2027, 2028],
  commonSports: ["Baseball", "Softball"],
  campusSizeOptions: [
    { value: "small" as const, label: "Small" },
    { value: "medium" as const, label: "Medium" },
    { value: "large" as const, label: "Large" },
  ],
  costSensitivityOptions: [
    { value: "high" as const, label: "High" },
    { value: "medium" as const, label: "Medium" },
    { value: "low" as const, label: "Low" },
  ],
  triggerSave: vi.fn(),
  socialInputs: [
    { key: "twitter_handle" as const, label: "X", placeholder: "@handle" },
  ],
  handleSocialBlur: vi.fn(),
};

describe("PlayerDetailsBasicsTab", () => {
  it("renders contact email and phone inputs", () => {
    const wrapper = mount(PlayerDetailsBasicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="contact-email"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="contact-phone"]').exists()).toBe(true);
  });

  it("renders the phone and email privacy toggles", () => {
    const wrapper = mount(PlayerDetailsBasicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="share-phone"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="share-email"]').exists()).toBe(true);
  });

  it("renders social handle inputs from the socialInputs prop", () => {
    const wrapper = mount(PlayerDetailsBasicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="social-twitter_handle"]').exists()).toBe(
      true,
    );
  });

  it("does not render the High School field", () => {
    const wrapper = mount(PlayerDetailsBasicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="hs-name"]').exists()).toBe(false);
  });
});
