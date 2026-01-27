/**
 * Help system definitions for in-app guidance
 * Organized by feature with tooltips and detailed explanations
 */

export interface HelpDefinition {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  relatedLinks?: Array<{ label: string; url: string }>;
}

export const helpDefinitions: Record<string, HelpDefinition> = {
  // Timeline phases
  freshmanPhase: {
    id: "freshman-phase",
    title: "Freshman Phase",
    shortDescription: "Year of exploration and foundation building",
    fullDescription: `During your freshman year, the focus is on exploration and building a foundation. You're getting to know colleges, attending summer camps, starting to build relationships with coaches, and figuring out what you're looking for in a college. You don't need to have committed to anything yet. Tasks include building your target school list, attending camps, and starting to log interactions with coaches.`,
    relatedLinks: [
      { label: "Timeline Guide", url: "/docs/timeline" },
      { label: "Freshman Tasks", url: "/timeline/freshman" }
    ]
  },

  sophomorePhase: {
    id: "sophomore-phase",
    title: "Sophomore Phase",
    shortDescription: "Year of serious pursuit and list refinement",
    fullDescription: `Your sophomore year is when recruiting becomes more serious. You're being actively recruited, you're reaching out to coaches, attending showcases, and narrowing down your list. This is when coaches start paying closer attention to your stats and performance. You're building strong relationships with coaches at your target schools.`,
    relatedLinks: [
      { label: "Timeline Guide", url: "/docs/timeline" },
      { label: "Sophomore Tasks", url: "/timeline/sophomore" }
    ]
  },

  juniorPhase: {
    id: "junior-phase",
    title: "Junior Phase",
    shortDescription: "Critical year of intense recruitment",
    fullDescription: `Junior year is typically the most intense recruiting year. Coaches are watching your performance closely, you're having serious conversations about scholarships, and you're taking official visits. Your stats matter more than ever. This is also the year you might commit to a school if you're ready.`,
    relatedLinks: [
      { label: "Timeline Guide", url: "/docs/timeline" },
      { label: "Junior Tasks", url: "/timeline/junior" }
    ]
  },

  seniorPhase: {
    id: "senior-phase",
    title: "Senior Phase",
    shortDescription: "Final decision and commitment year",
    fullDescription: `Your senior year is about making your final decision and committing. You've been through three years of recruiting, you know which schools are interested in you, and now you're choosing where to go. This is the finish line. You're signing your letter of intent and getting ready for the next chapter.`,
    relatedLinks: [
      { label: "Timeline Guide", url: "/docs/timeline" },
      { label: "Senior Tasks", url: "/timeline/senior" }
    ]
  },

  // Fit scores
  fitScore: {
    id: "fit-score",
    title: "Fit Score",
    shortDescription: "How well you match with a school (1-10)",
    fullDescription: `Your fit score is a number from 1-10 that shows how well you match with a school both athletically and academically. It's calculated using five components: Academic Fit (30%), Athletic Fit (30%), Location Fit (15%), Program Fit (15%), and Financial Fit (10%). A higher score means the school is a better match for you. Reach schools are typically below 5, target schools are 5-8, and safety schools are 8-10.`,
    relatedLinks: [
      { label: "Understanding Fit Scores", url: "/docs/fit-scores" },
      { label: "Video: Fit Scores Explained", url: "/videos/fit-scores" }
    ]
  },

  academicFit: {
    id: "academic-fit",
    title: "Academic Fit (30%)",
    shortDescription: "Your academics vs. school standards",
    fullDescription: `Academic fit measures how well your GPA, test scores, and academic profile match the school's academic standards. If your GPA and test scores are similar to or above their typical student-athlete standards, you have good academic fit. If they're below, it's harder to get in, which lowers your academic fit score.`,
  },

  athleticFit: {
    id: "athletic-fit",
    title: "Athletic Fit (30%)",
    shortDescription: "Your athletic profile vs. school needs",
    fullDescription: `Athletic fit compares your performance stats to what the school needs. Are you the type of athlete they recruit? Do your stats match what they're looking for in your position? If you're a pitcher with an ERA of 2.8 and they're looking for pitchers with ERAs around 3.0, you have good athletic fit. This is often the most important component for recruiting.`,
  },

  locationFit: {
    id: "location-fit",
    title: "Location Fit (15%)",
    shortDescription: "Geographic distance and regional preference",
    fullDescription: `Location fit considers how far the school is from your home and whether it matches your location preferences. Some athletes don't care about distance; others really value being close to home. If a school's location matches your preferences, it boosts your location fit score.`,
  },

  programFit: {
    id: "program-fit",
    title: "Program Fit (15%)",
    shortDescription: "Coaching style and program reputation",
    fullDescription: `Program fit is about the school's reputation, coaching style, and whether you align with how they play. Do you like the coach's approach? Is this a program you respect? Would you be happy playing there? This is more subjective but important for long-term satisfaction.`,
  },

  financialFit: {
    id: "financial-fit",
    title: "Financial Fit (10%)",
    shortDescription: "Scholarship availability and financial aid",
    fullDescription: `Financial fit looks at the school's likelihood to offer you a scholarship based on your profile and their budget. D1 schools offer more scholarships than D2 or D3. Some programs have more money than others. This component helps you understand the financial reality of recruiting at each school.`,
  },

  // Interest calibration
  interestCalibration: {
    id: "interest-calibration",
    title: "Interest Calibration",
    shortDescription: "6-question survey to assess school interest",
    fullDescription: `After you log a significant interaction (like a call with a coach), we'll ask you 6 quick questions to calibrate your interest level in that school. Questions like: How interested are you? Would you visit campus? Academic fit? Athletic fit? Location? Next action? Your answers help us understand your genuine interest and suggest next steps.`,
    relatedLinks: [
      { label: "Video: Interest Calibration", url: "/videos/calibration" }
    ]
  },

  // Task dependencies
  taskDependencies: {
    id: "task-dependencies",
    title: "Task Dependencies",
    shortDescription: "Why some tasks are locked until others are complete",
    fullDescription: `Some tasks depend on other tasks being completed first. For example, you can't advance to sophomore phase until you've completed key freshman tasks. Tasks are locked when their dependencies aren't met. This ensures you're following a logical recruiting progression and not skipping important steps.`,
  },

  // Dashboard widgets
  dashboardOverview: {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    shortDescription: "Your recruiting quick summary",
    fullDescription: `Your dashboard shows key metrics at a glance: current phase, progress toward next phase, number of schools, recent interactions, pending tasks, and active suggestions. It's designed to give you a 30-second overview of where you stand in your recruiting journey.`,
  },

  progressBar: {
    id: "progress-bar",
    title: "Progress Bar",
    shortDescription: "Track progress toward phase advancement",
    fullDescription: `The progress bar shows how close you are to completing all tasks in your current phase. When you reach 100%, you can advance to the next phase. Each task you complete increases the bar. You don't need to complete them in order—just work toward completing all required tasks.`,
  },

  suggestionsWidget: {
    id: "suggestions-widget",
    title: "Suggestions Widget",
    shortDescription: "Smart recommendations for next steps",
    fullDescription: `The suggestions widget shows active recommendations based on your profile and interactions. These might be reminders to follow up with coaches, new schools that match your profile, activities you should consider, or milestones you're ready for. Click any suggestion to act on it.`,
  },

  // Responsiveness score
  responsivenessScore: {
    id: "responsiveness-score",
    title: "Responsiveness Score",
    shortDescription: "How quickly a coach typically responds",
    fullDescription: `The responsiveness score is a rating from 1-10 for each coach showing how quickly and consistently they respond to your outreach. A coach with a high score responds quickly and regularly. A coach with a low score might take weeks to respond or be less consistent. This helps you prioritize who to reach out to and manage your expectations.`,
  },

  // Recovery plan
  recoveryPlan: {
    id: "recovery-plan",
    title: "Recovery Plan",
    shortDescription: "Re-engagement strategy for silent coaches",
    fullDescription: `If a coach hasn't interacted with you in 30+ days, Recruiting Compass suggests a recovery plan. This might be a new angle to approach them, optimal timing to reach out, or a sample message to use. It's designed to help you re-engage with coaches who've gone quiet without seeming desperate.`,
    relatedLinks: [
      { label: "Recovery Plan Guide", url: "/docs/recovery" }
    ]
  },

  // Priority tiers
  priorityTiers: {
    id: "priority-tiers",
    title: "Priority Tiers",
    shortDescription: "Organize schools by recruitment likelihood",
    fullDescription: `Reach schools are harder to get into (your stats are below average). Target schools are realistic matches for you (your stats align with theirs). Safety schools are very likely acceptances (your stats are above average). A balanced list has schools across all tiers so you have realistic options.`,
    relatedLinks: [
      { label: "School Tiering Strategy", url: "/docs/tiering" }
    ]
  },
};

export const helpCategoryGroups = {
  timeline: ["freshman-phase", "sophomore-phase", "junior-phase", "senior-phase"],
  fitScores: ["fit-score", "academic-fit", "athletic-fit", "location-fit", "program-fit", "financial-fit"],
  dashboard: ["dashboard-overview", "progress-bar", "suggestions-widget"],
  coaches: ["responsiveness-score", "recovery-plan"],
  organization: ["task-dependencies", "priority-tiers", "interest-calibration"],
};

/**
 * Get help definition by ID
 */
export const getHelpDefinition = (id: string): HelpDefinition | undefined => {
  return helpDefinitions[id];
};

/**
 * Get all definitions in a category
 */
export const getHelpsByCategory = (category: keyof typeof helpCategoryGroups) => {
  const ids = helpCategoryGroups[category];
  return ids.map(id => helpDefinitions[id]).filter(Boolean);
};
