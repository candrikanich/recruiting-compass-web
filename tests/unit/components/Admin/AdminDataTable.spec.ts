import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminDataTable from "~/components/admin/AdminDataTable.vue";

const columns = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
];

describe("AdminDataTable", () => {
  it("renders headers and rows", () => {
    const w = mount(AdminDataTable, {
      props: { columns, rows: [{ name: "Ann", age: 3 }] },
      global: {
        stubs: {
          DesignSystemEmptyState: true,
          DesignSystemLoadingState: true,
          DesignSystemErrorState: true,
        },
      },
    });
    expect(w.text()).toContain("Name");
    expect(w.text()).toContain("Ann");
  });

  it("shows empty state when no rows", () => {
    const w = mount(AdminDataTable, {
      props: { columns, rows: [] },
      global: {
        stubs: {
          DesignSystemEmptyState: { template: "<div>EMPTY</div>" },
          DesignSystemLoadingState: true,
          DesignSystemErrorState: true,
        },
      },
    });
    expect(w.text()).toContain("EMPTY");
  });

  it("shows loading state", () => {
    const w = mount(AdminDataTable, {
      props: { columns, rows: [], loading: true },
      global: {
        stubs: {
          DesignSystemEmptyState: true,
          DesignSystemLoadingState: { template: "<div>LOADING</div>" },
          DesignSystemErrorState: true,
        },
      },
    });
    expect(w.text()).toContain("LOADING");
  });

  it("shows error state", () => {
    const w = mount(AdminDataTable, {
      props: { columns, rows: [], error: "Boom" },
      global: {
        stubs: {
          DesignSystemEmptyState: true,
          DesignSystemLoadingState: true,
          DesignSystemErrorState: { template: "<div>ERROR</div>" },
        },
      },
    });
    expect(w.text()).toContain("ERROR");
  });

  it("supports named cell slots", () => {
    const w = mount(AdminDataTable, {
      props: { columns, rows: [{ name: "Ann", age: 3 }] },
      slots: {
        "cell-name": (scope: { value: unknown }) => `Custom: ${scope.value}`,
      },
      global: {
        stubs: {
          DesignSystemEmptyState: true,
          DesignSystemLoadingState: true,
          DesignSystemErrorState: true,
        },
      },
    });
    expect(w.text()).toContain("Custom: Ann");
  });
});
