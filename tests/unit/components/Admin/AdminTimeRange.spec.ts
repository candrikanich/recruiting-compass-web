import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminTimeRange from "~/components/admin/AdminTimeRange.vue";

describe("AdminTimeRange", () => {
  it("emits the selected range on click", async () => {
    const w = mount(AdminTimeRange, { props: { modelValue: { days: 7 } } });
    await w.get("[data-days='30']").trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual([{ days: 30 }]);
  });
});
