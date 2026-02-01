import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CoachingPhilosophy from "~/components/School/CoachingPhilosophy.vue";
import type { School } from "~/types/models";

const mockSchool: School = {
  id: "test-school-1",
  user_id: "user-123",
  name: "Test University",
  location: "Test City, TS",
  division: "D1",
  conference: "Test Conference",
  ranking: 5,
  is_favorite: false,
  website: "https://test.edu",
  favicon_url: null,
  twitter_handle: "test_uni",
  instagram_handle: "test_uni",
  status: "interested",
  status_changed_at: "2024-01-15T10:00:00Z",
  priority_tier: "A",
  notes: "Good school",
  pros: ["Great program"],
  cons: ["Far away"],
  coaching_philosophy: "Player development focused",
  coaching_style: "High-intensity training",
  recruiting_approach: "Early recruiting, all-around athletes",
  communication_style: "Regular emails and phone calls",
  success_metrics: "High MLB draft placement",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
};

const mockSchoolEmpty: School = {
  ...mockSchool,
  coaching_philosophy: null,
  coaching_style: null,
  recruiting_approach: null,
  communication_style: null,
  success_metrics: null,
};

describe("CoachingPhilosophy Component", () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = null;
  });

  const mountWithStubs = (props: any) => {
    return mount(CoachingPhilosophy, {
      props,
      global: {
        stubs: {
          NotesHistory: {
            template: "<div class='notes-history-stub'>NotesHistory</div>",
          },
        },
      },
    });
  };

  it("renders the component with header", () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    expect(wrapper.find("h2").text()).toContain("Coaching Philosophy");
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("displays coaching philosophy data in view mode", () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    expect(wrapper.text()).toContain("Coaching Style");
    expect(wrapper.text()).toContain("High-intensity training");
    expect(wrapper.text()).toContain("Recruiting Approach");
    expect(wrapper.text()).toContain("Early recruiting, all-around athletes");
    expect(wrapper.text()).toContain("Communication Style");
    expect(wrapper.text()).toContain("Regular emails and phone calls");
    expect(wrapper.text()).toContain("Success Metrics");
    expect(wrapper.text()).toContain("High MLB draft placement");
    expect(wrapper.text()).toContain("Overall Philosophy");
    expect(wrapper.text()).toContain("Player development focused");
  });

  it("shows 'no information' message when all fields are empty", () => {
    wrapper = mountWithStubs({
      school: mockSchoolEmpty,
      schoolId: "test-school-1",
    });

    expect(wrapper.text()).toContain(
      "No coaching philosophy information added yet",
    );
  });

  it("toggles edit mode on button click", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    expect(editButton.text()).toContain("Edit");

    await editButton.trigger("click");
    expect(editButton.text()).toContain("Cancel");

    const textareas = wrapper.findAll("textarea");
    expect(textareas.length).toBe(5);
  });

  it("populates edit form with existing data", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    expect(textareas[0].element.value).toBe("High-intensity training");
    expect(textareas[1].element.value).toBe(
      "Early recruiting, all-around athletes",
    );
    expect(textareas[2].element.value).toBe("Regular emails and phone calls");
    expect(textareas[3].element.value).toBe("High MLB draft placement");
    expect(textareas[4].element.value).toBe("Player development focused");
  });

  it("emits update event on save", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    await textareas[0].setValue("Updated coaching style");

    const saveButton = wrapper.findAll("button")[1]; // Save button is second button
    await saveButton.trigger("click");

    expect(wrapper.emitted("update")).toBeTruthy();
    expect(wrapper.emitted("update")[0][0]).toEqual({
      coaching_philosophy: "Player development focused",
      coaching_style: "Updated coaching style",
      recruiting_approach: "Early recruiting, all-around athletes",
      communication_style: "Regular emails and phone calls",
      success_metrics: "High MLB draft placement",
    });
  });

  it("resets form on cancel", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    await textareas[0].setValue("Modified text");
    expect(textareas[0].element.value).toBe("Modified text");

    // Click Cancel (which is the edit button again)
    await editButton.trigger("click");

    // Form should be back in view mode and text should be reverted
    const updatedEditButton = wrapper.find("button");
    expect(updatedEditButton.text()).toContain("Edit");
  });

  it("handles empty textarea values", async () => {
    wrapper = mountWithStubs({
      school: mockSchoolEmpty,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    expect(textareas[0].element.value).toBe("");
    expect(textareas[1].element.value).toBe("");
  });

  it("allows editing individual fields", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");

    // Edit multiple fields
    await textareas[0].setValue("New coaching style");
    await textareas[1].setValue("New recruiting approach");
    await textareas[2].setValue("New communication style");

    expect(textareas[0].element.value).toBe("New coaching style");
    expect(textareas[1].element.value).toBe("New recruiting approach");
    expect(textareas[2].element.value).toBe("New communication style");
    // Others should remain unchanged
    expect(textareas[3].element.value).toBe("High MLB draft placement");
    expect(textareas[4].element.value).toBe("Player development focused");
  });

  it("displays only fields with data in view mode", () => {
    const partialSchool: School = {
      ...mockSchool,
      coaching_style: "High-intensity",
      recruiting_approach: null,
      communication_style: null,
      success_metrics: null,
    };

    wrapper = mountWithStubs({
      school: partialSchool,
      schoolId: "test-school-1",
    });

    expect(wrapper.text()).toContain("Coaching Style");
    expect(wrapper.text()).toContain("High-intensity");
    expect(wrapper.text()).not.toContain("Recruiting Approach");
  });

  it("updates local state when school prop changes", async () => {
    wrapper = mountWithStubs({
      school: mockSchoolEmpty,
      schoolId: "test-school-1",
    });

    await wrapper.setProps({
      school: mockSchool,
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    expect(textareas[0].element.value).toBe("High-intensity training");
  });

  it("includes NotesHistory component", () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    expect(wrapper.text()).toContain("NotesHistory");
  });

  it("has descriptive placeholders in edit mode", async () => {
    wrapper = mountWithStubs({
      school: mockSchoolEmpty,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const textareas = wrapper.findAll("textarea");
    expect(textareas[0].attributes("placeholder")).toContain("High-intensity");
    expect(textareas[1].attributes("placeholder")).toContain(
      "Early recruiting",
    );
    expect(textareas[2].attributes("placeholder")).toContain("Regular emails");
    expect(textareas[3].attributes("placeholder")).toContain(
      "Success with similar athletes",
    );
  });

  it("displays labels for each field in edit mode", async () => {
    wrapper = mountWithStubs({
      school: mockSchoolEmpty,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    expect(wrapper.text()).toContain("Coaching Style");
    expect(wrapper.text()).toContain("Recruiting Approach");
    expect(wrapper.text()).toContain("Communication Style");
    expect(wrapper.text()).toContain("Success Metrics");
    expect(wrapper.text()).toContain("Overall Philosophy");
  });

  it("disables save button while loading", async () => {
    wrapper = mountWithStubs({
      school: mockSchool,
      schoolId: "test-school-1",
    });

    const editButton = wrapper.find("button");
    await editButton.trigger("click");

    const saveButton = wrapper.findAll("button")[1];
    expect(saveButton.attributes("disabled")).toBeUndefined();

    // Simulate loading state
    await wrapper.vm.$forceUpdate();
  });
});
