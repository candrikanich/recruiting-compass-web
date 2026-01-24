/**
 * Timeline Test Data Fixtures
 *
 * Real NCAA/NAIA recruiting timeline data for testing the recruiting timeline feature.
 * Based on research from Complete_Recruiting_System.md and Rules_Engine.md.
 *
 * Task counts by grade:
 * - Grade 9 (Freshman): 18 tasks
 * - Grade 10 (Sophomore): 20 tasks
 * - Grade 11 (Junior): 23 tasks
 * - Grade 12 (Senior): 19 tasks
 * - Total: 80 tasks
 */

// ============================================================================
// TASK FIXTURES - Real NCAA/NAIA recruiting tasks by grade
// ============================================================================

export const freshmanTasks = [
  // Academic Tasks (3)
  {
    id: "task-9-a1",
    category: "academic",
    grade_level: 9,
    title: "Understand NCAA/NAIA Requirements",
    description:
      "Learn college eligibility basics. Review NCAA core-course rules. Confirm counselor about your path.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Avoids eligibility mistakes early. Wrong courses freshman year compound into senior year problems.",
    failure_risk:
      "Weak grades in non-core classes = options reduced. May need extra courses senior year.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-a2",
    category: "academic",
    grade_level: 9,
    title: "Build Strong Study Habits",
    description:
      "Establish consistent study routine. Aim for A/B grades minimum. Track unweighted GPA.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Early grades compound; hard to fix later. GPA is cumulative across all 4 years.",
    failure_risk:
      "GPA <2.8 closes most D1/D2 options. Recovery requires near-perfect later grades.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-a3",
    category: "academic",
    grade_level: 9,
    title: "Take PSAT (Optional but Recommended)",
    description: "Establishes testing baseline. Identifies weak areas early.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Gives 3 years to improve test scores. Baseline helps target prep areas.",
    failure_risk:
      "Late testing = rushed senior year. No baseline means blind prep later.",
    division_applicability: ["DI", "DII", "NAIA"],
  },

  // Athletic Development Tasks (3)
  {
    id: "task-9-at1",
    category: "athletic",
    grade_level: 9,
    title: "Commit to Year-Round Development",
    description:
      "In-season play + off-season training. Establish strength/speed routine.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Athletic gap closes at higher levels. Consistent training compounds over 4 years.",
    failure_risk:
      "Seasonal athletes get left behind. Peers who train year-round gain significant advantage.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-at2",
    category: "athletic",
    grade_level: 9,
    title: "Start Tracking Metrics",
    description:
      "Record height, weight, basic stats. Games played, key performances. Speed/strength benchmarks.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Coaches need objective data. Tracking shows trajectory, not just snapshots.",
    failure_risk:
      "Coaches have no proof of development. Claims without data are ignored.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-at3",
    category: "athletic",
    grade_level: 9,
    title: "Seek Coach Feedback on Level",
    description:
      'Ask high school/club coach: "Where do I realistically fit?" Accept honest assessment.',
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Prevents chasing unrealistic levels. Sets appropriate expectations early.",
    failure_risk:
      "Wasting energy on impossible targets. Family invests in wrong showcases.",
    division_applicability: ["ALL"],
  },

  // Film & Exposure Tasks (6)
  {
    id: "task-9-f1",
    category: "exposure",
    grade_level: 9,
    title: "Start Saving Game Footage",
    description:
      "Ask parents/team staff/friends to record games. Save raw clips (no editing needed yet).",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Builds raw material for highlight video later. Best plays may happen anytime.",
    failure_risk:
      "Senior year scramble if no footage exists. Can't recreate past moments.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-f2",
    category: "recruiting",
    grade_level: 9,
    title: "Create Basic Athletic Resume",
    description:
      "Name, graduation year, sport, position. Height, weight, current teams, GPA. Contact info.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Standardizes your intro. Professional presentation from day one.",
    failure_risk:
      "Unprofessional first impression. Coaches dismiss unorganized athletes.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-f3",
    category: "exposure",
    grade_level: 9,
    title: "Set Up Simple Online Profile",
    description:
      "Google Drive shared folder OR Hudl account. Link game clips + resume.",
    required: false,
    dependency_task_ids: ["task-9-f1", "task-9-f2"],
    why_it_matters:
      "Centralizes info for coaches. One link to share everything.",
    failure_risk:
      "Scattered info = coaches can't find you. Lost opportunities from disorganization.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-e1",
    category: "exposure",
    grade_level: 9,
    title: "Attend 1-2 Local Camps (Development Focus)",
    description: "Choose camps for skill development, not recruiting hype.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Learn environment without pressure. Skill development is primary goal.",
    failure_risk:
      "Too many camps = distraction, cost. Focus on development, not exposure.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-9-e2",
    category: "exposure",
    grade_level: 9,
    title: "Watch College Games in Your Sport",
    description:
      "Live or streaming; notice size/speed/style differences. Observe D1 vs D2 vs D3 vs NAIA vs JUCO.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Calibrate realistic levels. Understand what each division looks like.",
    failure_risk:
      "Chasing unrealistic standard. Disappointment when reality doesn't match expectations.",
    division_applicability: ["ALL"],
  },

  // Mindset Tasks (1)
  {
    id: "task-9-m1",
    category: "mindset",
    grade_level: 9,
    title: "Understand Recruiting is 4-Year Process",
    description:
      "This year is foundation, not evaluation. Recruiting accelerates junior/senior year.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Reduces panic; frames effort correctly. Sets realistic timeline expectations.",
    failure_risk:
      "Burnout from unrealistic expectations. Pressure too early causes dropout.",
    division_applicability: ["ALL"],
  },
];

export const sophomoreTasks = [
  // Academic Tasks (2)
  {
    id: "task-10-a1",
    category: "academic",
    grade_level: 10,
    title: "Confirm NCAA Core Courses Schedule",
    description:
      "Meet counselor; verify schedule meets requirements. Maintain strong GPA.",
    required: true,
    dependency_task_ids: ["task-9-a1"],
    why_it_matters:
      "Locks in eligibility path. Course requirements can't be fixed retroactively.",
    failure_risk:
      "Wrong courses = delayed eligibility. May need summer school or extra year.",
    division_applicability: ["DI", "DII", "NAIA"],
  },
  {
    id: "task-10-a2",
    category: "academic",
    grade_level: 10,
    title: "Take PSAT or Practice ACT/SAT",
    description:
      "Establish baseline; identify weak areas. Use results to target prep.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Two more years to improve. Baseline informs test prep strategy.",
    failure_risk:
      "No baseline = can't track improvement. Rushed prep junior/senior year.",
    division_applicability: ["DI", "DII", "NAIA"],
  },

  // Athletic Development Tasks (3)
  {
    id: "task-10-at1",
    category: "athletic",
    grade_level: 10,
    title: "Increase Strength/Speed Training",
    description:
      "Structured off-season program. Position-specific skill focus.",
    required: true,
    dependency_task_ids: ["task-9-at1"],
    why_it_matters:
      "Measurable improvement impresses coaches. Physical development is critical.",
    failure_risk:
      "Flat development = coaches lose interest. Peers pass you by.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-at2",
    category: "athletic",
    grade_level: 10,
    title: "Seek Higher Competition Level",
    description:
      "Move to club/travel league if ready. Play against better competition.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Coaches want to see you against elite players. Level of competition matters.",
    failure_risk:
      "Dominating weak competition looks different on film. Coaches discount stats.",
    division_applicability: ["DI", "DII"],
  },
  {
    id: "task-10-at3",
    category: "athletic",
    grade_level: 10,
    title: "Update Athlete Metrics",
    description: "New height, weight, times, stats. Career totals vs season.",
    required: true,
    dependency_task_ids: ["task-9-at2"],
    why_it_matters:
      "Shows trajectory, not snapshot. Coaches track improvement over time.",
    failure_risk:
      "Outdated info = coaches underestimate. Old numbers hurt your case.",
    division_applicability: ["ALL"],
  },

  // Recruiting Prep Tasks (5)
  {
    id: "task-10-r1",
    category: "recruiting",
    grade_level: 10,
    title: "Create Highlight Video (2-4 minutes)",
    description:
      "Best plays first. Clear jersey number visible. High-quality audio/visuals.",
    required: true,
    dependency_task_ids: ["task-9-f1"],
    why_it_matters:
      "First real recruiting tool coaches see. Most important piece of content.",
    failure_risk:
      "Bad video = coaches don't watch full game footage. One chance at first impression.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-r2",
    category: "recruiting",
    grade_level: 10,
    title: "Learn How to Email Coaches",
    description: "Study professional templates. Short, personal, specific.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "First impression of communication. Professional emails get responses.",
    failure_risk:
      "Unprofessional email = ignored. Form letters are immediately deleted.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-r3",
    category: "recruiting",
    grade_level: 10,
    title: "Build Initial College List (20-40 schools)",
    description:
      "Research reach, match, safety schools. Mix of DI, DII, DIII, NAIA, JUCO.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Prevents last-minute scramble. Diverse list ensures options.",
    failure_risk:
      "Too narrow list = limited options. All reaches = likely disappointment.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-r4",
    category: "recruiting",
    grade_level: 10,
    title: "Fill Out Team Recruiting Questionnaires",
    description: "Complete forms on team websites for target schools.",
    required: false,
    dependency_task_ids: ["task-10-r3"],
    why_it_matters:
      "Gets you in system early. Coaches search questionnaire database.",
    failure_risk:
      "Coaches don't know you exist yet. Missing from their recruiting pool.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-r5",
    category: "recruiting",
    grade_level: 10,
    title: "Send First Introductory Emails",
    description:
      "Use template: intro + academics + athletics + video + schedule. Email 3-5 coaches per month.",
    required: true,
    dependency_task_ids: ["task-10-r1", "task-10-r2"],
    why_it_matters:
      "Early contact = early visibility. Starts the relationship.",
    failure_risk:
      "No outreach = coaches forget about you. Silent athletes don't get recruited.",
    division_applicability: ["ALL"],
  },

  // Exposure Tasks (3)
  {
    id: "task-10-e1",
    category: "exposure",
    grade_level: 10,
    title: "Research Target Schools",
    description:
      "Location, academics, cost, team culture. Watch game film; check rosters.",
    required: true,
    dependency_task_ids: ["task-10-r3"],
    why_it_matters: "Builds informed list. Know what you're pursuing.",
    failure_risk:
      "Chasing schools that don't fit. Wasted effort on poor matches.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-e2",
    category: "exposure",
    grade_level: 10,
    title: "Follow Program Social Media",
    description:
      "Like, comment appropriately (not spam). Engage genuinely with content.",
    required: false,
    dependency_task_ids: ["task-10-r3"],
    why_it_matters: "Coaches notice engaged accounts. Shows genuine interest.",
    failure_risk:
      "No engagement = less visible. Passive following doesn't stand out.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-10-e3",
    category: "exposure",
    grade_level: 10,
    title: "Take Unofficial Campus Visits",
    description:
      "Self-guided or casual; low-cost. Get feel for campus environment.",
    required: false,
    dependency_task_ids: ["task-10-r3"],
    why_it_matters:
      "See if campus feels right. Environment matters for 4 years.",
    failure_risk:
      "Wrong environment = wrong fit. Committing blind leads to transfers.",
    division_applicability: ["ALL"],
  },

  // Mindset Tasks (1)
  {
    id: "task-10-m1",
    category: "mindset",
    grade_level: 10,
    title: "Track Coach Interest in Spreadsheet",
    description:
      "Contacts, responses, interest level. Next steps for each school.",
    required: true,
    dependency_task_ids: ["task-10-r5"],
    why_it_matters:
      "Prevents losing track of conversations. Organization is competitive advantage.",
    failure_risk:
      "Disorganization = missed opportunities. Can't manage what you don't track.",
    division_applicability: ["ALL"],
  },
];

export const juniorTasks = [
  // Academic Tasks (4)
  {
    id: "task-11-a1",
    category: "academic",
    grade_level: 11,
    title: "Register with NCAA Eligibility Center",
    description:
      "DI/DII bound athletes. Provide transcripts and test scores (code 9999).",
    required: true,
    dependency_task_ids: ["task-10-a1"],
    why_it_matters:
      "Initiates official eligibility tracking. Required for D1/D2 recruitment.",
    failure_risk:
      "Late registration delays evaluation. Coaches can't officially recruit you.",
    division_applicability: ["DI", "DII"],
  },
  {
    id: "task-11-a2",
    category: "academic",
    grade_level: 11,
    title: "Register with NAIA Eligibility Center",
    description: "NAIA-bound athletes. Separate registration from NCAA.",
    required: true,
    dependency_task_ids: [],
    why_it_matters: "NAIA tracks separately. Required for NAIA recruitment.",
    failure_risk: "Can't commit without registration. Delays signing process.",
    division_applicability: ["NAIA"],
  },
  {
    id: "task-11-a3",
    category: "academic",
    grade_level: 11,
    title: "Take SAT/ACT (Official Test)",
    description:
      "Send scores to colleges + eligibility centers. Use college code 9999 for NCAA.",
    required: true,
    dependency_task_ids: ["task-10-a2"],
    why_it_matters:
      "Official scores needed for admissions. Eligibility centers require official scores.",
    failure_risk:
      "Late testing = rushed deadlines. May miss early application windows.",
    division_applicability: ["DI", "DII", "NAIA"],
  },
  {
    id: "task-11-a4",
    category: "academic",
    grade_level: 11,
    title: "Maintain Strongest GPA Possible",
    description:
      "Junior year is most important for admissions. Aim for highest grades in core courses.",
    required: true,
    dependency_task_ids: ["task-9-a2"],
    why_it_matters:
      "Admissions committees weight junior year heavily. Last full year before applications.",
    failure_risk:
      "Weak junior year = admissions rejection even if recruited. GPA must be competitive.",
    division_applicability: ["ALL"],
  },

  // Athletic Development Tasks (5)
  {
    id: "task-11-at1",
    category: "athletic",
    grade_level: 11,
    title: "Update Highlight Video (Mid & Post-Season)",
    description:
      "Add new best plays. Keep 3-5 minutes. Show most recent performance.",
    required: true,
    dependency_task_ids: ["task-10-r1"],
    why_it_matters:
      "Coaches want recent film. Outdated video shows old abilities.",
    failure_risk:
      "Outdated video = old assessment. Coaches assume no improvement.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-at2",
    category: "athletic",
    grade_level: 11,
    title: "Maintain Current Measurables",
    description:
      "Height, weight, 40-time, lift numbers. Season and career stats.",
    required: true,
    dependency_task_ids: ["task-10-at3"],
    why_it_matters:
      "Coaches compare against peers. Current data needed for evaluation.",
    failure_risk:
      "Unknown measurables = harder to evaluate. Coaches skip incomplete profiles.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-at3",
    category: "athletic",
    grade_level: 11,
    title: "Choose Events/Showcases Strategically",
    description:
      "Attend only where target schools recruit. Not every big showcase.",
    required: false,
    dependency_task_ids: ["task-10-r3"],
    why_it_matters: "Cost + value alignment. Quality over quantity.",
    failure_risk:
      "Wasting money on wrong events. Target schools may not attend.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-at4",
    category: "athletic",
    grade_level: 11,
    title: "Play Your Best Competition",
    description:
      "High-level tournaments and games. Seek out elite competition.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Coaches see you against elite. Performance against top players matters.",
    failure_risk:
      "Weak schedule = coaches doubt level. Stats against bad teams don't impress.",
    division_applicability: ["DI", "DII"],
  },
  {
    id: "task-11-at5",
    category: "athletic",
    grade_level: 11,
    title: "Ask Coach to Contact College Coaches",
    description:
      "High school/club coach calls on your behalf. Third-party validation.",
    required: false,
    dependency_task_ids: [],
    why_it_matters: "Coach credibility helps. Coaches trust other coaches.",
    failure_risk:
      "No third-party validation feels weak. Self-promotion has limits.",
    division_applicability: ["ALL"],
  },

  // Recruiting Execution Tasks (7)
  {
    id: "task-11-r1",
    category: "recruiting",
    grade_level: 11,
    title: "Maintain Consistent Email Updates",
    description:
      "Every 4-6 weeks to target coaches. Include: new film, stats, schedule, academic updates.",
    required: true,
    dependency_task_ids: ["task-10-r5"],
    why_it_matters:
      "Keeps you top-of-mind. Consistent communication builds relationships.",
    failure_risk:
      "Forgotten if silent. Coaches move on to responsive athletes.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-r2",
    category: "recruiting",
    grade_level: 11,
    title: "Respond Quickly to Coach Contact",
    description: "Phone calls within 24 hours. Emails within 48 hours.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Shows seriousness and respect. Responsiveness signals interest.",
    failure_risk:
      "Slow response = perceived disinterest. Coaches interpret silence negatively.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-r3",
    category: "recruiting",
    grade_level: 11,
    title: "Schedule & Take Unofficial Visits",
    description: "Meet coaches, tour campus. Watch practice if allowed.",
    required: true,
    dependency_task_ids: ["task-10-e3"],
    why_it_matters: "Shows genuine interest. Face-to-face builds relationship.",
    failure_risk:
      "Never visiting = can't build relationship. Coaches question commitment.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-r4",
    category: "recruiting",
    grade_level: 11,
    title: "Narrow Target School List",
    description:
      "Identify reach/match/safety tiers. Focus on programs showing consistent interest.",
    required: true,
    dependency_task_ids: ["task-10-r3", "task-11-r1"],
    why_it_matters: "Prevents wasted energy. Quality engagement over quantity.",
    failure_risk:
      "Too many targets = shallow execution. Can't build deep relationships.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-r5",
    category: "recruiting",
    grade_level: 11,
    title: "Study Roster & Positional Fit",
    description:
      "Check depth chart; understand your fit. When do current athletes graduate?",
    required: true,
    dependency_task_ids: ["task-10-e1"],
    why_it_matters:
      "Know if position opportunity exists. Don't pursue stacked positions.",
    failure_risk:
      "Committing when position is full. No playing time for 3 years.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-r6",
    category: "recruiting",
    grade_level: 11,
    title: "Take Official Visits (Where Applicable)",
    description:
      "Many D3 official visits begin Jan 1 of junior year. D1 varies by sport.",
    required: false,
    dependency_task_ids: ["task-11-r3"],
    why_it_matters:
      "School pays; serious recruitment. Official visits signal real interest.",
    failure_risk:
      "Missing visit window = less serious interest. Timing matters.",
    division_applicability: ["DI", "DII", "DIII"],
  },
  {
    id: "task-11-r7",
    category: "recruiting",
    grade_level: 11,
    title: "Create Communication Tracking Spreadsheet",
    description:
      "School, coach, dates, responses, next steps. Comprehensive tracking.",
    required: true,
    dependency_task_ids: ["task-10-m1"],
    why_it_matters: "Never lose track of status. Professional organization.",
    failure_risk:
      "Losing track of conversations. Dropped balls lose opportunities.",
    division_applicability: ["ALL"],
  },

  // Exposure Tasks (2)
  {
    id: "task-11-e1",
    category: "exposure",
    grade_level: 11,
    title: "Attend 1-2 Showcases (Targeted)",
    description: "Only where coaches recruiting your schools attend.",
    required: false,
    dependency_task_ids: ["task-11-at3"],
    why_it_matters: "Quality over quantity. Right eyes at right events.",
    failure_risk:
      "Wrong events = no scout eyes. Money wasted on irrelevant showcases.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-11-e2",
    category: "exposure",
    grade_level: 11,
    title: "Request Full-Game Film Copies",
    description: "Save links to give coaches on request. Full game context.",
    required: false,
    dependency_task_ids: ["task-11-at1"],
    why_it_matters:
      "Coaches want to see full context. Highlights + full games together.",
    failure_risk:
      "Can't provide = coaches less interested. Missing piece of evaluation.",
    division_applicability: ["ALL"],
  },

  // Mindset Tasks (2)
  {
    id: "task-11-m1",
    category: "mindset",
    grade_level: 11,
    title: "Understand Roster Spots Fill Early",
    description:
      "Elite programs fill most spots by end of junior year. Many athletes get early verbal commitments.",
    required: true,
    dependency_task_ids: [],
    why_it_matters: "Realistic expectation-setting. Urgency is real.",
    failure_risk:
      "Thinking spots still available senior year. Top programs are full.",
    division_applicability: ["DI", "DII"],
  },
  {
    id: "task-11-m2",
    category: "mindset",
    grade_level: 11,
    title: "Balance Reach & Match Schools",
    description: "Don't ONLY target dream programs. Include realistic fits.",
    required: true,
    dependency_task_ids: ["task-11-r4"],
    why_it_matters:
      "Prevents heartbreak and provides options. Backup plans are essential.",
    failure_risk:
      "No acceptable fallback = bad decision under pressure. Panic leads to poor choices.",
    division_applicability: ["ALL"],
  },
];

export const seniorTasks = [
  // Academic Tasks (4)
  {
    id: "task-12-a1",
    category: "academic",
    grade_level: 12,
    title: "Maintain Senior Year Grades",
    description:
      "Performance still matters for admissions. Finish remaining NCAA core courses.",
    required: true,
    dependency_task_ids: ["task-11-a4"],
    why_it_matters:
      "Admissions committees see senior grades. Senioritis can cost admission.",
    failure_risk:
      "Senior slump = admissions rejection. Offers can be rescinded.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-a2",
    category: "academic",
    grade_level: 12,
    title: "Complete FAFSA & Financial Aid Forms",
    description:
      "Submit by deadlines. Required for financial aid consideration.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Determines financial aid package. Money left on table otherwise.",
    failure_risk:
      "Late FAFSA = reduced aid. Missed deadlines mean missed money.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-a3",
    category: "academic",
    grade_level: 12,
    title: "Request Transcripts & Recommendation Letters",
    description:
      "Send to schools + eligibility centers. Official documents required.",
    required: true,
    dependency_task_ids: [],
    why_it_matters: "Required for admissions. Official transcripts needed.",
    failure_risk:
      "Missing documents = incomplete application. Applications rejected.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-a4",
    category: "academic",
    grade_level: 12,
    title: "Verify Final Eligibility",
    description:
      "Confirm with eligibility center. Ensure all requirements met.",
    required: true,
    dependency_task_ids: ["task-11-a1", "task-11-a3"],
    why_it_matters: "No surprises at signing. Eligibility must be confirmed.",
    failure_risk:
      "Last-minute ineligibility = loss of offer. Nightmare scenario.",
    division_applicability: ["DI", "DII", "NAIA"],
  },

  // Recruiting Finalization Tasks (7)
  {
    id: "task-12-r1",
    category: "recruiting",
    grade_level: 12,
    title: "Continue Sending Updated Film",
    description: "Throughout fall/early winter. Keep coaches informed.",
    required: true,
    dependency_task_ids: ["task-11-at1"],
    why_it_matters:
      "Coaches make final decisions in-season. Current performance matters.",
    failure_risk:
      "Late momentum lost if silent. Fall performance often determines fate.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-r2",
    category: "recruiting",
    grade_level: 12,
    title: "Take Remaining Official Visits",
    description:
      "Schedule before decisions firm. Meet coaching staff and team.",
    required: true,
    dependency_task_ids: ["task-11-r6"],
    why_it_matters:
      "Meet coaching staff and team. Final evaluation opportunity.",
    failure_risk: "Committing without visiting = wrong choice. Regret follows.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-r3",
    category: "recruiting",
    grade_level: 12,
    title: "Ask Coaches Hard Questions",
    description:
      "Playing time path. Role expectations. Academic support. Total cost. Coaching stability.",
    required: true,
    dependency_task_ids: ["task-12-r2"],
    why_it_matters:
      "Realistic expectation-setting. Know what you're committing to.",
    failure_risk:
      "Surprise disappointment first year. Unmet expectations lead to transfers.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-r4",
    category: "recruiting",
    grade_level: 12,
    title: "Understand Offer Types",
    description:
      "Full scholarship vs partial vs need-based vs academic aid vs roster spot vs walk-on.",
    required: true,
    dependency_task_ids: [],
    why_it_matters:
      "Legally and financially different. Know exactly what's offered.",
    failure_risk:
      "Misunderstanding financial reality. Sticker shock at enrollment.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-r5",
    category: "recruiting",
    grade_level: 12,
    title: "Compare Offers Using Spreadsheet",
    description:
      "Cost after aid, playing time, academics, distance, culture. Objective comparison.",
    required: true,
    dependency_task_ids: ["task-12-r4"],
    why_it_matters:
      "Rational comparison prevents wrong choice. Data over emotion.",
    failure_risk:
      "Emotional decision under pressure. Regret from hasty choices.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-r6",
    category: "recruiting",
    grade_level: 12,
    title: "Understand NLI Timeline",
    description:
      "Football: December (early) + February (regular). Basketball: November + spring. Other sports vary.",
    required: true,
    dependency_task_ids: [],
    why_it_matters: "Don't miss signing window. Timing is everything.",
    failure_risk:
      "Offer expires; can't sign. Missed window = missed opportunity.",
    division_applicability: ["DI", "DII"],
  },
  {
    id: "task-12-r7",
    category: "recruiting",
    grade_level: 12,
    title: "Communicate with Non-Chosen Schools",
    description: "Thank them professionally. Close loop respectfully.",
    required: false,
    dependency_task_ids: [],
    why_it_matters:
      "Maintains relationships; shows respect. Sports world is small.",
    failure_risk:
      "Burned bridges; regrets later. May need those relationships.",
    division_applicability: ["ALL"],
  },

  // Decision Tasks (3)
  {
    id: "task-12-d1",
    category: "recruiting",
    grade_level: 12,
    title: "Finalize School Choice",
    description:
      "Consider: long-term fit, coaching stability, academic major strength, location/size, cost, playing time.",
    required: true,
    dependency_task_ids: ["task-12-r3", "task-12-r5"],
    why_it_matters: "Decision affects 4 years. Most important choice so far.",
    failure_risk: "Wrong choice = transfer later. Disruption and lost time.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-d2",
    category: "recruiting",
    grade_level: 12,
    title: "Make Verbal Commitment",
    description: "Confirm with coach in writing. Clear mutual understanding.",
    required: true,
    dependency_task_ids: ["task-12-d1"],
    why_it_matters: "Clarifies both sides' expectations. Foundation for NLI.",
    failure_risk: "Miscommunication on timing. Assumptions cause problems.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-d3",
    category: "recruiting",
    grade_level: 12,
    title: "Sign National Letter of Intent or Commitment Form",
    description: "DI/DII use NLI; D3 use likely letters or coach commitment.",
    required: true,
    dependency_task_ids: ["task-12-d2", "task-12-a4"],
    why_it_matters: "Official binding agreement. Makes it real.",
    failure_risk:
      "Offer can be pulled if not documented. Verbal isn't binding.",
    division_applicability: ["ALL"],
  },

  // Transition Tasks (3)
  {
    id: "task-12-t1",
    category: "recruiting",
    grade_level: 12,
    title: "Enroll & Complete Housing",
    description: "Submit enrollment confirmations. Choose/confirm housing.",
    required: true,
    dependency_task_ids: ["task-12-d3"],
    why_it_matters: "Logistical requirements. Must be done.",
    failure_risk: "Missing deadline = housing issue. Poor living situation.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-t2",
    category: "athletic",
    grade_level: 12,
    title: "Comply with Summer Training",
    description: "Off-season workouts provided by coach. Follow the program.",
    required: true,
    dependency_task_ids: ["task-12-d3"],
    why_it_matters:
      "Coaches expect commitment post-verbal. Show you're serious.",
    failure_risk: "Soft commitment = coaches get nervous. Could affect spot.",
    division_applicability: ["ALL"],
  },
  {
    id: "task-12-t3",
    category: "mindset",
    grade_level: 12,
    title: "Prepare Mentally for Level Jump",
    description:
      "Understand college pace is faster. You'll likely redshirt or be backup initially.",
    required: false,
    dependency_task_ids: ["task-12-d3"],
    why_it_matters: "Mental prep = better adjustment. Realistic expectations.",
    failure_risk:
      "Surprise disappointment first year. Unrealistic expectations cause problems.",
    division_applicability: ["ALL"],
  },
];

// ============================================================================
// ALL TASKS COMBINED
// ============================================================================

export const allTasks = [
  ...freshmanTasks,
  ...sophomoreTasks,
  ...juniorTasks,
  ...seniorTasks,
];

// ============================================================================
// PHASE MILESTONE REQUIREMENTS
// ============================================================================

export const phaseMilestones = {
  freshmanToSophomore: {
    requiredTasks: [
      "task-9-a1", // Understand NCAA/NAIA requirements
      "task-9-at1", // Commit to year-round development
      "task-9-f1", // Start saving game footage
      "task-9-f2", // Create basic athletic resume
    ],
    description: "Complete foundation tasks to advance to Sophomore phase",
  },
  sophomoreToJunior: {
    requiredTasks: [
      "task-10-r1", // Create highlight video
      "task-10-r3", // Build initial college list (20+ schools)
      "task-10-r5", // Send first introductory emails
      "task-10-a2", // Take PSAT or practice ACT/SAT
    ],
    description: "Complete early visibility tasks to advance to Junior phase",
  },
  juniorToSenior: {
    requiredTasks: [
      "task-11-a1", // Register with NCAA Eligibility Center (or NAIA equivalent)
      "task-11-a3", // Take official SAT/ACT
      "task-11-r3", // Schedule & take unofficial visits
      "task-11-r1", // Maintain consistent email updates (established cadence)
    ],
    description: "Complete evaluation tasks to advance to Senior phase",
  },
  seniorToCommitted: {
    requiredTasks: [
      "task-12-d3", // Sign NLI or commitment form (NOT verbal commitment)
    ],
    description: "Sign official commitment to complete recruiting journey",
  },
};

// ============================================================================
// ATHLETE FIXTURES
// ============================================================================

export const testAthletes = {
  // On-track junior with strong progress
  onTrackJunior: {
    id: "athlete-on-track-1",
    first_name: "Marcus",
    last_name: "Johnson",
    graduation_year: 2027,
    primary_sport: "baseball",
    positions: ["Pitcher", "Outfield"],
    height: 73, // 6'1"
    weight: 185,
    gpa: 3.6,
    test_scores: { sat: 1280, act: 28 },
    current_phase: "junior",
    status_score: 82,
    status_label: "on_track",
    phase_milestone_data: {
      freshman_complete: true,
      freshman_completed_at: "2024-05-15",
      sophomore_complete: true,
      sophomore_completed_at: "2025-05-20",
      junior_complete: false,
    },
    recovery_mode_active: false,
  },

  // At-risk sophomore with gaps
  atRiskSophomore: {
    id: "athlete-at-risk-1",
    first_name: "Tyler",
    last_name: "Williams",
    graduation_year: 2028,
    primary_sport: "baseball",
    positions: ["Catcher"],
    height: 70, // 5'10"
    weight: 175,
    gpa: 2.4,
    test_scores: null,
    current_phase: "sophomore",
    status_score: 38,
    status_label: "at_risk",
    phase_milestone_data: {
      freshman_complete: false,
    },
    recovery_mode_active: true,
  },

  // Slightly behind junior
  slightlyBehindJunior: {
    id: "athlete-behind-1",
    first_name: "Jake",
    last_name: "Anderson",
    graduation_year: 2027,
    primary_sport: "baseball",
    positions: ["Shortstop", "Second Base"],
    height: 71, // 5'11"
    weight: 165,
    gpa: 3.2,
    test_scores: { sat: 1150, act: 24 },
    current_phase: "junior",
    status_score: 58,
    status_label: "slightly_behind",
    phase_milestone_data: {
      freshman_complete: true,
      sophomore_complete: true,
      junior_complete: false,
    },
    recovery_mode_active: false,
  },

  // Late joiner (junior starting fresh)
  lateJoiner: {
    id: "athlete-late-1",
    first_name: "Chris",
    last_name: "Martinez",
    graduation_year: 2027,
    primary_sport: "baseball",
    positions: ["First Base", "Outfield"],
    height: 74, // 6'2"
    weight: 200,
    gpa: 3.4,
    test_scores: { act: 26 },
    current_phase: "freshman", // Will be assessed and advanced
    status_score: null, // Needs assessment
    status_label: null,
    phase_milestone_data: {},
    recovery_mode_active: false,
    joining_mid_journey: true,
    grade_level: 11, // Actually a junior
  },

  // Committed senior
  committedSenior: {
    id: "athlete-committed-1",
    first_name: "Ryan",
    last_name: "Thompson",
    graduation_year: 2026,
    primary_sport: "baseball",
    positions: ["Pitcher"],
    height: 75, // 6'3"
    weight: 195,
    gpa: 3.8,
    test_scores: { sat: 1350, act: 30 },
    current_phase: "committed",
    status_score: 98,
    status_label: "on_track",
    phase_milestone_data: {
      freshman_complete: true,
      sophomore_complete: true,
      junior_complete: true,
      senior_complete: true,
      commitment_date: "2025-11-15",
      committed_school: "Duke University",
    },
    recovery_mode_active: false,
  },
};

// ============================================================================
// SCHOOL & FIT SCORE FIXTURES
// ============================================================================

export const testSchoolsWithFitScores = {
  // Reach school - D1 power program
  reach: {
    id: "school-reach-1",
    name: "Vanderbilt University",
    division: "DI",
    conference: "SEC",
    location: "Nashville, TN",
    priority: "A",
    fit_score: 48,
    fit_tier: "unlikely",
    fit_score_data: {
      athletic: 35, // 0-40 scale
      academic: 22, // 0-25 scale (strong academics)
      opportunity: 8, // 0-20 scale (very competitive roster)
      personal: 12, // 0-15 scale
    },
    roster_depth: "stacked",
    scholarship_type: "full",
  },

  // High reach - D1 competitive
  highReach: {
    id: "school-reach-2",
    name: "Texas Christian University",
    division: "DI",
    conference: "Big 12",
    location: "Fort Worth, TX",
    priority: "A",
    fit_score: 55,
    fit_tier: "reach",
    fit_score_data: {
      athletic: 28,
      academic: 20,
      opportunity: 10,
      personal: 12,
    },
    roster_depth: "competitive",
    scholarship_type: "full",
  },

  // Match school - D1 mid-major
  match: {
    id: "school-match-1",
    name: "Dallas Baptist University",
    division: "DI",
    conference: "Missouri Valley",
    location: "Dallas, TX",
    priority: "A",
    fit_score: 76,
    fit_tier: "match",
    fit_score_data: {
      athletic: 32,
      academic: 22,
      opportunity: 16,
      personal: 14,
    },
    roster_depth: "moderate",
    scholarship_type: "partial",
  },

  // Safety school - D2
  safety: {
    id: "school-safety-1",
    name: "Angelo State University",
    division: "DII",
    conference: "Lone Star",
    location: "San Angelo, TX",
    priority: "B",
    fit_score: 88,
    fit_tier: "safety",
    fit_score_data: {
      athletic: 38,
      academic: 24,
      opportunity: 18,
      personal: 13,
    },
    roster_depth: "open",
    scholarship_type: "partial",
  },

  // D3 option
  d3Option: {
    id: "school-d3-1",
    name: "Trinity University",
    division: "DIII",
    conference: "SCAC",
    location: "San Antonio, TX",
    priority: "B",
    fit_score: 82,
    fit_tier: "match",
    fit_score_data: {
      athletic: 35,
      academic: 24,
      opportunity: 15,
      personal: 14,
    },
    roster_depth: "moderate",
    scholarship_type: "none", // D3 no athletic scholarships
  },

  // JUCO option
  jucoOption: {
    id: "school-juco-1",
    name: "San Jacinto College",
    division: "JUCO",
    conference: "Region XIV",
    location: "Pasadena, TX",
    priority: "C",
    fit_score: 92,
    fit_tier: "safety",
    fit_score_data: {
      athletic: 38,
      academic: 25,
      opportunity: 19,
      personal: 13,
    },
    roster_depth: "open",
    scholarship_type: "partial",
  },

  // NAIA option
  naiaOption: {
    id: "school-naia-1",
    name: "Oklahoma City University",
    division: "NAIA",
    conference: "Sooner Athletic",
    location: "Oklahoma City, OK",
    priority: "B",
    fit_score: 79,
    fit_tier: "match",
    fit_score_data: {
      athletic: 33,
      academic: 22,
      opportunity: 16,
      personal: 12,
    },
    roster_depth: "moderate",
    scholarship_type: "partial",
  },
};

// ============================================================================
// SUGGESTION FIXTURES
// ============================================================================

export const testSuggestions = {
  interactionGap: {
    id: "sugg-interaction-1",
    athlete_id: "athlete-on-track-1",
    rule_type: "interaction_gap",
    urgency: "high",
    message:
      "It's been 25 days since your last contact with Coach Smith at Dallas Baptist University. Consider a short follow-up email or call.",
    action_type: "log_interaction",
    related_school_id: "school-match-1",
    related_task_id: null,
    dismissed: false,
    completed: false,
    pending_surface: false,
    surfaced_at: "2026-01-01T10:00:00Z",
  },

  missingVideo: {
    id: "sugg-video-1",
    athlete_id: "athlete-at-risk-1",
    rule_type: "missing_video",
    urgency: "medium",
    message:
      "Consider uploading your first highlight video to share with coaches. 3-5 minutes is plenty.",
    action_type: "add_video",
    related_school_id: null,
    related_task_id: "task-10-r1",
    dismissed: false,
    completed: false,
    pending_surface: false,
    surfaced_at: "2026-01-01T10:00:00Z",
  },

  eventFollowUp: {
    id: "sugg-event-1",
    athlete_id: "athlete-behind-1",
    rule_type: "event_follow_up",
    urgency: "medium",
    message:
      "You attended Texas Scout Showcase on Dec 15. Log a recap interaction to update your coach list.",
    action_type: "log_interaction",
    related_school_id: null,
    related_task_id: null,
    dismissed: false,
    completed: false,
    pending_surface: false,
    surfaced_at: "2026-01-01T10:00:00Z",
  },

  portfolioHealth: {
    id: "sugg-portfolio-1",
    athlete_id: "athlete-behind-1",
    rule_type: "portfolio_health",
    urgency: "high",
    message:
      "Your current list has mostly reach schools. Consider adding match and safety options to ensure you have realistic opportunities.",
    action_type: "add_school",
    related_school_id: null,
    related_task_id: "task-10-r3",
    dismissed: false,
    completed: false,
    pending_surface: false,
    surfaced_at: "2026-01-01T10:00:00Z",
  },

  videoLinkBroken: {
    id: "sugg-video-broken-1",
    athlete_id: "athlete-on-track-1",
    rule_type: "video_link_health",
    urgency: "high",
    message:
      "Your highlight video link is no longer accessible. Update it before your next coach email.",
    action_type: "update_video",
    related_school_id: null,
    related_task_id: null,
    dismissed: false,
    completed: false,
    pending_surface: false,
    surfaced_at: "2026-01-01T10:00:00Z",
  },

  eligibilityReminder: {
    id: "sugg-eligibility-1",
    athlete_id: "athlete-behind-1",
    rule_type: "eligibility_reminder",
    urgency: "high",
    message:
      "You haven't registered with the NCAA Eligibility Center yet. Register this week to avoid delays.",
    action_type: "complete_task",
    related_school_id: null,
    related_task_id: "task-11-a1",
    dismissed: false,
    completed: false,
    pending_surface: true,
    surfaced_at: null,
  },
};

// ============================================================================
// RECOVERY SCENARIO FIXTURES
// ============================================================================

export const recoveryScenarios = {
  // Junior with no coach interest
  noCoachInterest: {
    trigger: "no_coach_interest",
    athlete_id: "athlete-behind-1",
    trigger_date: "2026-02-15",
    details: {
      schools_contacted: 22,
      responses_received: 2,
      positive_responses: 0,
    },
    recovery_plan: {
      title: "Coach Outreach Recovery",
      steps: [
        "Rebuild target school list with realistic options (add 20 DII/DIII/NAIA)",
        "Audit and update your highlight video",
        "Launch outreach blitz: 5 personalized emails per week",
        "Attend 1 targeted showcase where target schools recruit",
        "Check-in: By end of March, target 5-7 positive responses",
      ],
      duration_days: 30,
    },
  },

  // Senior with no offers
  seniorNoOffers: {
    trigger: "no_offers",
    athlete_id: "athlete-senior-no-offers",
    trigger_date: "2025-10-15",
    details: {
      interest_count: 1,
      schools_still_pursuing_di_only: true,
    },
    recovery_plan: {
      title: "Late Recruiting Recovery",
      steps: [
        "Expand levels immediately: Add 15 DIII, 10 NAIA, 5 JUCO programs",
        "Contact assistant coaches (they control recruiting at this stage)",
        "Play your best fall ball - scouts are actively evaluating",
        "Attend last-minute showcases (critical month)",
        "Check-in: By end of October, target 4-6 new conversations",
      ],
      duration_days: 30,
    },
  },

  // Academic eligibility risk
  academicRisk: {
    trigger: "eligibility_risk",
    athlete_id: "athlete-at-risk-1",
    trigger_date: "2026-03-01",
    details: {
      current_gpa: 2.4,
      required_gpa: 2.3,
      core_courses_remaining: 3,
      test_scores_submitted: false,
    },
    recovery_plan: {
      title: "Academic Eligibility Recovery",
      steps: [
        "Meet with guidance counselor today - confirm exact eligibility status",
        "Assess if GPA is recoverable with remaining courses",
        "Adjust school targets - remove high academic threshold schools",
        "Add JUCO as backup plan (legitimate path to D1 later)",
        "Create study plan with tutoring support",
      ],
      duration_days: 14,
    },
  },

  // Targeting unrealistic level
  unrealisticTargets: {
    trigger: "fit_gap",
    athlete_id: "athlete-overreach",
    trigger_date: "2026-01-15",
    details: {
      average_fit_score: 42,
      schools_at_reach_or_unlikely: 18,
      schools_at_match_or_safety: 0,
    },
    recovery_plan: {
      title: "Target School Realignment",
      steps: [
        'Get honest feedback from coaches: "What level fits me?"',
        "Accept assessment without arguing - coaches know their rosters",
        "Rebuild list to realistic tier: 20 schools with fit score 70-85",
        "Execute harder at realistic tier - more frequent contact",
        "Take visits to realistic options - build real relationships",
      ],
      duration_days: 21,
    },
  },
};

// ============================================================================
// LATE JOINER ASSESSMENT FIXTURES
// ============================================================================

export const lateJoinerAssessment = {
  questions: [
    {
      id: "assessment-video",
      question: "Have you created a highlight video?",
      maps_to_task: "task-10-r1",
      follow_up: "Is it 3-5 minutes with your best plays first?",
    },
    {
      id: "assessment-contact",
      question: "Have you contacted any college coaches?",
      maps_to_task: "task-10-r5",
      follow_up: "Approximately how many coaches have you emailed?",
    },
    {
      id: "assessment-list",
      question: "Do you have a target school list?",
      maps_to_task: "task-10-r3",
      follow_up: "How many schools are on your list?",
    },
    {
      id: "assessment-eligibility",
      question: "Have you registered with the NCAA or NAIA Eligibility Center?",
      maps_to_task: "task-11-a1",
      follow_up: null,
    },
    {
      id: "assessment-visits",
      question: "Have you taken any campus visits (official or unofficial)?",
      maps_to_task: "task-11-r3",
      follow_up: "Which schools have you visited?",
    },
    {
      id: "assessment-tests",
      question: "Have you taken the SAT or ACT?",
      maps_to_task: "task-11-a3",
      follow_up: "Have you sent scores to the eligibility center?",
    },
  ],

  // Example assessment results for late joiner
  sampleResults: {
    athlete_id: "athlete-late-1",
    assessment_date: "2026-01-02",
    answers: {
      "assessment-video": {
        answer: true,
        details: "Created 4-minute highlight on Hudl",
      },
      "assessment-contact": {
        answer: true,
        details: "Emailed about 8 coaches",
      },
      "assessment-list": {
        answer: true,
        details: "List of 15 schools, mostly D1",
      },
      "assessment-eligibility": { answer: false, details: null },
      "assessment-visits": { answer: false, details: null },
      "assessment-tests": {
        answer: true,
        details: "ACT 26, not sent to eligibility center",
      },
    },
    tasks_to_mark_complete: [
      "task-10-r1",
      "task-10-r5",
      "task-10-r3",
      "task-11-a3",
    ],
    tasks_to_prioritize: ["task-11-a1", "task-11-r3", "task-11-r4"],
    suggested_phase: "junior",
    recovery_needed: true,
    recovery_focus:
      "Expand school list with realistic options, register for eligibility",
  },
};

// ============================================================================
// PARENT VIEW FIXTURES
// ============================================================================

export const testParentView = {
  parentUser: {
    id: "parent-user-1",
    email: "parent.johnson@example.com",
    role: "parent",
    linked_athlete_id: "athlete-on-track-1",
  },

  viewLogs: [
    {
      id: "view-log-1",
      parent_user_id: "parent-user-1",
      athlete_id: "athlete-on-track-1",
      viewed_item_type: "status",
      viewed_item_id: null,
      viewed_at: "2026-01-01T18:30:00Z",
    },
    {
      id: "view-log-2",
      parent_user_id: "parent-user-1",
      athlete_id: "athlete-on-track-1",
      viewed_item_type: "school",
      viewed_item_id: "school-match-1",
      viewed_at: "2026-01-01T18:32:00Z",
    },
    {
      id: "view-log-3",
      parent_user_id: "parent-user-1",
      athlete_id: "athlete-on-track-1",
      viewed_item_type: "task",
      viewed_item_id: "task-11-a1",
      viewed_at: "2026-01-01T18:35:00Z",
    },
  ],

  parentSpecificMessages: [
    {
      phase: "junior",
      division: "DI",
      message:
        "D1 baseball programs typically fill most roster spots by end of junior year. Early signing period is in November.",
    },
    {
      phase: "junior",
      division: "DII",
      message:
        "D2 programs often have more flexibility in timing. Most athletes here receive partial scholarships averaging 25-50% of costs.",
    },
    {
      phase: "junior",
      division: "DIII",
      message:
        "D3 programs don't offer athletic scholarships, but strong academic aid is common. Official visits can begin January 1 of junior year.",
    },
    {
      context: "silence",
      message:
        "Silence from coaches is normal at this stage. Lack of phone calls by January of senior year would be more concerning.",
    },
  ],
};

// ============================================================================
// NCAA/NAIA CALENDAR FIXTURES
// ============================================================================

export const recruitingCalendar = {
  // Baseball-specific timelines
  baseball: {
    earlySigningPeriod: {
      start: "November (second Wednesday)",
      end: "November (following Wednesday)",
      notes: "One week window for early NLI signing",
    },
    regularSigningPeriod: {
      start: "February (first Wednesday)",
      end: "August 1",
      notes: "Main signing period",
    },
    contactPeriods: {
      DI: {
        junior_year: "September 1 - July 31 (limited contact until June 15)",
        notes:
          "Coaches can contact athletes starting June 15 after sophomore year",
      },
      DII: {
        junior_year: "June 15 after sophomore year",
        notes: "More flexible contact rules than D1",
      },
      DIII: {
        any_time: "No contact restrictions",
        notes: "D3 has no official contact periods",
      },
    },
    deadPeriods: [
      { name: "Thanksgiving Week", dates: "Wed-Sun of Thanksgiving" },
      { name: "Winter Break", dates: "Dec 23 - Jan 2 (approximate)" },
    ],
  },

  // Key deadlines
  keyDeadlines: {
    ncaaEligibilityRegistration: {
      recommended: "End of junior year",
      required: "Before signing NLI",
    },
    fafsaOpen: "October 1",
    fafsaDeadline: "Varies by state (check specific requirements)",
    collegeAppDeadlines: {
      earlyDecision: "November 1 (typical)",
      earlyAction: "November 15 (typical)",
      regularDecision: "January 1-15 (typical)",
    },
  },
};

// ============================================================================
// STATUS SCORE CALCULATION FIXTURES
// ============================================================================

export const statusScoreTestCases = {
  // Perfect score scenario
  perfectScore: {
    input: {
      taskCompletionRate: 1.0, // 100% of required tasks
      interactionFrequencyScore: 1.0, // Regular cadence
      coachInterestScore: 1.0, // Strong interest from A schools
      academicStandingScore: 1.0, // Above requirements
    },
    expected: {
      score: 100,
      label: "on_track",
      color: "green",
    },
  },

  // On-track scenario (75+)
  onTrack: {
    input: {
      taskCompletionRate: 0.85,
      interactionFrequencyScore: 0.7,
      coachInterestScore: 0.8,
      academicStandingScore: 0.9,
    },
    expected: {
      // (0.85 * 35) + (0.70 * 25) + (0.80 * 25) + (0.90 * 15) = 29.75 + 17.5 + 20 + 13.5 = 80.75
      score: 81,
      label: "on_track",
      color: "green",
    },
  },

  // Slightly behind scenario (50-74)
  slightlyBehind: {
    input: {
      taskCompletionRate: 0.6,
      interactionFrequencyScore: 0.5,
      coachInterestScore: 0.55,
      academicStandingScore: 0.7,
    },
    expected: {
      // (0.60 * 35) + (0.50 * 25) + (0.55 * 25) + (0.70 * 15) = 21 + 12.5 + 13.75 + 10.5 = 57.75
      score: 58,
      label: "slightly_behind",
      color: "yellow",
    },
  },

  // At-risk scenario (0-49)
  atRisk: {
    input: {
      taskCompletionRate: 0.3,
      interactionFrequencyScore: 0.2,
      coachInterestScore: 0.25,
      academicStandingScore: 0.4,
    },
    expected: {
      // (0.30 * 35) + (0.20 * 25) + (0.25 * 25) + (0.40 * 15) = 10.5 + 5 + 6.25 + 6 = 27.75
      score: 28,
      label: "at_risk",
      color: "red",
    },
  },

  // Edge case: All zeros
  allZeros: {
    input: {
      taskCompletionRate: 0,
      interactionFrequencyScore: 0,
      coachInterestScore: 0,
      academicStandingScore: 0,
    },
    expected: {
      score: 0,
      label: "at_risk",
      color: "red",
    },
  },

  // Edge case: Threshold boundary (exactly 75)
  thresholdBoundary75: {
    input: {
      taskCompletionRate: 0.75,
      interactionFrequencyScore: 0.75,
      coachInterestScore: 0.75,
      academicStandingScore: 0.75,
    },
    expected: {
      score: 75,
      label: "on_track", // 75 is on_track threshold
      color: "green",
    },
  },

  // Edge case: Threshold boundary (exactly 50)
  thresholdBoundary50: {
    input: {
      taskCompletionRate: 0.5,
      interactionFrequencyScore: 0.5,
      coachInterestScore: 0.5,
      academicStandingScore: 0.5,
    },
    expected: {
      score: 50,
      label: "slightly_behind", // 50 is slightly_behind threshold
      color: "yellow",
    },
  },
};

// ============================================================================
// FIT SCORE CALCULATION FIXTURES
// ============================================================================

export const fitScoreTestCases = {
  // Strong fit - all dimensions high
  strongFit: {
    input: {
      athleticFit: 36, // out of 40
      academicFit: 22, // out of 25
      opportunityFit: 17, // out of 20
      personalFit: 13, // out of 15
    },
    expected: {
      score: 88,
      tier: "safety",
    },
  },

  // Match fit
  matchFit: {
    input: {
      athleticFit: 30,
      academicFit: 20,
      opportunityFit: 14,
      personalFit: 11,
    },
    expected: {
      score: 75,
      tier: "match",
    },
  },

  // Reach fit
  reachFit: {
    input: {
      athleticFit: 24,
      academicFit: 18,
      opportunityFit: 10,
      personalFit: 10,
    },
    expected: {
      score: 62,
      tier: "reach",
    },
  },

  // Unlikely fit
  unlikelyFit: {
    input: {
      athleticFit: 16,
      academicFit: 12,
      opportunityFit: 8,
      personalFit: 6,
    },
    expected: {
      score: 42,
      tier: "unlikely",
    },
  },

  // Partial data - missing opportunity and personal
  partialData: {
    input: {
      athleticFit: 32,
      academicFit: 20,
      opportunityFit: null,
      personalFit: null,
    },
    expected: {
      score: 52, // Only athletic + academic calculated, scaled appropriately
      tier: "reach",
      missing_dimensions: ["opportunity", "personal"],
      data_complete: false,
    },
  },
};

// ============================================================================
// PORTFOLIO HEALTH FIXTURES
// ============================================================================

export const portfolioHealthTestCases = {
  // Healthy portfolio
  healthy: {
    schools: [
      { fit_tier: "reach" },
      { fit_tier: "reach" },
      { fit_tier: "match" },
      { fit_tier: "match" },
      { fit_tier: "match" },
      { fit_tier: "safety" },
      { fit_tier: "safety" },
    ],
    expected: {
      reaches: 2,
      matches: 3,
      safeties: 2,
      warnings: [],
      status: "healthy",
    },
  },

  // All reaches - warning
  allReaches: {
    schools: [
      { fit_tier: "reach" },
      { fit_tier: "reach" },
      { fit_tier: "reach" },
      { fit_tier: "unlikely" },
      { fit_tier: "unlikely" },
    ],
    expected: {
      reaches: 3,
      matches: 0,
      safeties: 0,
      unlikelies: 2,
      warnings: [
        "No match schools",
        "No safety schools",
        "Portfolio heavily weighted toward reaches",
      ],
      status: "at_risk",
    },
  },

  // No safeties - warning
  noSafeties: {
    schools: [
      { fit_tier: "reach" },
      { fit_tier: "reach" },
      { fit_tier: "match" },
      { fit_tier: "match" },
    ],
    expected: {
      reaches: 2,
      matches: 2,
      safeties: 0,
      warnings: ["No safety schools - consider adding backup options"],
      status: "needs_attention",
    },
  },

  // Empty list
  emptyList: {
    schools: [],
    expected: {
      reaches: 0,
      matches: 0,
      safeties: 0,
      warnings: ["No schools on list - start building your target list"],
      status: "not_started",
    },
  },
};

// ============================================================================
// EXPORT ALL FIXTURES
// ============================================================================

export const timelineTestData = {
  // Tasks
  tasks: {
    freshman: freshmanTasks,
    sophomore: sophomoreTasks,
    junior: juniorTasks,
    senior: seniorTasks,
    all: allTasks,
  },

  // Phase milestones
  phaseMilestones,

  // Athletes
  athletes: testAthletes,

  // Schools with fit scores
  schools: testSchoolsWithFitScores,

  // Suggestions
  suggestions: testSuggestions,

  // Recovery scenarios
  recoveryScenarios,

  // Late joiner assessment
  lateJoinerAssessment,

  // Parent view
  parentView: testParentView,

  // Calendar
  recruitingCalendar,

  // Test cases
  testCases: {
    statusScore: statusScoreTestCases,
    fitScore: fitScoreTestCases,
    portfolioHealth: portfolioHealthTestCases,
  },
};

export default timelineTestData;
