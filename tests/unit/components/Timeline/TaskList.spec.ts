import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TaskList from "~/components/Timeline/TaskList.vue";
import type { TaskWithStatus } from "~/types/timeline";

const makeTask = (overrides: Partial<TaskWithStatus> = {}): TaskWithStatus => ({
  id: "task-1",
  category: "academic",
  grade_level: 10,
  title: "Test Task",
  description: null,
  required: false,
  dependency_task_ids: [],
  why_it_matters: null,
  failure_risk: null,
  division_applicability: ["ALL"],
  deadline_date: null,
  created_at: null,
  updated_at: null,
  athlete_task: undefined,
  has_incomplete_prerequisites: false,
  ...overrides,
});

const TaskItemStub = {
  name: "TaskItem",
  template: "<div data-testid='task-item-stub' />",
  props: ["task", "showCategory", "showStatus", "phaseProgress"],
  emits: ["toggle-complete", "complete-prerequisite"],
};

function mountTaskList(props: InstanceType<typeof TaskList>["$props"]) {
  return mount(TaskList, {
    props,
    global: {
      stubs: {
        TaskItem: TaskItemStub,
      },
    },
  });
}

describe("TaskList", () => {
  describe("empty state", () => {
    it("shows empty message when tasks=[] and showEmpty=true", () => {
      const wrapper = mountTaskList({ tasks: [], showEmpty: true });
      expect(wrapper.text()).toContain("No tasks available for this phase");
    });

    it("renders nothing visible when tasks=[] and showEmpty=false", () => {
      const wrapper = mountTaskList({ tasks: [], showEmpty: false });
      expect(wrapper.text()).not.toContain("No tasks available for this phase");
    });
  });

  describe("rendering tasks", () => {
    it("renders one TaskItem per task", () => {
      const tasks = [
        makeTask({ id: "t1", title: "A" }),
        makeTask({ id: "t2", title: "B" }),
        makeTask({ id: "t3", title: "C" }),
      ];
      const wrapper = mountTaskList({ tasks });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items).toHaveLength(3);
    });

    it("passes correct props to each TaskItem", () => {
      const task = makeTask({ id: "t1" });
      const wrapper = mountTaskList({
        tasks: [task],
        showCategory: false,
        showStatus: true,
        phaseProgress: 42,
      });
      const item = wrapper.findComponent(TaskItemStub);
      expect(item.props("task")).toEqual(task);
      expect(item.props("showCategory")).toBe(false);
      expect(item.props("showStatus")).toBe(true);
      expect(item.props("phaseProgress")).toBe(42);
    });
  });

  describe("category filtering", () => {
    it("shows only tasks matching filterCategory", () => {
      const tasks = [
        makeTask({ id: "t1", category: "academic", title: "A" }),
        makeTask({ id: "t2", category: "academic", title: "B" }),
        makeTask({ id: "t3", category: "recruiting", title: "C" }),
      ];
      const wrapper = mountTaskList({
        tasks,
        filterCategory: "academic",
      });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items).toHaveLength(2);
      expect(items[0].props("task").category).toBe("academic");
      expect(items[1].props("task").category).toBe("academic");
    });

    it("renders container div but no tasks and no empty message when all tasks filtered out", () => {
      const tasks = [
        makeTask({ id: "t1", category: "recruiting" }),
      ];
      const wrapper = mountTaskList({
        tasks,
        filterCategory: "academic",
      });
      // v-if checks tasks.length (unfiltered), not filtered length
      // so the else branch (container div) renders, but no TaskItems
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items).toHaveLength(0);
      expect(wrapper.text()).not.toContain("No tasks available for this phase");
    });
  });

  describe("status filtering", () => {
    it("shows only tasks matching filterStatus", () => {
      const tasks = [
        makeTask({
          id: "t1",
          title: "Done",
          athlete_task: {
            id: "at1",
            athlete_id: "a1",
            task_id: "t1",
            status: "completed",
            completed_at: null,
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
        makeTask({
          id: "t2",
          title: "In Progress",
          athlete_task: {
            id: "at2",
            athlete_id: "a1",
            task_id: "t2",
            status: "in_progress",
            completed_at: null,
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
        makeTask({
          id: "t3",
          title: "Also Done",
          athlete_task: {
            id: "at3",
            athlete_id: "a1",
            task_id: "t3",
            status: "completed",
            completed_at: null,
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
      ];
      const wrapper = mountTaskList({
        tasks,
        filterStatus: "completed",
      });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items).toHaveLength(2);
      items.forEach((item) => {
        expect(item.props("task").athlete_task.status).toBe("completed");
      });
    });

    it("excludes tasks without athlete_task when status filter is active", () => {
      const tasks = [
        makeTask({ id: "t1", athlete_task: undefined }),
        makeTask({
          id: "t2",
          athlete_task: {
            id: "at2",
            athlete_id: "a1",
            task_id: "t2",
            status: "completed",
            completed_at: null,
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
      ];
      const wrapper = mountTaskList({
        tasks,
        filterStatus: "completed",
      });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items).toHaveLength(1);
      expect(items[0].props("task").id).toBe("t2");
    });
  });

  describe("event bubbling", () => {
    it("emits task-toggle when TaskItem emits toggle-complete", async () => {
      const wrapper = mountTaskList({
        tasks: [makeTask({ id: "t1" })],
      });
      const item = wrapper.findComponent(TaskItemStub);
      await item.vm.$emit("toggle-complete", "t1");
      expect(wrapper.emitted("task-toggle")).toEqual([["t1"]]);
    });

    it("emits task-toggle when TaskItem emits complete-prerequisite", async () => {
      const wrapper = mountTaskList({
        tasks: [makeTask({ id: "t1" })],
      });
      const item = wrapper.findComponent(TaskItemStub);
      await item.vm.$emit("complete-prerequisite", "prereq-1");
      expect(wrapper.emitted("task-toggle")).toEqual([["prereq-1"]]);
    });
  });

  describe("sorting via compareTimelineTasks", () => {
    it("sorts completed tasks after incomplete", () => {
      const tasks = [
        makeTask({
          id: "completed",
          title: "AAA",
          athlete_task: {
            id: "at1",
            athlete_id: "a1",
            task_id: "completed",
            status: "completed",
            completed_at: null,
            is_recovery_task: false,
            created_at: null,
            updated_at: null,
          },
        }),
        makeTask({ id: "incomplete", title: "ZZZ" }),
      ];
      const wrapper = mountTaskList({ tasks });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items[0].props("task").id).toBe("incomplete");
      expect(items[1].props("task").id).toBe("completed");
    });

    it("sorts locked tasks after actionable", () => {
      const tasks = [
        makeTask({
          id: "locked",
          title: "AAA",
          has_incomplete_prerequisites: true,
        }),
        makeTask({
          id: "actionable",
          title: "ZZZ",
          has_incomplete_prerequisites: false,
        }),
      ];
      const wrapper = mountTaskList({ tasks });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items[0].props("task").id).toBe("actionable");
      expect(items[1].props("task").id).toBe("locked");
    });

    it("sorts required tasks before optional", () => {
      const tasks = [
        makeTask({ id: "optional", title: "AAA", required: false }),
        makeTask({ id: "required", title: "ZZZ", required: true }),
      ];
      const wrapper = mountTaskList({ tasks });
      const items = wrapper.findAllComponents(TaskItemStub);
      expect(items[0].props("task").id).toBe("required");
      expect(items[1].props("task").id).toBe("optional");
    });
  });
});
