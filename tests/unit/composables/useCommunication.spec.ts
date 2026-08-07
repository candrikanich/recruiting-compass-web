import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommunication } from "~/composables/useCommunication";
import { useInteractions } from "~/composables/useInteractions";
import { useCoaches } from "~/composables/useCoaches";
import { useAppToast } from "~/composables/useAppToast";
import { useUserStore } from "~/stores/user";
import type { Coach } from "~/types/models";
import type { ToastAction } from "~/types/toast";

vi.mock("~/composables/useInteractions");
vi.mock("~/composables/useCoaches");
vi.mock("~/composables/useAppToast");
vi.mock("~/stores/user");

const createInteraction = vi.fn();
const deleteInteraction = vi.fn();
const updateCoach = vi.fn();
const showToast = vi.fn();

const coach: Coach = {
  id: "coach-1",
  school_id: "school-1",
  role: "head",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@school.edu",
  phone: null,
  twitter_handle: null,
  instagram_handle: null,
  notes: null,
  last_contact_date: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  createInteraction.mockResolvedValue({ id: "interaction-1" });
  deleteInteraction.mockResolvedValue(undefined);
  updateCoach.mockResolvedValue(undefined);

  vi.mocked(useInteractions).mockReturnValue({
    createInteraction,
    deleteInteraction,
  } as unknown as ReturnType<typeof useInteractions>);
  vi.mocked(useCoaches).mockReturnValue({
    updateCoach,
  } as unknown as ReturnType<typeof useCoaches>);
  vi.mocked(useAppToast).mockReturnValue({
    showToast,
  } as unknown as ReturnType<typeof useAppToast>);
  vi.mocked(useUserStore).mockReturnValue({
    user: { id: "user-1" },
  } as unknown as ReturnType<typeof useUserStore>);
});

const logAndGetUndo = async (): Promise<ToastAction> => {
  const comm = useCommunication();
  comm.openCommunication(coach, "email");
  await comm.handleInteractionLogged({ type: "email", subject: "Hi" });

  const undoCall = showToast.mock.calls.find(
    (c) => (c[3] as ToastAction | undefined)?.label === "Undo",
  );
  expect(undoCall).toBeDefined();
  return undoCall![3] as ToastAction;
};

describe("useCommunication — optimistic send-log with undo", () => {
  it("logs the interaction and shows an Undo toast", async () => {
    await logAndGetUndo();

    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: "coach-1", direction: "outbound" }),
    );
    expect(updateCoach).toHaveBeenCalledWith("coach-1", {
      last_contact_date: expect.any(String),
    });
    expect(showToast).toHaveBeenCalledWith(
      "Logged outreach to Coach Jane Doe.",
      "success",
      8000,
      expect.objectContaining({ label: "Undo" }),
    );
  });

  it("undo deletes the created interaction and restores prior contact date", async () => {
    const undo = await logAndGetUndo();
    updateCoach.mockClear();

    await undo.handler();

    expect(deleteInteraction).toHaveBeenCalledWith("interaction-1");
    expect(updateCoach).toHaveBeenCalledWith("coach-1", {
      last_contact_date: "2026-01-01T00:00:00.000Z",
    });
  });

  it("undo surfaces an error toast when the delete fails", async () => {
    const undo = await logAndGetUndo();
    deleteInteraction.mockRejectedValueOnce(new Error("nope"));

    await undo.handler();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Couldn't undo"),
      "error",
    );
  });
});
