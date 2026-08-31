import type { ProfileSectionKey } from "~/types/models";

/**
 * Single registration point for public-profile sections: label + description
 * shown in the owner-facing section-config editor. A future section (e.g.
 * `social`, `recruiting_services`) is NOT registered here — those render as
 * inline elements, not reorderable/hideable sections (see Tasks 5A/5B).
 */
export const SECTION_META: Record<
  ProfileSectionKey,
  { label: string; description: string }
> = {
  metrics: {
    label: "Athletic Metrics",
    description:
      "Verified performance numbers — exit velocity, 60-yard dash, and more.",
  },
  film: {
    label: "Featured Videos & Highlights",
    description: "Highlight reels and game film links.",
  },
  academics: {
    label: "Academic Profile",
    description: "GPA, test scores, intended major, and course history.",
  },
  values: {
    label: "Target Program & Values",
    description: "What matters most in a program fit.",
  },
  team_history: {
    label: "Team History & Coaching References",
    description: "Travel teams, seasons, and coach contacts.",
  },
  awards: {
    label: "Honors & Awards",
    description: "All-conference, all-state, and other recognitions.",
  },
};
