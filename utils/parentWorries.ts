import type { Phase } from "~/types/timeline";

export interface ParentWorry {
  id: string;
  question: string;
  answer: string;
  phases: Phase[];
  category: "recruiting" | "academics" | "mental_health" | "timeline";
}

const PARENT_WORRIES: ParentWorry[] = [
  {
    id: "freshman-too-early",
    question: "Is it too early to think about recruiting in 9th grade?",
    answer:
      "Freshman year is actually the perfect time to build a foundation. While most coach recruitment happens later, freshman year is ideal for developing skills, maintaining strong grades, and attending camps/clinics to build relationships. Focus on getting better, not on recruiting pressure.",
    phases: ["freshman"],
    category: "timeline",
  },
  {
    id: "freshman-not-recruited",
    question: "Should my athlete be getting recruited already as a freshman?",
    answer:
      "Very few athletes get recruited as freshmen. Coaches are looking ahead, but most don't make serious contact until junior year. If your athlete has gotten interest, that's great—but lack of interest this early is completely normal and doesn't indicate anything about their future.",
    phases: ["freshman"],
    category: "recruiting",
  },
  {
    id: "sophomore-no-contact",
    question:
      "We haven't heard from any coaches yet. Is that normal for 10th grade?",
    answer:
      "Yes, this is very normal. Most coaches don't actively recruit until junior year. Some may start reaching out to sophomores at showcases or camps, but silence at this point doesn't mean anything. Focus on attending showcases, maintaining academics, and improving skills.",
    phases: ["sophomore"],
    category: "timeline",
  },
  {
    id: "sophomore-how-many-schools",
    question: "How many schools should we be targeting now?",
    answer:
      "As a sophomore, aim to identify 15-25 schools across different divisions that match your athlete's current abilities and academic profile. This list will evolve as they improve and get feedback from coaches. Quality research matters more than quantity.",
    phases: ["sophomore"],
    category: "recruiting",
  },
  {
    id: "junior-behind-peers",
    question:
      "Everyone else seems to have offers already. Are we falling behind?",
    answer:
      "Early junior offers are actually less common than you might think. Social media and highlight videos create a misleading picture. Many elite athletes don't get offers until late junior year or senior year. Your athlete's timeline is likely fine.",
    phases: ["junior"],
    category: "mental_health",
  },
  {
    id: "junior-too-late",
    question:
      "Is it too late to start recruiting if we're just starting junior year?",
    answer:
      "Junior year is when serious recruiting typically begins. Starting now is actually right on time for most programs. Coaches evaluate the entire junior year, so there's no disadvantage to starting early or mid-year. Many athletes don't get offers until late junior or senior year.",
    phases: ["junior"],
    category: "timeline",
  },
  {
    id: "senior-no-offer",
    question:
      "We still don't have a scholarship offer. What does this mean for senior year?",
    answer:
      "Senior year still has many opportunities. Many athletes receive offers during senior year fall, and some programs recruit into spring. Consider a broader range of divisions and schools. Walk-on opportunities are also legitimate and can be great fits.",
    phases: ["senior"],
    category: "recruiting",
  },
  {
    id: "senior-d2-d3-naia",
    question:
      "What's the difference between D1, D2, D3, NAIA, and JUCO? Are non-D1 options legitimate?",
    answer:
      "All divisions offer excellent opportunities. D2 and D3 often provide better academics and balances. NAIA and JUCO can be great stepping stones or final destinations. Many successful professional players went through non-D1 programs. The 'best' option is what fits your athlete's goals.",
    phases: ["junior", "senior"],
    category: "recruiting",
  },
  {
    id: "all-div-pressure",
    question:
      "My athlete feels pressure to go to a big name D1 school. How do I help?",
    answer:
      "Help them focus on fit: academics, team chemistry, coaching staff, and playing time potential. Many athletes are happier at smaller programs where they'll play. The 'best' school is the one that's best for their goals, not what sounds impressive.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    category: "mental_health",
  },
  {
    id: "all-social-media",
    question:
      "Other athletes' social media makes recruiting seem cutthroat. Should we be doing more?",
    answer:
      "Social media highlights the exceptions, not the norm. Most successful recruiting comes from consistent performance, academics, and direct coach communication. Don't compare your athlete's journey to highlight reels. Focus on what works for your athlete.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    category: "mental_health",
  },
  {
    id: "all-realism",
    question:
      "How do we know what division level is realistic for our athlete?",
    answer:
      "Look at recent commits from your athlete's club/high school, compare stats to college recruit profiles, attend showcases where coaches evaluate, and ask coaches for honest feedback. Talk to current college players. Realistic goals lead to better outcomes than chasing dreams that don't fit.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    category: "recruiting",
  },
  {
    id: "all-late-bloomers",
    question:
      "Are late bloomers common in baseball recruiting? My athlete just started improving.",
    answer:
      "Very common. Baseball development varies greatly by individual. Some athletes peak junior/senior year. Coaches know this and continue evaluating. Improvement is what matters. Don't lose hope if your athlete is still developing.",
    phases: ["freshman", "sophomore", "junior"],
    category: "timeline",
  },
  {
    id: "all-grades-matter",
    question:
      "How important are grades in recruiting? My athlete focuses more on baseball.",
    answer:
      "Grades matter significantly. Most college programs require minimum GPA, and good grades keep options open at selective schools. Recruiting is about both athleticism AND academics. Strong grades make your athlete more attractive overall.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    category: "academics",
  },
  {
    id: "all-walkon",
    question:
      "What does walk-on mean? Is it a legitimate way to play in college?",
    answer:
      "Walk-ons are students who try out for the team without a scholarship offer. It's completely legitimate. Many walk-ons eventually earn scholarships or become key contributors. Walk-on can lead to college baseball, even D1. Consider it a viable option.",
    phases: ["junior", "senior"],
    category: "recruiting",
  },
  {
    id: "all-silent-coaches",
    question:
      "Why are coaches sometimes silent for months, then suddenly contact us?",
    answer:
      "Coaches evaluate during specific periods and balance many recruiting tasks. Silence doesn't mean lack of interest. They may be focused on other classes or waiting for more evaluation. Stay in touch but don't read too much into quiet periods.",
    phases: ["freshman", "sophomore", "junior", "senior"],
    category: "timeline",
  },
];

export function getCommonWorries(phase: Phase): ParentWorry[] {
  return PARENT_WORRIES.filter((worry) => worry.phases.includes(phase)).sort(
    (a, b) => a.category.localeCompare(b.category),
  );
}

export function getWorrysByCategory(
  phase: Phase,
  category: ParentWorry["category"],
): ParentWorry[] {
  return PARENT_WORRIES.filter(
    (worry) => worry.phases.includes(phase) && worry.category === category,
  );
}
