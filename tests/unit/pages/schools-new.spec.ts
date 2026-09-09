import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

let routeQuery: Record<string, string> = {};
const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
const createSchoolMock = vi.fn();
const findDuplicateMock = vi.fn(() => ({ duplicate: null, matchType: null }));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("#app", () => ({
  navigateTo: navigateToMock,
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    createSchool: createSchoolMock,
    findDuplicate: findDuplicateMock,
    fetchSchools: vi.fn().mockResolvedValue(undefined),
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useNcaaLookup", () => ({
  useNcaaLookup: () => ({ lookupDivision: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("~/composables/useCollegeData", () => ({
  useCollegeData: () => ({
    fetchByName: vi.fn().mockResolvedValue(null),
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn().mockResolvedValue(null) }),
}));

import SchoolsNewPage from "~/pages/schools/new.vue";

const SchoolFormStub = {
  name: "SchoolForm",
  props: [
    "loading",
    "useAutocomplete",
    "collegeScorecardData",
    "initialData",
    "initialAutoFilledFields",
  ],
  emits: ["submit", "collegeSelect", "cancel"],
  template: "<div />",
};

describe("pages/schools/new.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
  });

  const mountPage = () =>
    mount(SchoolsNewPage, {
      global: {
        stubs: {
          FormPageLayout: { template: "<div><slot /></div>" },
          SchoolForm: SchoolFormStub,
          SchoolDuplicateDialog: true,
        },
      },
    });

  it("seeds SchoolForm's website from prefillWebsite when no college is selected", () => {
    routeQuery = { prefillWebsite: "https://osu.edu" };
    const wrapper = mountPage();

    const form = wrapper.findComponent(SchoolFormStub);
    expect((form.props("initialData") as any).website).toBe("https://osu.edu");
  });

  it("redirects to returnTo with the new schoolId on save instead of /schools/{id}", async () => {
    routeQuery = { returnTo: "/interactions/add?draftId=draft-1" };
    createSchoolMock.mockResolvedValue({ id: "school-new-1" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("submit", {
      name: "Ohio State",
      website: "https://osu.edu",
    });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(navigateToMock).toHaveBeenCalledWith(
      "/interactions/add?draftId=draft-1&schoolId=school-new-1",
    );
  });

  it("falls back to /schools/{id} when there's no returnTo", async () => {
    routeQuery = {};
    createSchoolMock.mockResolvedValue({ id: "school-new-2" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("submit", { name: "Ohio State" });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(navigateToMock).toHaveBeenCalledWith("/schools/school-new-2");
  });

  it.each([
    "//evil.example.com",
    "https://evil.example.com",
    "javascript:alert(1)",
  ])(
    "ignores an off-site returnTo (%s) and lands on /schools/{id}",
    async (hostile) => {
      routeQuery = { returnTo: hostile };
      createSchoolMock.mockResolvedValue({ id: "school-new-3" });
      const wrapper = mountPage();
      const form = wrapper.findComponent(SchoolFormStub);

      await form.vm.$emit("submit", { name: "Ohio State" });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(navigateToMock).toHaveBeenCalledWith("/schools/school-new-3");
    },
  );

  it("ignores a prefillWebsite that isn't an http(s) URL", () => {
    routeQuery = { prefillWebsite: "javascript:alert(1)" };
    const wrapper = mountPage();

    const form = wrapper.findComponent(SchoolFormStub);
    expect((form.props("initialData") as any).website).toBe("");
  });

  it("cancels back to returnTo when present", async () => {
    routeQuery = { returnTo: "/interactions/add?draftId=draft-1" };
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("cancel");

    expect(navigateToMock).toHaveBeenCalledWith(
      "/interactions/add?draftId=draft-1",
    );
  });
});
