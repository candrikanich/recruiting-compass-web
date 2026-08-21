import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolStatusStepper from "~/components/School/SchoolStatusStepper.vue";
import type { SchoolStatusValue } from "~/utils/schoolStatusOptions";

const mountStepper = (
  props: Partial<{ status: SchoolStatusValue; updating: boolean }> = {},
) =>
  mount(SchoolStatusStepper, {
    props: { status: "researching", ...props },
    global: { stubs: { UIcon: true } },
  });

const stepButtons = (wrapper: ReturnType<typeof mountStepper>) =>
  wrapper.findAll("ol button");

describe("SchoolStatusStepper", () => {
  it("renders exactly the 5 progress nodes (no not_pursuing node)", () => {
    const buttons = stepButtons(mountStepper());
    expect(buttons).toHaveLength(5);
    const labels = wrapperLabels(mountStepper());
    expect(labels).toEqual([
      "Researching",
      "Contacted",
      "Visiting",
      "Offer",
      "Committed",
    ]);
  });

  it("marks completed and current nodes for a mid-funnel status", () => {
    const buttons = stepButtons(mountStepper({ status: "visiting" }));
    // researching(0), contacted(1) completed; visiting(2) current; rest upcoming
    expect(buttons[0].attributes("aria-label")).toContain("(completed)");
    expect(buttons[1].attributes("aria-label")).toContain("(completed)");
    expect(buttons[2].attributes("aria-label")).toContain("(current stage)");
    expect(buttons[2].attributes("aria-current")).toBe("step");
    expect(buttons[3].attributes("aria-label")).toContain("(upcoming)");
    expect(buttons[4].attributes("aria-label")).toContain("(upcoming)");
  });

  it("emits select with the stage value on node click", async () => {
    const wrapper = mountStepper({ status: "researching" });
    await stepButtons(wrapper)[3].trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["offer_received"]);
  });

  it("shows Reactivate when not_pursuing and emits select('researching')", async () => {
    const wrapper = mountStepper({ status: "not_pursuing" });
    expect(wrapper.find("[data-testid='mark-not-pursuing']").exists()).toBe(
      false,
    );
    const reactivate = wrapper.find("[data-testid='reactivate-status']");
    expect(reactivate.exists()).toBe(true);
    expect(wrapper.text()).toContain("Not pursuing");
    await reactivate.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["researching"]);
  });

  it("emits select('not_pursuing') from the Mark-not-pursuing button", async () => {
    const wrapper = mountStepper({ status: "contacted" });
    const mark = wrapper.find("[data-testid='mark-not-pursuing']");
    expect(mark.exists()).toBe(true);
    await mark.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["not_pursuing"]);
  });

  it("disables all node buttons while updating", () => {
    const buttons = stepButtons(mountStepper({ updating: true }));
    expect(buttons.every((b) => b.attributes("disabled") !== undefined)).toBe(
      true,
    );
  });
});

const wrapperLabels = (wrapper: ReturnType<typeof mountStepper>): string[] =>
  wrapper.findAll("ol li span.text-center").map((s) => s.text());
