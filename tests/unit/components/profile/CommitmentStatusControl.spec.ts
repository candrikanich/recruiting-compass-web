import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CommitmentStatusControl from "../../../../components/profile/setup/CommitmentStatusControl.vue";

describe("CommitmentStatusControl", () => {
  it("emits status and reveals school select only when committed", async () => {
    const w = mount(CommitmentStatusControl, {
      props: { status: "uncommitted", committedSchoolId: null, schools: [{ id: "s1", name: "Ohio State" }] } as never,
    });
    expect(w.find("[data-test='committed-school']").exists()).toBe(false);
    await w.find("[data-test='status-select']").setValue("committed");
    expect(w.emitted("update:status")?.at(-1)?.[0]).toBe("committed");
    await w.setProps({ status: "committed" } as never);
    expect(w.find("[data-test='committed-school']").exists()).toBe(true);
  });
});
