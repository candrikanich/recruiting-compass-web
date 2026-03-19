import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useCommunicationModal } from "~/composables/useCommunicationModal";

const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
const mockOpenCommunication = vi.fn();
const mockHandleInteractionLogged = vi.fn();

// showPanel needs to be a shared ref so the watcher fires when we mutate it
const showPanel = ref(false);
const communicationType = ref<string | null>(null);

vi.mock("~/composables/useCommunication", () => ({
  useCommunication: () => ({
    showPanel,
    communicationType,
    openCommunication: mockOpenCommunication,
    handleInteractionLogged: mockHandleInteractionLogged,
  }),
}));

vi.mock("~/composables/useFocusTrap", () => ({
  useFocusTrap: () => ({
    activate: mockActivate,
    deactivate: mockDeactivate,
  }),
}));

describe("useCommunicationModal", () => {
  let composable: ReturnType<typeof useCommunicationModal>;

  beforeEach(() => {
    vi.clearAllMocks();
    showPanel.value = false;
    communicationType.value = null;
    composable = useCommunicationModal();
  });

  // ---- initial state ----
  it("initializes with showPanel false", () => {
    expect(composable.showPanel.value).toBe(false);
  });

  it("initializes with dialogRef null", () => {
    expect(composable.dialogRef.value).toBeNull();
  });

  // ---- handleClose ----
  describe("handleClose", () => {
    it("calls deactivate and sets showPanel to false", () => {
      showPanel.value = true;
      composable.handleClose();
      expect(mockDeactivate).toHaveBeenCalled();
      expect(composable.showPanel.value).toBe(false);
    });

    it("deactivates even when panel was already closed", () => {
      showPanel.value = false;
      composable.handleClose();
      expect(mockDeactivate).toHaveBeenCalled();
    });
  });

  // ---- openCommunication ----
  it("exposes openCommunication as callable", () => {
    expect(typeof composable.openCommunication).toBe("function");
    composable.openCommunication("email" as never, {} as never);
    expect(mockOpenCommunication).toHaveBeenCalledWith("email", {});
  });

  // ---- watch: showPanel → true triggers activate ----
  describe("watcher", () => {
    it("calls activate after nextTick when showPanel becomes true", async () => {
      showPanel.value = true;
      await nextTick();
      await nextTick(); // second tick needed because watch handler itself awaits nextTick
      expect(mockActivate).toHaveBeenCalled();
    });

    it("calls deactivate when showPanel becomes false (after being true)", async () => {
      // Become true first so there's a transition
      showPanel.value = true;
      await nextTick();
      await nextTick();
      vi.clearAllMocks();

      showPanel.value = false;
      await nextTick();
      expect(mockDeactivate).toHaveBeenCalled();
    });
  });
});
