import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import ExportModal from "~/components/Performance/ExportModal.vue";
import DocumentUploadModal from "~/components/School/DocumentUploadModal.vue";
import RecoveryModal from "~/components/Recovery/RecoveryModal.vue";
import SaveSearchDialog from "~/components/Search/SaveSearchDialog.vue";
import SuggestionHelpModal from "~/components/Suggestion/SuggestionHelpModal.vue";
import EmailRecruitingPacketModal from "~/components/EmailRecruitingPacketModal.vue";
import HelpModal from "~/components/Help/HelpModal.vue";
import OfferComparison from "~/components/OfferComparison.vue";

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ currentUser: { full_name: "Test Athlete" } }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("~/composables/useDocumentsConsolidated", () => ({
  useDocumentsConsolidated: () => ({
    uploadDocument: vi.fn(),
    shareDocument: vi.fn(),
    uploadProgress: { value: 0 },
    uploadError: { value: "" },
    isUploading: { value: false },
  }),
}));

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({ validateFile: vi.fn() }),
}));

vi.mock("~/composables/useSavedSearches", () => ({
  useSavedSearches: () => ({ saveSearch: vi.fn(), error: { value: null } }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: { value: [{ id: "school-1", name: "State University" }] },
  }),
}));

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const GLOBAL = { stubs: { Teleport: true, UIcon: true } };

const mountModal = (component: unknown, props: Record<string, unknown>) =>
  mount(component as never, {
    props,
    global: GLOBAL,
    attachTo: document.body,
  });

describe("modal dialog accessibility (batch 2)", () => {
  let wrapper: ReturnType<typeof mount>;

  afterEach(() => {
    wrapper?.unmount();
  });

  const expectDialogSemantics = (title: string) => {
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    const labelId = dialog.attributes("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(wrapper.find(`#${labelId}`).text()).toContain(title);
  };

  const expectEscapeCloses = async () => {
    await wrapper.find('[role="dialog"]').trigger("keydown.escape");
    expect(wrapper.emitted("close")).toBeTruthy();
  };

  const cases: Array<{
    name: string;
    component: unknown;
    props: Record<string, unknown>;
    title: string;
  }> = [
    {
      name: "ExportModal",
      component: ExportModal,
      props: { metrics: [], context: "dashboard" },
      title: "Export Performance Report",
    },
    {
      name: "DocumentUploadModal",
      component: DocumentUploadModal,
      props: { schoolId: "school-1" },
      title: "Upload Document",
    },
    {
      name: "RecoveryModal",
      component: RecoveryModal,
      props: {
        isOpen: true,
        plan: {
          title: "Behind on outreach",
          description: "You have not contacted coaches in 30 days",
          duration_days: 14,
          steps: ["Email three coaches", "Log the interactions"],
        },
      },
      title: "Let's Get Back on Track",
    },
    {
      name: "SaveSearchDialog",
      component: SaveSearchDialog,
      props: {
        isOpen: true,
        searchQuery: "D1 schools",
        searchType: "schools",
        filters: {},
      },
      title: "Save Search",
    },
    {
      name: "SuggestionHelpModal",
      component: SuggestionHelpModal,
      props: { isOpen: true, ruleType: "ncaa-registration" },
      title: "Register with NCAA Eligibility Center",
    },
    {
      name: "EmailRecruitingPacketModal",
      component: EmailRecruitingPacketModal,
      props: { isOpen: true },
      title: "Email Recruiting Packet",
    },
    {
      name: "HelpModal",
      component: HelpModal,
      props: {
        isOpen: true,
        helpDefinition: {
          title: "Fit Score",
          shortDescription: "How well a school matches you",
          fullDescription: "Computed from academics, athletics and location.",
        },
      },
      title: "Fit Score",
    },
    {
      name: "OfferComparison",
      component: OfferComparison,
      props: {
        offers: [
          {
            id: "offer-1",
            school_id: "school-1",
            offer_type: "partial",
            status: "pending",
            scholarship_amount: 20000,
            scholarship_percentage: 50,
            deadline_date: "2099-01-01",
          },
        ],
      },
      title: "Compare Offers",
    },
  ];

  for (const { name, component, props, title } of cases) {
    describe(name, () => {
      it("exposes dialog semantics", () => {
        wrapper = mountModal(component, props);
        expectDialogSemantics(title);
      });

      it("closes on Escape", async () => {
        wrapper = mountModal(component, props);
        await expectEscapeCloses();
      });

      it("has no axe violations when open", async () => {
        wrapper = mountModal(component, props);
        expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
      });
    });
  }
});

describe("OfferComparison best-value indicator", () => {
  let wrapper: ReturnType<typeof mount>;

  afterEach(() => {
    wrapper?.unmount();
  });

  const offers = [
    {
      id: "offer-1",
      school_id: "school-1",
      offer_type: "full_ride",
      status: "pending",
      scholarship_amount: 50000,
      scholarship_percentage: 100,
      deadline_date: "2099-01-01",
    },
    {
      id: "offer-2",
      school_id: "school-2",
      offer_type: "partial",
      status: "pending",
      scholarship_amount: 10000,
      scholarship_percentage: 20,
      deadline_date: null,
    },
  ];

  it("marks the best offer with visible text, not color alone", () => {
    wrapper = mountModal(OfferComparison, { offers });

    const badges = wrapper.findAll('[data-testid="best-value-badge"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].text()).toContain("Best Value");

    const percentBadge = wrapper.find('[data-testid="highest-percentage-badge"]');
    expect(percentBadge.text()).toContain("Highest %");

    const urgentBadge = wrapper.find('[data-testid="most-urgent-badge"]');
    expect(urgentBadge.text()).toContain("Most Urgent");
  });
});
