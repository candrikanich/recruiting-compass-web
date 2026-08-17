import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import AdminJobs from "~/pages/admin/jobs.vue";

const mockTriggerJob = vi.fn();
const mockLoadCronRuns = vi.fn();

vi.mock("~/composables/useAdminCronRuns", () => ({
  useAdminCronRuns: () => ({
    jobs: ref([
      {
        jobName: "health-ping",
        schedule: "0 12 * * *",
        lastRun: null,
        lastSuccessAt: null,
        running: false,
        neverRun: true,
        stale: false,
      },
      {
        jobName: "process-account-deletions",
        schedule: "0 0 * * *",
        lastRun: null,
        lastSuccessAt: null,
        running: false,
        neverRun: true,
        stale: false,
      },
    ]),
    recent: ref([]),
    cronLoading: ref(false),
    cronError: ref(null),
    loadCronRuns: mockLoadCronRuns,
    triggerJob: mockTriggerJob,
  }),
}));

describe("Admin Jobs (jobs.vue)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("renders a Run now control for a triggerable job and none for a blocked job", () => {
    const wrapper = mount(AdminJobs, {
      global: {
        plugins: [createPinia()],
        stubs: {
          AdminChart: { template: "<div />" },
        },
      },
    });

    const cards = wrapper.findAll(".rounded-lg.border.p-4");
    const healthPingCard = cards.find((c) => c.text().includes("health-ping"));
    const blockedCard = cards.find((c) =>
      c.text().includes("process-account-deletions"),
    );

    expect(healthPingCard?.text()).toContain("Run now");
    expect(blockedCard?.text()).not.toContain("Run now");
    expect(blockedCard?.text()).toContain("Scheduled only");
  });
});
