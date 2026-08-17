import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import AdminTools from "~/pages/admin/tools.vue";

describe("Admin Tools (tools.vue)", () => {
  it("shows Invite admin and Batch fetch logos links", () => {
    const wrapper = mount(AdminTools, {
      global: {
        plugins: [createPinia()],
        stubs: {
          NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
        },
      },
    });

    expect(wrapper.text()).toContain("Invite admin user");
    expect(wrapper.text()).toContain("Batch fetch school logos");
  });
});
