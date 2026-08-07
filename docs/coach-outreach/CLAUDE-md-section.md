<!-- Merge this section into your existing CLAUDE.md -->

## Coach outreach templates

Feature docs: `docs/coach-outreach/HANDOFF.md`. Template copy lives only in
`docs/coach-outreach/template-library-seed.sql` — never duplicate template
bodies into code or other docs.

These rules come from direct college-coach feedback. They look arbitrary; they
aren't. Do not "clean them up."

- **Never add a `gpa_weighted` column.** Coaches use unweighted only. Storing it
  invites a future template to expose it.
- **`athlete_metrics.value` stays `text`.** `1:52.4`, `.948`, `6'2"`, and
  `92.1 mph` are all valid across sports. Add a nullable `numeric_value`
  alongside if comparison is needed; never convert the column.
- **Metrics always render with source and date** — `92.1 mph (HitTrax, Jun 2026)`.
  Coaches discount unverified numbers.
- **Cap rendered metrics at 4** in the resolver, not the UI.
- **Video is linked, never attached.** Schedules may be PDF attachments; video
  never is.
- **`programNote` dedupe blocks sends.** An athlete-written note matching one
  sent to a different program means a mass email. Coaches can tell, and it's the
  most-cited reason they delete.
- **`updateHook` is required on every follow-up template.** No new fact, no send.
- **Warn — don't block — when `athletes.managed_by_parent` is true.** Parent-sent
  first contact is a red flag to coaches.

### Naming

Postgres columns are snake_case. Template variables are camelCase. The mapping
lives in `template_variables.key` / `source_path`, so column renames never break
saved templates. Do not create camelCase columns.

### Sport-agnostic

This app serves every sport. Metrics are athlete-labeled objects, not per-sport
columns. Per-sport label lists are *suggestions* in config only — never a hard
enum, or sports we didn't anticipate break.

`position` holds Position / Event / Weight class / Stroke depending on sport.
One column, dynamic label.

### Contact windows

Never hardcode NCAA contact dates in copy. They live in a config table keyed by
sport + division and they change (D1 baseball reworked 2023, eligibility rules
changed fall 2026). Always frame these as *reply expectations* in user-facing
text — athletes may email any coach at any time; only the coach's ability to
respond is regulated.
