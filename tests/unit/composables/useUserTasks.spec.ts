import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserTasks } from "~/composables/useUserTasks";
import { useUserStore } from "~/stores/user";

const STORAGE_KEY = "user_tasks";
const USER_ID = "user-123";

const storageKeyFor = (id: string) => `${STORAGE_KEY}-${id}`;

describe("useUserTasks", () => {
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    userStore = useUserStore();
    userStore.user = {
      id: USER_ID,
      email: "test@example.com",
      name: "Test User",
    };
    vi.clearAllMocks();
  });

  const readStored = () => {
    const raw = localStorage.getItem(storageKeyFor(USER_ID));
    return raw ? JSON.parse(raw) : null;
  };

  describe("addTask (create)", () => {
    it("appends a new pending task and persists it to localStorage", async () => {
      const { addTask, tasks } = useUserTasks();

      const created = await addTask("Email Coach Smith");

      expect(created).toMatchObject({
        text: "Email Coach Smith",
        completed: false,
      });
      expect(created.id).toBeTruthy();
      expect(created.created_at).toBeTruthy();
      expect(tasks.value).toHaveLength(1);
      expect(tasks.value[0]).toEqual(created);

      expect(readStored()).toEqual([created]);
    });

    it("appends after existing tasks rather than overwriting them", async () => {
      const { addTask, tasks } = useUserTasks();

      await addTask("First");
      await addTask("Second");

      expect(tasks.value.map((t) => t.text)).toEqual(["First", "Second"]);
      expect(readStored()).toHaveLength(2);
    });

    it("does not persist when there is no signed-in user", async () => {
      userStore.user = null;
      const { addTask, tasks } = useUserTasks();

      await addTask("Ghost task");

      // Task is added to in-memory state, but saveTasks no-ops without a user.
      expect(tasks.value).toHaveLength(1);
      expect(readStored()).toBeNull();
    });
  });

  describe("fetchTasks (read)", () => {
    it("loads tasks previously persisted for the user", async () => {
      const stored = [
        {
          id: "task-1",
          text: "Existing",
          completed: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      localStorage.setItem(storageKeyFor(USER_ID), JSON.stringify(stored));

      const { fetchTasks, tasks } = useUserTasks();
      await fetchTasks();

      expect(tasks.value).toEqual(stored);
    });

    it("yields an empty list when nothing is stored", async () => {
      const { fetchTasks, tasks } = useUserTasks();
      await fetchTasks();

      expect(tasks.value).toEqual([]);
    });

    it("is a no-op without a signed-in user", async () => {
      userStore.user = null;
      const { fetchTasks, tasks, loading } = useUserTasks();

      await fetchTasks();

      expect(tasks.value).toEqual([]);
      expect(loading.value).toBe(false);
    });

    it("recovers to an empty list when stored JSON is corrupt", async () => {
      localStorage.setItem(storageKeyFor(USER_ID), "{not-json");

      const { fetchTasks, tasks, loading } = useUserTasks();
      await fetchTasks();

      expect(tasks.value).toEqual([]);
      expect(loading.value).toBe(false);
    });

    it("scopes storage per user id", async () => {
      localStorage.setItem(
        storageKeyFor("other-user"),
        JSON.stringify([
          { id: "x", text: "Not mine", completed: false, created_at: "" },
        ]),
      );

      const { fetchTasks, tasks } = useUserTasks();
      await fetchTasks();

      expect(tasks.value).toEqual([]);
    });
  });

  describe("updateTask + toggleTask (update)", () => {
    it("updates task text and persists the change", async () => {
      const { addTask, updateTask, tasks } = useUserTasks();
      const created = await addTask("Original");

      await updateTask(created.id, "Revised");

      expect(tasks.value[0].text).toBe("Revised");
      expect(readStored()[0].text).toBe("Revised");
    });

    it("ignores updates to an unknown task id", async () => {
      const { addTask, updateTask, tasks } = useUserTasks();
      await addTask("Keep me");

      await updateTask("missing-id", "Nope");

      expect(tasks.value[0].text).toBe("Keep me");
    });

    it("toggles completion on and stamps completed_at", async () => {
      const { addTask, toggleTask, tasks } = useUserTasks();
      const created = await addTask("Do the thing");

      await toggleTask(created.id);

      expect(tasks.value[0].completed).toBe(true);
      expect(tasks.value[0].completed_at).toBeTruthy();
      expect(readStored()[0].completed).toBe(true);
    });

    it("toggles completion back off and clears completed_at", async () => {
      const { addTask, toggleTask, tasks } = useUserTasks();
      const created = await addTask("Do the thing");

      await toggleTask(created.id);
      await toggleTask(created.id);

      expect(tasks.value[0].completed).toBe(false);
      expect(tasks.value[0].completed_at).toBeNull();
    });
  });

  describe("deleteTask + clearCompleted (delete)", () => {
    it("removes a task and persists the removal", async () => {
      const { addTask, deleteTask, tasks } = useUserTasks();
      const a = await addTask("A");
      const b = await addTask("B");

      await deleteTask(a.id);

      expect(tasks.value).toEqual([b]);
      expect(readStored()).toEqual([b]);
    });

    it("is a no-op when deleting an unknown task id", async () => {
      const { addTask, deleteTask, tasks } = useUserTasks();
      await addTask("Only one");

      await deleteTask("missing-id");

      expect(tasks.value).toHaveLength(1);
    });

    it("clearCompleted removes only completed tasks", async () => {
      const { addTask, toggleTask, clearCompleted, tasks } = useUserTasks();
      const done = await addTask("Done");
      await addTask("Pending");
      await toggleTask(done.id);

      await clearCompleted();

      expect(tasks.value.map((t) => t.text)).toEqual(["Pending"]);
      expect(readStored().map((t: { text: string }) => t.text)).toEqual([
        "Pending",
      ]);
    });
  });

  describe("computed counts", () => {
    it("reports pending, completed, and total counts", async () => {
      const { addTask, toggleTask, taskCount, pendingCount, completedCount } =
        useUserTasks();
      const first = await addTask("One");
      await addTask("Two");
      await addTask("Three");
      await toggleTask(first.id);

      expect(taskCount.value).toBe(3);
      expect(completedCount.value).toBe(1);
      expect(pendingCount.value).toBe(2);
    });
  });
});
