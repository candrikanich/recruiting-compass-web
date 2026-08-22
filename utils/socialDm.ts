/**
 * Payload for logging a social-DM outreach to a coach (Instagram/Twitter open).
 * Best-effort: the app can't confirm a DM was actually sent — logged on click,
 * mirroring the iOS "DM on Instagram" behavior. Both networks log as `dm`.
 */
export function socialDmInteraction(coach: {
  id: string;
  school_id?: string | null;
}): {
  school_id?: string;
  coach_id: string;
  type: "dm";
  direction: "outbound";
} {
  return {
    school_id: coach.school_id ?? undefined,
    coach_id: coach.id,
    type: "dm",
    direction: "outbound",
  };
}
