# Coach Outreach Templates — handoff brief

Context for building the coach-outreach messaging feature in The Recruiting Compass. Read this before touching `template-library-seed.sql`.

---

## What this feature is

High school athletes send messages to college coaches — introductions, updates with new stats or film, alerts about upcoming showcases and games, thank-yous, and follow-ups. The app fills templates from profile data plus a small set of fields the athlete writes themselves.

The goal is a message a coach will actually read. Research for this drew on NCSA, SportsRecruits, IMG Academy, 2aDays, EXACT Sports, NextCommit, and Baseball Bound, plus a January 2026 ScoutConnect poll of five current college coaches (SEC assistant, two mid-major D1, NJCAA D1 head coach, D2 head coach) answering directly on what they want and what makes them delete an email.

Sport-agnostic by requirement. Any athlete in any sport uses the same templates.

---

## Files

- `template-library-seed.sql` — 77 variables + 33 templates. **Single source of truth for template copy.** Idempotent (`on conflict do update`), safe to re-run.
- `template-library-README.md` — template index, validation rules, category breakdown.

---

## Product rules that must not be optimized away

These look arbitrary in code. They aren't — each traces to something a coach said directly.

1. **No `gpa_weighted` column. Ever.** A coach was emphatic that weighted GPA is meaningless to him, because admissions and academic money run off unweighted. Storing it and hiding it invites a future template to expose it.

2. **`athlete_metrics.value` is `text`, not numeric.** `1:52.4`, `.948`, `6'2"`, and `92.1 mph` are all valid metric values across sports and none parse as numbers. If division-fit comparison is needed later, add a nullable `numeric_value` alongside, populated only where it parses.

3. **Metrics render with provenance.** Every number shows source and date: `92.1 mph (HitTrax, Jun 2026)`. Coaches discount unverified figures. This is why metrics are objects, not strings.

4. **Cap the rendered metrics block at 4.** A coach's stated non-want was every statistic collected over five years. Enforce in the resolver, not in the UI.

5. **Video is linked, never attached.** Attachments trip spam filters. Schedules as PDF are fine — one coach asked for that specifically. Video never is.

6. **`programNote` dedupe is the highest-value guardrail in the system.** Coaches said outright they can tell when they've been BCC'd, and wrong-coach-name / wrong-school-name was the most-cited dealbreaker. An athlete-written, per-program sentence that doesn't match one sent elsewhere is what prevents it.

7. **`updateHook` required on every follow-up.** No new fact, no send. Prevents the most common failure mode.

8. **Parent-sent messages get a hard warning.** All five coaches called parent-sent first contact a red flag. `athletes.managed_by_parent` drives it. Warn, don't block.

9. **Columns stay snake_case; camelCase happens at the resolver.** Template variables are camelCase (`{{playerName}}`), but camelCase Postgres columns mean double-quoting identifiers forever. `template_variables.key` owns the public name, so a column rename never breaks a saved template.

---

## Sport-agnostic design

**Metrics** are athlete-labeled objects — `{label, value, source, measured_on, is_verified, is_primary}`. A swimmer's PR, a wrestler's weight class, and a shortstop's 60 time all fit. Ship per-sport label *suggestions* in config, never a hard list, or you break the sports nobody anticipated.

**`position`** needs a dynamic label by sport — Position / Event / Weight class / Stroke — but stays one column. "2028 100 Free" and "2028 Shortstop" both read fine in the same subject-line slot.

**Event slots split from events** is what carries this through to data. A baseball tournament has three slots with opponents and field numbers; a swim meet has four with heats and no opponent; a golf tournament has one. Null columns drop out of the rendered line.

---

## Contact-window logic

Frame everywhere as *reply expectations*, never permission. Athletes may email any coach at any time; only the coach's ability to respond is regulated.

- NCAA D1: June 15 after sophomore year **or** September 1 of junior year, varies by sport (men's ice hockey earlier; lacrosse uses Sept 1)
- NCAA D2: electronic communication generally unrestricted; in-person from June 15 after sophomore year
- D3, NAIA, NJCAA: no NCAA-mandated restrictions

**Store per sport and division in a config table. Never hardcode dates in copy.** These rules move — D1 baseball's calendar was reworked in 2023, eligibility rules changed again for fall 2026. Verify current dates against the NCAA source before launch.

`message_template.contact_window` (`pre` / `post` / `any`) drives this. When `division` + `sport` + `gradYear` say a coach can't reply yet, `intro-pre-window` is shown instead of `intro-standard` — the athlete never has to learn the rule exists.

---

## Open questions — resolve before writing RLS

**Do parents get their own auth users, or share the athlete's login?** The RLS policies I sketched assume a direct `athletes.user_id` check. If parents authenticate separately, you need a membership join table and every policy changes shape. This is also entangled with `managed_by_parent` driving send warnings.

**What are the real table and column names?** The `source_path` values in the variable registry are guesses — `athletes.hometown_city`, `programs.school_name`, `coaches.last_name`. These are the most likely thing in the seed to be wrong. Verify before applying.

---

## Build order

1. `athlete_metrics` table + `video_link` column — these two unblock every template in the library
2. Resolver: `renderMetrics`, `renderCarryingTool`, `renderSchedule`, `coachSalutation`
3. Remaining profile columns
4. `template_variables` registry — after this the picker is data-driven, no deploys to add a variable
5. `athlete_messages` + validation, including the `programNote` dedupe check
6. Event tables + schedule row builder
7. Contact-window config and automatic template selection

Steps 1–2 are the difference between an email a coach can evaluate and one they can't. Everything after compounds.

---

## First task

Do not write a migration yet. Read `template-library-seed.sql` and `template-library-README.md`, inspect the actual Supabase schema, and report every place the seed's assumptions don't match what's really there — table names, column names, existing fields that already cover a proposed variable, conflicts with current types. Then we'll correct the seed and migrate.
