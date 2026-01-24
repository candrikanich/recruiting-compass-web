import type { Phase, StatusLabel, Division } from "~/types/timeline";

export interface ParentMessageContext {
  phase?: Phase;
  division?: Division;
  status?: StatusLabel;
  daysInPhase?: number;
  schoolCount?: number;
  coachInteractionCount?: number;
}

/**
 * Get contextual messaging for parents based on recruiting status
 * Provides educational guidance and reassurance
 */
export function getParentMessage(context: ParentMessageContext): string | null {
  const { phase, status, daysInPhase = 0 } = context;

  // Early phase messages
  if (phase === "freshman") {
    return "Freshman year is about foundation. Focus on academics, sports training, and building confidence. Recruiting typically starts picking up junior year. This is a perfect time to attend camps and clinics to develop relationships with coaches.";
  }

  if (phase === "sophomore") {
    return "Sophomore year is when many coaches start taking notice. Continue training hard and maintaining academics. Consider attending summer showcases and camps to increase visibility with college programs.";
  }

  // Junior year - critical recruiting year
  if (phase === "junior") {
    if (status === "at_risk") {
      return "Junior year is crucial for recruiting. If progress feels slow, consider attending more showcases or camps, and reaching out directly to coaches at target schools. Many athletes don't hear from coaches until late junior year.";
    }
    if (status === "slightly_behind") {
      return "Junior year is when serious recruiting happens. Encourage your athlete to be proactive about contacting coaches and attending showcases. Many programs are still evaluating this class.";
    }
    return "Junior year is peak recruiting season. Your athlete is at a great point to be making connections with coaches and refining their target list.";
  }

  // Senior year - decision time
  if (phase === "senior") {
    if (status === "at_risk") {
      return "Senior year is the final stretch. Encourage your athlete to reach out to coaches directly at all levels (DI, DII, DIII, NAIA, JUCO). Many scholarships and spots are still available well into senior year.";
    }
    return "Senior year is decision time. Most athletes receive offers during fall of senior year, though some programs continue recruiting through spring.";
  }

  // Generic encouraging messages
  if (daysInPhase && daysInPhase > 200) {
    return "Your athlete has been working on this phase for a while. Remember that recruiting timelines vary by program level. Some coaches move quickly, others take more time to evaluate. Encourage your athlete to stay patient and continue training hard.";
  }

  // Status-based messages
  if (status === "on_track") {
    return "Your athlete is on track in their recruiting journey. Continue supporting their training, academics, and outreach efforts. Stay engaged with what they're experiencing.";
  }

  if (status === "slightly_behind") {
    return "Your athlete may be slightly behind where they'd like to be, but there's still plenty of time. Consider helping them identify additional showcase opportunities or target schools they haven't reached out to yet.";
  }

  if (status === "at_risk") {
    return "Your athlete may need to adjust their recruiting strategy. This could mean targeting schools at different levels, attending more showcases, or being more proactive with coach outreach. Remember that many successful athletes don't get recruited—they identify and contact programs directly.";
  }

  return null;
}

/**
 * Get specific action recommendations for parents
 */
export function getParentActionItems(context: ParentMessageContext): string[] {
  const actions: string[] = [];

  if (!context.division) {
    actions.push(
      "Help your athlete identify target divisions (D1, D2, D3, NAIA, JUCO)",
    );
  }

  if (!context.schoolCount || context.schoolCount < 10) {
    actions.push(
      "Build a list of 15-20 target schools at appropriate competitive levels",
    );
  }

  if (!context.coachInteractionCount || context.coachInteractionCount < 5) {
    actions.push("Encourage reaching out to coaches at target schools");
  }

  if (context.phase === "freshman" || context.phase === "sophomore") {
    actions.push(
      "Focus on training and academics now—recruiting will intensify later",
    );
  }

  if (context.phase === "junior" && context.status !== "on_track") {
    actions.push("Attend summer showcases and camps to increase visibility");
  }

  if (context.phase === "senior" && context.status === "at_risk") {
    actions.push(
      "Expand target school list to include D2, D3, NAIA, and JUCO options",
    );
  }

  return actions;
}

/**
 * Get realistic expectations message for a given phase/division combination
 */
export function getRecruitingExpectations(
  phase: Phase,
  division?: Division,
): string {
  const expectations: Record<Phase, Record<string, string>> = {
    freshman: {
      DI: "Few DI programs recruit heavily at freshman level. Focus on development.",
      DII: "Limited recruitment at this level. Continue training and building skills.",
      DIII: "Limited recruitment. This is a development year.",
      NAIA: "Some NAIA programs may contact, but most recruiting starts later.",
      JUCO: "JUCO programs recruit actively, but focus on development is key.",
      ALL: "Freshman year is about building skills. Most recruiting starts in sophomore/junior year.",
      default:
        "Freshman year is about building skills. Most recruiting starts in sophomore/junior year.",
    },
    sophomore: {
      DI: "DI coaches start evaluating sophomore class. Attend showcases.",
      DII: "DII programs becoming more active. Good time to make connections.",
      DIII: "DIII recruiting picks up sophomore/junior year.",
      NAIA: "NAIA programs more active. Many offers come junior/senior year.",
      JUCO: "JUCO recruiting is active. Some offers may come this year.",
      ALL: "Sophomore year is when coaches start noticing. Increase visibility.",
      default:
        "Sophomore year is when coaches start noticing. Increase visibility.",
    },
    junior: {
      DI: "Peak DI recruiting year. Many offers come this year.",
      DII: "DII programs very active. Expect increased coach contact.",
      DIII: "DIII recruiting continues. Offers may come this year.",
      NAIA: "NAIA very active. Many offers during junior year.",
      JUCO: "JUCO recruiting active. Many offers by end of junior year.",
      ALL: "Junior year is peak recruiting. Most offers come this year.",
      default: "Junior year is peak recruiting. Most offers come this year.",
    },
    senior: {
      DI: "Final DI decisions. Some programs still have spots available.",
      DII: "Final recruiting push. Scholarships still available.",
      DIII: "Many DIII programs still recruiting. Offers still coming.",
      NAIA: "NAIA actively recruiting through senior year.",
      JUCO: "JUCO recruiting continues. Many options still available.",
      ALL: "Senior year is final decision year. Opportunities still exist at all levels.",
      default:
        "Senior year is final decision year. Opportunities still exist at all levels.",
    },
    committed: {
      DI: "Your athlete is committed. Focus on maintaining academics and form.",
      DII: "Your athlete is committed. Support their transition preparation.",
      DIII: "Your athlete is committed. Great achievement!",
      NAIA: "Your athlete is committed. Congratulations!",
      JUCO: "Your athlete is committed. Support their continued development.",
      ALL: "Your athlete has committed. Support their preparation for college.",
      default:
        "Your athlete has committed. Support their preparation for college.",
    },
  };

  const divisionKey = (division ||
    "default") as keyof (typeof expectations)[Phase];
  return expectations[phase][divisionKey] || expectations[phase].default;
}
