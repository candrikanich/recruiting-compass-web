import { useAuthFetch } from "./useAuthFetch";

/** Pre-send guardrail signals + send logging for coach outreach (Phase 4). */
export interface SendCheckResult {
  /** Program note already sent to a different program (rule #6) — blocking. */
  programNoteReused: boolean;
  daysSinceLastContact: number | null;
  /** Last message to this program < 7 days ago — warn. */
  recentContact: boolean;
  /** Total prior messages to this program — warn on repeated nudging. */
  messageCountToSchool: number;
}

export interface LogMessageInput {
  athleteUserId: string;
  schoolId?: string | null;
  coachId?: string | null;
  templateSlug?: string | null;
  channel?: string | null;
  programNote?: string | null;
  updateHook?: string | null;
  subject?: string | null;
  body?: string | null;
}

export const useAthleteMessages = (): {
  checkSend: (input: {
    athleteUserId: string;
    schoolId?: string | null;
    programNote?: string | null;
  }) => Promise<SendCheckResult>;
  logSend: (input: LogMessageInput) => Promise<{ success: boolean; id: string }>;
} => {
  const { $fetchAuth } = useAuthFetch();

  const checkSend = (input: {
    athleteUserId: string;
    schoolId?: string | null;
    programNote?: string | null;
  }): Promise<SendCheckResult> =>
    $fetchAuth<SendCheckResult>("/api/athlete/messages/check", {
      method: "POST",
      body: input,
    });

  const logSend = (input: LogMessageInput): Promise<{ success: boolean; id: string }> =>
    $fetchAuth<{ success: boolean; id: string }>("/api/athlete/messages", {
      method: "POST",
      body: input,
    });

  return { checkSend, logSend };
};
