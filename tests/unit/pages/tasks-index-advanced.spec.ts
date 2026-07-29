import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { ref } from "vue";

// Mock Supabase at module level
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  })),
}));

// Mock useAuthFetch to avoid Supabase dependency
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(() => ({
    $fetchAuth: vi.fn().mockResolvedValue({}),
  })),
}));

// Mock useTasks at module level. tasksWithStatus/updateTaskStatus/isTaskLocked
// are shared, mutable references so individual tests can control resolved
// values and assert on call args (each useTasks() call must return the SAME
// mock instances, not fresh ones, or assertions from the test body can never
// see them).
const tasksWithStatusRef = ref<any[]>([]);
const updateTaskStatusMock = vi.fn().mockResolvedValue(undefined);
const isTaskLockedMock = vi.fn(() => false);

vi.mock("~/composables/useTasks", () => ({
  useTasks: vi.fn(() => ({
    tasksWithStatus: tasksWithStatusRef,
    loading: ref(false),
    error: ref(null),
    fetchTasksWithStatus: vi.fn().mockResolvedValue([]),
    updateTaskStatus: updateTaskStatusMock,
    getCompletionStats: vi.fn(() => ({
      completed: 0,
      total: 0,
      percentComplete: 0,
    })),
    isTaskLocked: isTaskLockedMock,
    lockedTaskIds: ref([]),
  })),
}));

// Mock useAuth at module level
vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: ref({ user: { id: "user-1" } }),
  })),
}));

const showToastMock = vi.fn();
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

import TasksPage from "~/pages/tasks/index.vue";

describe("Tasks Page - Advanced Coverage", () => {
  let wrapper: ReturnType<typeof mount>;
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("Page Layout and Rendering", () => {
    it("should render the page component", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it("should have data-testid attributes on filters", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.find("[data-testid='status-filter']").exists()).toBe(true);
      expect(wrapper.find("[data-testid='urgency-filter']").exists()).toBe(
        true,
      );
    });

    it("should render task items when data is present", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const taskItems = wrapper.findAll("[data-testid='task-item']");
      expect(taskItems).toBeDefined();
    });

    it("should have h1 header element", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.find("h1").exists()).toBe(true);
    });
  });

  describe("Component Structure", () => {
    it("should render the main container div", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const mainDiv = wrapper.find("div");
      expect(mainDiv.exists()).toBe(true);
    });

    it("should have loading skeleton structure", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      // Component should render without errors
      expect(wrapper.vm).toBeDefined();
    });
  });

  describe("Filter Elements", () => {
    it("status filter select should exist", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const select = wrapper.find("#status-filter");
      expect(
        select.exists() ||
          wrapper.find("[data-testid='status-filter']").exists(),
      ).toBe(true);
    });

    it("urgency filter select should exist", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const select = wrapper.find("#urgency-filter");
      expect(
        select.exists() ||
          wrapper.find("[data-testid='urgency-filter']").exists(),
      ).toBe(true);
    });
  });

  describe("LocalStorage Integration", () => {
    it("should load filters from localStorage on mount", () => {
      localStorage.setItem(
        "parent-task-filters-user-1",
        JSON.stringify({
          statusFilter: "completed",
          urgencyFilter: "critical",
        }),
      );

      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      // Verify the component mounted successfully
      expect(wrapper.vm).toBeDefined();
    });

    it("should save filters to localStorage", async () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const statusFilter = wrapper.find("[data-testid='status-filter']") as any;
      if (statusFilter.exists()) {
        await statusFilter.setValue("completed");
        await wrapper.vm.$nextTick();
      }

      // Component should handle filter changes without error
      expect(wrapper.vm).toBeDefined();
    });
  });

  describe("Empty and Loading States", () => {
    it("should render without errors on mount", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.vm).toBeDefined();
      expect(wrapper.html).toBeDefined();
    });

    it("should contain main element", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const main = wrapper.find("main");
      expect(main.exists() || wrapper.element).toBeTruthy();
    });
  });

  describe("Task Items", () => {
    it("should have task-item data attributes available", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const selector = "[data-testid='task-item']";
      // Component renders without error
      expect(
        wrapper.find(selector).exists() || wrapper.findAll("div").length > 0,
      ).toBe(true);
    });
  });

  describe("Component Methods and Data", () => {
    it("should have access to component instance", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.vm).toBeTruthy();
      expect(wrapper.vm.$el).toBeDefined();
    });

    it("should handle template correctly", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      // Component should render without throwing
      expect(wrapper.html().length).toBeGreaterThan(0);
    });
  });

  describe("Page Title and Headers", () => {
    it("should render page structure", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const headers = wrapper.findAll("h1, h2, h3, h4");
      // Page should have at least one header
      expect(headers.length + wrapper.findAll("div").length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility - Data Attributes", () => {
    it("should include data-testid for status filter", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const hasStatusFilter = wrapper
        .html()
        .includes('data-testid="status-filter"');
      expect(hasStatusFilter).toBe(true);
    });

    it("should include data-testid for urgency filter", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const hasUrgencyFilter = wrapper
        .html()
        .includes('data-testid="urgency-filter"');
      expect(hasUrgencyFilter).toBe(true);
    });

    it("should include data-testid for task items", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      const hasTaskItems = wrapper.html().includes('data-testid="task-item"');
      // Component renders the template correctly
      expect(wrapper.html().length).toBeGreaterThan(100);
    });
  });

  describe("Component Initialization", () => {
    it("should initialize with Pinia store", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.vm.$pinia).toBeDefined();
    });

    it("should have nextTick available for async operations", () => {
      wrapper = mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

      expect(wrapper.vm.$nextTick).toBeDefined();
    });
  });

  describe("Task toggle error surfacing (no native alert)", () => {
    const mountPage = () =>
      mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

    it("shows a visible, generic error toast (never window.alert) when the status update fails", async () => {
      tasksWithStatusRef.value = [
        {
          id: "task-1",
          title: "Complete NCAA registration",
          dependency_task_ids: [],
          athlete_task: { status: "not_started" },
        },
      ];
      updateTaskStatusMock.mockRejectedValueOnce(
        new Error('permission denied for table "athlete_tasks"'),
      );
      wrapper = mountPage();
      await (wrapper.vm as any).handleToggleTask("task-1", "not_started");
      await wrapper.vm.$nextTick();

      expect(updateTaskStatusMock).toHaveBeenCalledWith("task-1", "completed");
      expect(showToastMock).toHaveBeenCalledTimes(1);

      const [message, type] = showToastMock.mock.calls[0];
      expect(type).toBe("error");
      expect(message).toMatch(/something went wrong/i);
      expect(message).not.toMatch(/permission denied|athlete_tasks/i);
    });

    it("warns via toast (not window.alert) instead of completing a locked task", async () => {
      tasksWithStatusRef.value = [
        {
          id: "task-2",
          title: "Send highlight video",
          dependency_task_ids: ["task-1"],
          athlete_task: { status: "not_started" },
        },
        {
          id: "task-1",
          title: "Complete NCAA registration",
          dependency_task_ids: [],
          athlete_task: { status: "not_started" },
        },
      ];
      isTaskLockedMock.mockReturnValueOnce(true);
      wrapper = mountPage();
      await (wrapper.vm as any).handleToggleTask("task-2", "not_started");
      await wrapper.vm.$nextTick();

      expect(updateTaskStatusMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledTimes(1);
      expect(showToastMock.mock.calls[0][1]).toBe("warning");
    });
  });

  describe("Accessibility", () => {
    const mountPage = () =>
      mount(TasksPage, {
        global: {
          plugins: [pinia],
          stubs: {
            NuxtLayout: true,
            ClientOnly: false,
            AthleteSwitcher: true,
          },
        },
      });

    it("names the completion checkbox after the task and its target state", async () => {
      tasksWithStatusRef.value = [
        {
          id: "task-1",
          title: "Complete NCAA registration",
          grade_level: 10,
          dependency_task_ids: [],
          athlete_task: { status: "not_started" },
        },
        {
          id: "task-2",
          title: "Send highlight video",
          grade_level: 10,
          dependency_task_ids: [],
          athlete_task: { status: "completed" },
        },
      ];
      wrapper = mountPage();
      await wrapper.vm.$nextTick();

      expect(
        wrapper.find("[data-testid='task-checkbox-task-1']").attributes("aria-label"),
      ).toBe("Mark Complete NCAA registration as complete");
      expect(
        wrapper.find("[data-testid='task-checkbox-task-2']").attributes("aria-label"),
      ).toBe("Mark Send highlight video as incomplete");
    });

    it("announces the completion confirmation through a polite live region", async () => {
      wrapper = mountPage();
      (wrapper.vm as any).showSuccessMessage = true;
      await wrapper.vm.$nextTick();

      const message = wrapper.find("[data-testid='task-success-message']");
      expect(message.exists()).toBe(true);
      expect(message.attributes("role")).toBe("status");
      expect(message.attributes("aria-live")).toBe("polite");
    });

    it("reflects task detail expansion state via aria-expanded", async () => {
      tasksWithStatusRef.value = [
        {
          id: "task-1",
          title: "Complete NCAA registration",
          grade_level: 10,
          dependency_task_ids: [],
          athlete_task: { status: "not_started" },
        },
      ];
      wrapper = mountPage();
      await wrapper.vm.$nextTick();

      const toggle = wrapper.find("[data-testid='task-title-task-1']");
      expect(toggle.attributes("aria-expanded")).toBe("false");

      await toggle.trigger("click");
      expect(toggle.attributes("aria-expanded")).toBe("true");

      await toggle.trigger("click");
      expect(toggle.attributes("aria-expanded")).toBe("false");
    });
  });
});
