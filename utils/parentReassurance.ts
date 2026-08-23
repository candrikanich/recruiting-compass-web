import type { Phase } from "~/types/timeline";

export interface ReassuranceMessage {
  id: string;
  title: string;
  message: string;
  phases: Phase[];
  icon: string;
}

const REASSURANCE_MESSAGES: ReassuranceMessage[] = [
  {
    id: "freshman-foundation",
    title: "Freshman Year is About Foundation",
    message:
      "Your athlete doesn't need scholarship offers in 9th grade. This is the time to develop skills, build confidence, and enjoy the game. Recruiting will catch up naturally.",
    phases: ["freshman"],
    icon: "🏗️",
  },
  {
    id: "sophomore-normal-timeline",
    title: "Normal Recruiting Timing",
    message:
      "Most athletes see serious recruiting activity start in junior year. If your athlete hasn't heard from coaches yet, they're right on schedule. This is completely normal.",
    phases: ["sophomore"],
    icon: "📅",
  },
  {
    id: "junior-late-bloomers",
    title: "Late Bloomers Are Very Common",
    message:
      "Athletes develop at different rates. Many elite players weren't heavily recruited until late junior or even senior year. Your athlete still has plenty of time.",
    phases: ["junior"],
    icon: "🌱",
  },
  {
    id: "junior-silence-ok",
    title: "Silence From Coaches is Normal",
    message:
      "Coaches evaluate during specific periods and manage many recruits. A quiet month doesn't mean lack of interest. Stay engaged and keep communicating.",
    phases: ["junior"],
    icon: "🤐",
  },
  {
    id: "senior-late-offers",
    title: "Many Offers Come Senior Year",
    message:
      "Senior year offers are common. Some programs actively recruit into the spring. If your athlete hasn't committed yet, opportunities still exist at all levels.",
    phases: ["senior"],
    icon: "✉️",
  },
  {
    id: "senior-walkon-path",
    title: "Walk-On is a Legitimate Path",
    message:
      "Walk-ons become key contributors and future pros. It's a valid way to play in college, even at top programs. Don't view it as a fallback.",
    phases: ["senior"],
    icon: "🚪",
  },
  {
    id: "all-social-media-lie",
    title: "Social Media Isn't the Full Picture",
    message:
      "Recruiting highlight reels show the exceptions, not the norm. Most athletes have quiet recruiting processes. Your athlete's journey is unique and valid.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    icon: "📱",
  },
  {
    id: "all-divisions-excellent",
    title: "All Divisions Are Excellent Options",
    message:
      "D1, D2, D3, NAIA, and JUCO all offer great opportunities. Fit matters more than prestige. A smaller program with better academics might be perfect for your athlete.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    icon: "🎓",
  },
];

export function getReassuranceMessages(phase: Phase): ReassuranceMessage[] {
  return REASSURANCE_MESSAGES.filter((msg) => msg.phases.includes(phase));
}

export function getReassuranceMessageById(
  id: string,
): ReassuranceMessage | undefined {
  return REASSURANCE_MESSAGES.find((msg) => msg.id === id);
}
