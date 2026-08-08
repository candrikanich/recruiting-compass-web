# Template Library — what's in the seed file

**77 variables · 33 templates** (24 email, 7 text, 2 social). Sport-agnostic. `template-library-seed.sql` is the single source of truth — template bodies live there and nowhere else, so there's no doc to drift out of sync.

Both inserts are idempotent (`on conflict … do update`), so re-running after edits is safe.

---

## Template index

**Introductions (5)** — standard first contact · pre-contact-window variant · referral · late-cycle/senior · reconnect after a gap

**Updates (6)** — new metrics · new film · academic · season results · position or role change · injury and recovery

**Events (3)** — showcase or tournament · season schedule · registered for your camp

**Post-event (2)** — event follow-up · camp thank-you

**Relationship (8)** — no-response nudge · replying to a coach's first response · thank you after a call · visit request · thank you after a visit · asking where you stand · asking for time on an offer · declining respectfully

**Text (7)** — first text · event day · after a call · arriving on campus · quick update · after a visit · answering a question

**Social (2)** — public visit thank-you · commitment announcement

---

## Three templates most competitors don't publish

**`update-injury`.** Coaches hear about injuries through the grapevine regardless. An athlete who reports it directly, with a return timeline and a coach who can vouch for the rehab, builds more trust than one who goes quiet for four months. This is the template families most need and least expect.

**`decision-decline`.** Coaching staffs are small and they talk to each other. How an athlete closes a door follows them — into transfer conversations, into their coach's reputation with that staff, into their younger sibling's recruiting. Most athletes just stop replying.

**`intro-late-cycle`.** The recruiting-service content is overwhelmingly aimed at sophomores and juniors. D2, D3, NAIA, and JUCO programs recruit seniors and post-grads every single cycle, and those families have almost nothing written for them.

---

## Schema the seed expects

`template_variables` is as specced previously. `message_template` needs two columns beyond that spec:

```sql
alter table message_template
  add column contact_window text not null default 'any',  -- 'pre' | 'post' | 'any'
  add column title          text,
  add column length_target  text;
```

- **`contact_window`** drives automatic template selection. `pre` templates are shown when `division` + `sport` + `gradYear` say a coach can't legally reply yet — that's what swaps `intro-standard` for `intro-pre-window` without the athlete having to know the rule exists. `post` templates assume a two-way relationship and should stay hidden until there's a logged reply from that program.
- **`required_variables`** is the send gate — a jsonb array of authored keys that must be non-empty before the button enables.

---

## Variable categories

| Category | Count | Behavior |
|---|---|---|
| `player` | 14 | auto-fill |
| `academics` | 8 | auto-fill |
| `metrics` | 9 | auto-fill + computed |
| `contacts` | 8 | auto-fill |
| `program` | 12 | auto-fill per selected program |
| `event` | 10 | auto-fill per selected event |
| `authored` | 16 | **athlete writes at compose time** |
| `system` | 4 | generated at render |

The 16 authored variables are the whole design. Everything else is data the app already knows or can look up — the authored fields are where the athlete has to actually think, and they're what separates a message a coach reads from one they delete. Two are marked required by default (`programNote`, `updateHook`), plus `specificMoment` on thank-yous.

The example values in the registry are written to be usable as placeholder text in the compose UI. `programNote`'s example in particular models the right level of specificity — a real observation about a real program, not "I love your school."

---

## Validation to wire up

Blocking:
- any `{{unresolved}}` variable surviving in the rendered output
- an empty variable listed in the template's `required_variables`
- `programNote` matching a prior `athlete_messages.program_note` for a **different** program
- more than one recipient program per send

Warning:
- `athletes.managed_by_parent = true` on any intro or text template
- more than four metrics rendering
- a follow-up to a program contacted within the last 7 days
- a third nudge to a program that hasn't replied — offer "add more programs" instead of "send"

---

## Loading it

I haven't applied anything to your database. To load it yourself:

```bash
psql "$SUPABASE_DB_URL" -f template-library-seed.sql
```

Or paste into the SQL editor. The two `insert` statements are independent — variables first, templates second.

If you'd rather I apply it through the Supabase connector, tell me which project and I'll run the tables check first. I'd want to confirm your actual `athletes`, `programs`, and `coaches` table and column names before anything runs, since the `source_path` values in the registry are my guesses at your naming and they're the one thing in here that's likely wrong.
