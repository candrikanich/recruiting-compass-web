import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuickTasksWidget from "~/components/Dashboard/QuickTasksWidget.vue";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substring(2, 9)}`,
  text: "Test task",
  completed: false,
  ...overrides,
});

const mountWidget = (props: { tasks?: Task[]; showTasks?: boolean } = {}) =>
  mount(QuickTasksWidget, {
    props: {
      tasks: props.tasks ?? [],
      showTasks: props.showTasks ?? true,
    },
  });

describe("QuickTasksWidget", () => {
  describe("rendering", () => {
    it("renders widget with title when showTasks is true", () => {
      const wrapper = mountWidget();
      expect(wrapper.text()).toContain("Quick Tasks");
    });

    it("does not render when showTasks is false", () => {
      const wrapper = mountWidget({ showTasks: false });
      expect(wrapper.text()).toBe("");
    });

    it("renders empty state when no tasks exist", () => {
      const wrapper = mountWidget({ tasks: [] });
      expect(wrapper.text()).toContain("No tasks yet");
      expect(wrapper.text()).toContain('Click "Add Task" to get started');
    });

    it("renders task list when tasks exist", () => {
      const tasks = [
        createTask({ id: "t-1", text: "Send email to coach" }),
        createTask({ id: "t-2", text: "Update transcript" }),
      ];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).toContain("Send email to coach");
      expect(wrapper.text()).toContain("Update transcript");
    });

    it("shows pending count badge when pending tasks exist", () => {
      const tasks = [
        createTask({ completed: false }),
        createTask({ completed: false }),
        createTask({ completed: true }),
      ];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).toContain("2 pending");
    });

    it("hides pending count badge when all tasks are completed", () => {
      const tasks = [
        createTask({ completed: true }),
        createTask({ completed: true }),
      ];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).not.toContain("pending");
    });
  });

  describe("computed counts", () => {
    it("calculates pending count correctly", () => {
      const tasks = [
        createTask({ completed: false }),
        createTask({ completed: true }),
        createTask({ completed: false }),
        createTask({ completed: true }),
      ];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).toContain("2 pending");
    });

    it("shows clear completed button with correct count", () => {
      const tasks = [
        createTask({ completed: true }),
        createTask({ completed: true }),
        createTask({ completed: true }),
        createTask({ completed: false }),
      ];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).toContain("Clear 3 completed");
    });

    it("hides clear completed button when no tasks are completed", () => {
      const tasks = [createTask({ completed: false })];
      const wrapper = mountWidget({ tasks });

      expect(wrapper.text()).not.toContain("Clear");
    });
  });

  describe("form visibility toggle", () => {
    it("does not show task form by default", () => {
      const wrapper = mountWidget();
      const input = wrapper.find('input[placeholder="Enter task..."]');

      expect(input.exists()).toBe(false);
    });

    it("shows task form after clicking Add Task button", async () => {
      const wrapper = mountWidget();
      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");

      const input = wrapper.find('input[placeholder="Enter task..."]');
      expect(input.exists()).toBe(true);
    });

    it("hides task form after clicking cancel button", async () => {
      const wrapper = mountWidget();

      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");
      expect(wrapper.find('input[placeholder="Enter task..."]').exists()).toBe(
        true,
      );

      const cancelButtons = wrapper.findAll("button");
      const cancelButton = cancelButtons.find((b) => {
        const svg = b.find("svg");
        return (
          svg.exists() && b.classes().some((c) => c.includes("text-slate-500"))
        );
      });
      if (cancelButton) {
        await cancelButton.trigger("click");
      }

      expect(wrapper.find('input[placeholder="Enter task..."]').exists()).toBe(
        false,
      );
    });
  });

  describe("event emissions", () => {
    it("emits add-task with text when submitting via button", async () => {
      const wrapper = mountWidget();

      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");

      const input = wrapper.find('input[placeholder="Enter task..."]');
      await input.setValue("New important task");

      const submitButtons = wrapper.findAll("button");
      const submitButton = submitButtons.find((b) => {
        return b.classes().some((c) => c.includes("text-blue-600"));
      });
      await submitButton!.trigger("click");

      expect(wrapper.emitted("add-task")).toBeTruthy();
      expect(wrapper.emitted("add-task")![0]).toEqual(["New important task"]);
    });

    it("emits add-task when pressing Enter key", async () => {
      const wrapper = mountWidget();

      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");

      const input = wrapper.find('input[placeholder="Enter task..."]');
      await input.setValue("Enter key task");
      await input.trigger("keyup.enter");

      expect(wrapper.emitted("add-task")).toBeTruthy();
      expect(wrapper.emitted("add-task")![0]).toEqual(["Enter key task"]);
    });

    it("does not emit add-task for empty or whitespace-only input", async () => {
      const wrapper = mountWidget();

      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");

      const input = wrapper.find('input[placeholder="Enter task..."]');
      await input.setValue("   ");
      await input.trigger("keyup.enter");

      expect(wrapper.emitted("add-task")).toBeFalsy();
    });

    it("emits toggle-task with task id when clicking checkbox", async () => {
      const tasks = [createTask({ id: "task-42", text: "Toggle me" })];
      const wrapper = mountWidget({ tasks });

      const checkboxButton = wrapper
        .findAll("button")
        .find((b) => b.classes().some((c) => c.includes("rounded-md")));
      await checkboxButton!.trigger("click");

      expect(wrapper.emitted("toggle-task")).toBeTruthy();
      expect(wrapper.emitted("toggle-task")![0]).toEqual(["task-42"]);
    });

    it("emits delete-task with task id when clicking delete button", async () => {
      const tasks = [createTask({ id: "task-99", text: "Delete me" })];
      const wrapper = mountWidget({ tasks });

      const deleteButton = wrapper
        .findAll("button")
        .find((b) => b.classes().some((c) => c.includes("text-red-500")));
      await deleteButton!.trigger("click");

      expect(wrapper.emitted("delete-task")).toBeTruthy();
      expect(wrapper.emitted("delete-task")![0]).toEqual(["task-99"]);
    });

    it("emits clear-completed when clicking clear button", async () => {
      const tasks = [createTask({ completed: true })];
      const wrapper = mountWidget({ tasks });

      const clearButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Clear"));
      await clearButton!.trigger("click");

      expect(wrapper.emitted("clear-completed")).toBeTruthy();
    });

    it("clears input and hides form after successful task addition", async () => {
      const wrapper = mountWidget();

      const addButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Add Task"));
      await addButton!.trigger("click");

      const input = wrapper.find('input[placeholder="Enter task..."]');
      await input.setValue("Quick task");
      await input.trigger("keyup.enter");

      expect(wrapper.find('input[placeholder="Enter task..."]').exists()).toBe(
        false,
      );
    });
  });
});
