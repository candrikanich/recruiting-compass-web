import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import type { SchoolRecommendation } from "~/types/schoolRecommendations";

const baseRecs: SchoolRecommendation[] = [
  {
    catalogKey: "ohio-state",
    name: "Ohio State",
    division: "D1",
    conference: "Big Ten",
    state: "OH",
    website: null,
    athleticsUrl: null,
    score: 72,
    reasons: ["In-state"],
  },
  {
    catalogKey: "michigan",
    name: "Michigan",
    division: "D1",
    conference: "Big Ten",
    state: "MI",
    website: null,
    athleticsUrl: null,
    score: 60,
    reasons: ["Adjacent state"],
  },
  {
    catalogKey: "kent-state",
    name: "Kent State",
    division: "D1",
    conference: "MAC",
    state: "OH",
    website: null,
    athleticsUrl: null,
    score: 55,
    reasons: ["In-state"],
  },
];

const mockRecs = ref<SchoolRecommendation[]>([...baseRecs]);
const mockLoading = ref(false);
const mockError = ref<string | null>(null);
const mockFetch = vi.fn();
const mockDismiss = vi.fn();
const mockCompleteItem = vi.fn();

vi.mock("~/composables/useSchoolRecommendations", () => ({
  useSchoolRecommendations: () => ({
    recommendations: mockRecs,
    loading: mockLoading,
    error: mockError,
    fetchRecommendations: mockFetch,
    dismissRecommendation: mockDismiss,
  }),
}));

vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({ completeItem: mockCompleteItem }),
}));

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

async function mountWidget() {
  const SchoolRecommendationsWidget = (
    await import("~/components/Dashboard/SchoolRecommendationsWidget.vue")
  ).default;
  return mount(SchoolRecommendationsWidget, {
    global: { stubs: { NuxtLink: NuxtLinkStub } },
  });
}

describe("SchoolRecommendationsWidget", () => {
  beforeEach(() => {
    mockRecs.value = [...baseRecs];
    mockLoading.value = false;
    mockError.value = null;
    mockFetch.mockClear();
    mockDismiss.mockClear().mockResolvedValue(undefined);
    mockCompleteItem.mockClear();
  });

  it("fetches recommendations on mount", async () => {
    await mountWidget();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("renders up to 4 recommendation cards", async () => {
    const wrapper = await mountWidget();
    const cards = wrapper.findAll('[data-testid="rec-card"]');
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBe(baseRecs.length);
  });

  it('shows "See all" link to /schools', async () => {
    const wrapper = await mountWidget();
    expect(wrapper.find('a[href="/schools"]').exists()).toBe(true);
  });

  it("hides when there are no recommendations", async () => {
    mockRecs.value = [];
    const wrapper = await mountWidget();
    expect(wrapper.find('[data-testid="rec-card"]').exists()).toBe(false);
  });

  it("calls dismissRecommendation with the catalogKey on 'Not a fit'", async () => {
    const wrapper = await mountWidget();
    const card = wrapper.findAll('[data-testid="rec-card"]')[0];
    await card.find('[data-testid="rec-dismiss"]').trigger("click");
    expect(mockDismiss).toHaveBeenCalledWith("ohio-state");
  });
});
