export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

const rawTerms: GlossaryTerm[] = [
  {
    id: "committable",
    term: "Committable Offer",
    definition:
      "A scholarship or roster-spot offer the athlete can accept, as opposed to general interest.",
  },
  {
    id: "dead-period",
    term: "Dead Period",
    definition:
      "An NCAA-defined window when a coach cannot have any in-person contact with a recruit, on or off campus.",
  },
  {
    id: "eval-period",
    term: "Evaluation Period",
    definition:
      "An NCAA-defined window when a coach may watch a recruit compete or visit their school, but off-campus, in-person recruiting contact is not allowed.",
  },
  {
    id: "grayshirt",
    term: "Grayshirting",
    definition:
      "Delaying enrollment (and scholarship start) by a semester or year, usually to manage a roster's scholarship count.",
  },
  {
    id: "letter-of-intent",
    term: "Letter of Intent (LOI)",
    definition:
      "A binding written agreement between a recruit and a school confirming enrollment and athletic participation.",
  },
  {
    id: "official-visit",
    term: "Official Visit",
    definition:
      "A campus visit paid for (in full or part) by the school — one per school (a second may be allowed in D1/D2 if the head coach changes). What's covered (travel, lodging, meals, entertainment) varies by division — see Schools & Coaches for the full breakdown.",
  },
  {
    id: "preferred-walk-on",
    term: "Preferred Walk-On",
    definition:
      "A roster spot offered without a scholarship, but with an implicit invitation to try out rather than compete in open tryouts.",
  },
  {
    id: "quiet-period",
    term: "Quiet Period",
    definition:
      "An NCAA-defined window when a coach may only have recruiting contact with a recruit on the school's own campus.",
  },
  {
    id: "recruiting-calendar",
    term: "Recruiting Calendar",
    definition:
      "The NCAA's sport-specific schedule of contact, evaluation, quiet, and dead periods that governs when a coach can contact a recruit.",
  },
  {
    id: "redshirt",
    term: "Redshirt",
    definition:
      "A season in which an athlete practices with the team but doesn't compete, preserving a year of eligibility.",
  },
  {
    id: "unofficial-visit",
    term: "Unofficial Visit",
    definition:
      "A self-funded campus visit with no limit on how many a recruit can take. In D1/D2, each visit must occur after the first permissible date for your sport. What the school may still provide (like meals or event tickets) varies by division — see Schools & Coaches for the full breakdown.",
  },
  {
    id: "walk-on",
    term: "Walk-On",
    definition:
      "An athlete who joins a team without an athletic scholarship, typically via open tryouts.",
  },
];

export const glossaryTerms: GlossaryTerm[] = [...rawTerms].sort((a, b) =>
  a.term.localeCompare(b.term),
);
