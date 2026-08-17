import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PlayerDetailsAcademicsTab from "~/components/Settings/PlayerDetailsAcademicsTab.vue";
import type { PlayerDetails } from "~/types/models";

const stubs = {
  SharedHighSchoolSearchInput: {
    name: "SharedHighSchoolSearchInput",
    props: ["modelValue", "stateHint", "disabled"],
    template: '<div data-testid="hs-name">HS Search</div>',
  },
};

const createForm = (overrides: Partial<PlayerDetails> = {}): PlayerDetails => ({
  school_name: "",
  school_city: "",
  school_state: "",
  gpa: undefined,
  sat_score: undefined,
  act_score: undefined,
  core_courses: [],
  ...overrides,
});

const defaultProps = {
  form: createForm(),
  isParentRole: false,
  triggerSave: vi.fn(),
  addCourse: vi.fn(),
  removeCourse: vi.fn(),
  newCourseInput: "",
  "onUpdate:newCourseInput": vi.fn(),
};

describe("PlayerDetailsAcademicsTab", () => {
  it("renders the High School field", () => {
    const wrapper = mount(PlayerDetailsAcademicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="hs-name"]').exists()).toBe(true);
  });

  it("does not render social handle inputs", () => {
    const wrapper = mount(PlayerDetailsAcademicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="social-twitter_handle"]').exists()).toBe(
      false,
    );
  });

  it("does not render the Contact/Privacy fields", () => {
    const wrapper = mount(PlayerDetailsAcademicsTab, {
      props: defaultProps,
      global: { stubs },
    });
    expect(wrapper.find('[data-testid="contact-phone"]').exists()).toBe(false);
  });
});
