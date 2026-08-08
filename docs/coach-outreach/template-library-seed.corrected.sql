-- ============================================================================
-- The Recruiting Compass — Coach Outreach Template Library (CORRECTED)
-- Retargeted to the LIVE schema. See migration-build-plan.md + schema-reconciliation.md.
--
-- DEPENDS ON migration phases (run first, via Supabase MCP apply_migration):
--   Phase 0 — communication_templates gets: slug, stage, contact_window,
--             required_variables, send_timing_note, length_target, sort_order
--   Phase 1 — users gets: jersey_number, height_inches, weight_lbs, high_school,
--             club_team, dominant_side, hometown_city, hometown_state (backfilled)
--   template_variables table created (registry below).
--
-- Idempotent (on conflict do update). Data only — no DDL here.
--
-- source_path convention (resolver contract):
--   column:<table>.<col>   auto-fill from a resolved entity column
--   pref:player.<key>      user_preferences category='player' data jsonb key
--   (source_type=computed) assembled by resolver (path null)
--   (source_type=authored) athlete writes at compose; can gate send
--   (source_type=system)   generated at render
-- Entities: athlete=users(+pref), program=schools, coach=coaches, event=events.
-- Where a field is in BOTH users + pref, users is canonical (column first, jsonb fallback).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1 — VARIABLE REGISTRY  (77 vars, source_path corrected to real schema)
-- NEW = column added in Phase 1.  PREF = read from player jsonb, no promotion.
-- ----------------------------------------------------------------------------

insert into template_variables
  (key, label, description, category, source_type, source_path, is_required_default, example, sort_order)
values

-- Player identity -------------------------------------------------------------
('playerName',        'Full name',          'Athlete''s full name',                         'player','column','column:users.full_name',           false,'Jordan Ellis',        10),
('playerFirstName',   'First name',         'Athlete''s first name (split from full name)', 'player','computed',null,                              false,'Jordan',              11),
('gradYear',          'Grad year',          'Expected high school graduation year',         'player','column','column:users.graduation_year',      false,'2028',                12),
('sport',             'Sport',              'Athlete''s sport (users.primary_sport_id → sports.name; pref fallback)','player','computed',null,     false,'Baseball',            13),
('position',          'Position / event',   'Position/event/stroke/weight class (primary_position_id → positions.name, else custom; pref fallback)','player','computed',null,false,'Shortstop',14),
('positionSecondary', 'Secondary position', 'Second position or event',                     'player','computed',null,                              false,'Second base',         15),
('jerseyNumber',      'Jersey number',      'Number coaches should look for [NEW column]',   'player','column','column:users.jersey_number',       false,'14',                  16),
('height',            'Height',             'Formatted from users.height_inches [NEW]',      'player','computed',null,                              false,'6''2"',               17),
('weight',            'Weight',             'Formatted from users.weight_lbs [NEW]',         'player','computed',null,                              false,'185 lbs',             18),
('dominantSide',      'Dominant side',      'Bats/throws etc [NEW column, backfilled bats/throws]','player','column','column:users.dominant_side', false,'R/R',                 19),
('highSchool',        'High school',        'Current high school [NEW column, backfilled]',  'player','column','column:users.high_school',         false,'Olmsted Falls HS',    20),
('clubTeam',          'Club team',          'Club/travel/AAU/academy team [NEW, backfilled]','player','column','column:users.club_team',           false,'Ohio Elite 17U',      21),
('hometownCity',      'Hometown city',      'City coaches recruit from [NEW column]',        'player','column','column:users.hometown_city',       false,'Olmsted Falls',       22),
('hometownState',     'Hometown state',     'State abbreviation [NEW column]',               'player','column','column:users.hometown_state',      false,'OH',                  23),

-- Academics -------------------------------------------------------------------
('gpaUnweighted',     'Unweighted GPA',     'Unweighted GPA — the only one coaches use',    'academics','column','column:users.gpa',             false,'3.68',                30),
('testLabel',         'Test name',          'ACT or SAT (resolver picks from sat_score/act_score)','academics','computed',null,                    false,'ACT',                 31),
('testScore',         'Test score',         'Score for the preferred test (users.sat_score / act_score)','academics','computed',null,             false,'29',                  32),
('classRank',         'Class rank',         'Class rank if it helps [absent → authored]',    'academics','authored',null,                          false,'22 of 310',           33),
('intendedMajor',     'Intended major',     'Field the athlete plans to study [absent → authored]','academics','authored',null,                    false,'Mechanical Engineering',34),
('academicHonors',    'Academic honors',    'Honor roll, AP, awards [absent → authored]',    'academics','authored',null,                          false,'AP Scholar, 4 AP courses',35),
('ncaaId',            'NCAA ID',            'NCAA Eligibility Center ID [PREF]',             'academics','column','pref:player.ncaa_id',           false,'2109887654',          36),
('transcriptLink',    'Transcript link',    'Latest transcript from documents (resolver)',   'academics','computed',null,                          false,'https://…',           37),

-- Athletic proof ---------------------------------------------------------------
('metrics',           'Metrics block',      'Top metrics w/ source+date, cap 4 (performance_metrics)','metrics','computed',null,                   false,'- 60-yard dash: 6.71 (Perfect Game, Jun 2026)',40),
('carryingTool',      'Carrying tool',      'Single best number (is_primary) — leads subject','metrics','computed',null,                           false,'6.71 60-yard dash',   41),
('metricsAsOf',       'Metrics as of',      'Date of most recent metric',                    'metrics','computed',null,                             false,'June 2026',           42),
('videoLink',         'Film link',          'First of pref player.video_links — never attached','metrics','column','pref:player.video_links',      false,'https://…',           43),
('profileLink',       'Profile link',       'Built from player_profiles slug (resolver)',    'metrics','computed',null,                             false,'https://…',           44),
('seasonStatLine',    'Season stat line',   'Production line, recent season [absent → authored]','metrics','authored',null,                        false,'.412 / 8 2B / 21 SB', 45),
('awards',            'Awards',             'Individual honors [absent → authored]',         'metrics','authored',null,                             false,'First Team All-Conference',46),
('teamAccomplishment','Team accomplishment','Team result [absent → authored]',              'metrics','authored',null,                             false,'District runner-up',  47),

-- Contacts ---------------------------------------------------------------------
('playerPhone',       'Recruiting phone',   'Recruiting contact number (player profile, not login) [PREF]','contacts','column','pref:player.phone', false,'440-555-0134',        50),
('playerEmail',       'Recruiting email',   'Recruiting contact email (player profile, can differ from login) [PREF]','contacts','column','pref:player.email',false,'jordan.ellis28@…',51),
('hsCoachName',       'HS coach name',      'Grade-appropriate HS coach from pref (resolver picks by gradYear)','contacts','computed',null,        false,'Dave Reilly',         52),
('hsCoachPhone',      'HS coach phone',     'HS coach phone [absent → authored]',            'contacts','authored',null,                           false,'440-555-0177',        53),
('hsCoachEmail',      'HS coach email',     'HS coach email [absent → authored]',            'contacts','authored',null,                           false,'dreilly@…',           54),
('clubCoachName',     'Club coach name',    'Travel/club coach [PREF travel_team_coach]',    'contacts','column','pref:player.travel_team_coach',  false,'Marcus Webb',         55),
('clubCoachPhone',    'Club coach phone',   'Club coach phone [absent → authored]',          'contacts','authored',null,                           false,'216-555-0192',        56),
('clubCoachEmail',    'Club coach email',   'Club coach email [absent → authored]',          'contacts','authored',null,                           false,'mwebb@…',             57),

-- Program (selected school + coach) -------------------------------------------
('coachFirstName',    'Coach first name',   'Coach''s first name',                          'program','column','column:coaches.first_name',       false,'Ryan',                60),
('coachLastName',     'Coach last name',    'Coach''s last name',                           'program','column','column:coaches.last_name',        false,'Delgado',             61),
('coachSalutation',   'Coach salutation',   'Coach + last name (resolver default)',          'program','computed',null,                            false,'Coach Delgado',       62),
('coachTitle',        'Coach title',        'coaches.role enum: head|assistant|recruiting',  'program','column','column:coaches.role',            false,'Recruiting Coordinator',63),
('schoolName',        'School name',        'Full school name',                             'program','column','column:schools.name',            false,'State University',    64),
('schoolShortName',   'School short name',  'Short reference (resolver derives from name)',  'program','computed',null,                            false,'State',               65),
('programMascot',     'Mascot',             'Team nickname [absent → authored]',            'program','authored',null,                            false,'Falcons',             66),
('division',          'Division',           'NCAA division / association level',            'program','column','column:schools.division',        false,'NCAA Division II',    67),
('conference',        'Conference',         'Athletic conference',                          'program','column','column:schools.conference',      false,'GMAC',                68),
('schoolCity',        'School city',        'Campus city',                                  'program','column','column:schools.city',            false,'Columbus',            69),
('schoolState',       'School state',       'State abbreviation',                           'program','column','column:schools.state',           false,'OH',                  70),
('schoolTwitter',     'School X handle',    'Handle without @ — public posts only',         'program','column','column:schools.twitter_handle',  false,'StateBaseball',       71),

-- Event (selected event) ------------------------------------------------------
('eventName',         'Event name',         'Camp/showcase/tournament/meet/game',           'event','column','column:events.name',               false,'Midwest Prospect Showcase',80),
('eventDates',        'Event dates',        'Formatted from events.start_date/end_date',     'event','computed',null,                              false,'July 18–19',          81),
('eventLocation',     'Event location',     'City and venue',                               'event','column','column:events.location',           false,'Grand Park, Westfield IN',82),
('eventSchedule',     'Event schedule',     'Rendered slot rows (Phase 6 event_slots)',      'event','computed',null,                              false,'- Sat Jul 18, 9:00 AM vs Northeast Elite — Field 4',83),
('teamAtEvent',       'Team at event',      'Team they play for there [absent → authored]',  'event','authored',null,                              false,'Ohio Elite 17U',      84),
('roleNote',          'Role note',          'When they pitch/swim/expected role [authored]', 'event','authored',null,                              false,'Scheduled to pitch Saturday AM',85),
('rosterLink',        'Roster link',        'Event roster / heat sheet (events.url)',        'event','column','column:events.url',                false,'https://…',           86),
('nextEventName',     'Next event',         'Following event on the calendar (resolver)',    'event','computed',null,                              false,'Buckeye Elite Classic',87),
('nextEventDates',    'Next event dates',   'Dates of the next event (resolver)',            'event','computed',null,                              false,'August 8–10',         88),
('visitDate',         'Visit date',         'Date of a camp/campus visit (events.start_date)','event','column','column:events.start_date',        false,'July 22',             89),

-- Athlete-authored — these gate the send button ------------------------------
('programNote',       'Why this program',   'One true, specific sentence about THIS program. Blocks send if empty or reused.','authored','authored',null,true,'Your staff has developed three all-conference middle infielders in four years, and that track record is why I''m reaching out.',100),
('fitReason',         'Why it fits',        'Academic, geographic, or style-of-play fit',   'authored','authored',null,               false,'Your engineering program and the drive from home both work for my family.',101),
('updateHook',        'What''s new',        'The new fact justifying this message. Required on every follow-up.','authored','authored',null,true,'I ran a verified 6.71 sixty at Perfect Game last weekend, down from 6.88 in the fall.',102),
('updateHookShort',   'What''s new, short', 'Subject-line version of the update',           'authored','authored',null,               false,'New 6.71 sixty',      103),
('filmDescription',   'About the film',     'Angle and what''s shown — no slow motion, no music','authored','authored',null,          false,'Open-side hitting from behind the plate, then infield reps showing footwork and exchange.',104),
('performanceSummary','How it went',        'Two honest sentences. Accurate beats flattering.','authored','authored',null,            false,'Went 4-for-9 with two doubles and handled everything hit at me. Chased a few sliders I should have taken.',105),
('specificMoment',    'Something specific', 'A detail only someone who was there could write','authored','authored',null,             true, 'The cue you gave me on keeping my hands inside the ball made an immediate difference.',106),
('questionBack',      'Your question',      'A question keeps the thread alive; a thank-you ends it.','authored','authored',null,     false,'What do you look for at my position, and how much of the class have you filled?',107),
('answerTheirQuestion','Your answer',       'Answer what the coach actually asked',         'authored','authored',null,               false,'',                    108),
('specificTakeaway',  'Takeaway',           'One thing from the call worth repeating back', 'authored','authored',null,               false,'What you said about the fall development plan stuck with me.',109),
('injuryNote',        'Injury status',      'What happened and where recovery stands',      'authored','authored',null,               false,'I had a labrum repair in March and was cleared to throw in June.',110),
('returnTimeline',    'Return timeline',    'When they''ll be back to full competition',    'authored','authored',null,               false,'Full-go by fall ball in September.',111),
('decisionTimeframe', 'Decision timeframe', 'When the athlete needs to decide',             'authored','authored',null,               false,'the end of the fall',112),
('offerDetails',      'Offer details',      'What was offered, in the athlete''s words',    'authored','authored',null,               false,'',                    113),
('roleChange',        'Role change',        'New position, new role, or new event',         'authored','authored',null,               false,'I''ve moved from second base to shortstop full time this summer.',114),
('referrerName',      'Who referred you',   'The coach or contact who made the connection', 'authored','authored',null,               false,'Marcus Webb',         115),

-- System ----------------------------------------------------------------------
('todayDate',         'Today''s date',      'Current date, formatted',                      'system','system',null,                    false,'August 7, 2026',      120),
('seasonLabel',       'Season label',       'Current season in context',                    'system','computed',null,                   false,'summer',              121),
('contactWindowDate', 'Contact date',       'When coaches at this level can respond (contact_window_rules)','system','computed',null, false,'August 1, 2027',      122),
('daysSinceContact',  'Days since contact', 'Days since last message to this program (athlete_messages)','system','computed',null,     false,'11',                  123)

on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  source_type = excluded.source_type,
  source_path = excluded.source_path,
  is_required_default = excluded.is_required_default,
  example = excluded.example,
  sort_order = excluded.sort_order;


-- ----------------------------------------------------------------------------
-- SECTION 2 — TEMPLATES  → into EXISTING communication_templates (not a new table)
-- Column mapping: title→name, channel→type, subject_template→subject,
--                 body_template→body. is_predefined=true for all 33.
-- type CHECK vocab is email|message|phone_script → texts use 'message';
--   'social' is a NEW type value, added to the CHECK in Phase 0.
-- Requires Phase 0 columns (slug, stage, contact_window, required_variables,
-- send_timing_note, length_target, sort_order).
-- ----------------------------------------------------------------------------

insert into communication_templates
  (slug, type, stage, contact_window, name, send_timing_note, length_target,
   subject, body, required_variables, sort_order, is_predefined)
values

-- === INTRODUCTIONS =========================================================

('intro-standard','email','intro','any',
 'First contact',
 'Any time. Athletes may email at any age — only the coach''s ability to reply is regulated.',
 '150 words',
 $s${{gradYear}} {{position}} | {{carryingTool}} | {{playerName}} | {{hometownCity}}, {{hometownState}}$s$,
 $b${{coachSalutation}},

My name is {{playerName}}. I'm a {{gradYear}} {{position}} at {{highSchool}} in {{hometownCity}}, {{hometownState}}, and I compete for {{clubTeam}}.

{{programNote}} {{fitReason}}

Where I am right now:
{{metrics}}
- {{gpaUnweighted}} unweighted GPA, {{testLabel}} {{testScore}}, planning to study {{intendedMajor}}

Film: {{videoLink}}
Full profile: {{profileLink}}

My coaches are glad to talk:
{{hsCoachName}}, {{highSchool}} — {{hsCoachPhone}}
{{clubCoachName}}, {{clubTeam}} — {{clubCoachPhone}}

I've completed your recruiting questionnaire. I'd welcome any feedback on my film and what you'd want to see from me to fit at {{schoolName}}.

Thank you for your time,
{{playerName}}
{{gradYear}} | {{position}} | {{highSchool}}
{{playerPhone}} | {{playerEmail}}$b$,
 '["programNote"]'::jsonb, 10, true),

('intro-pre-window','email','intro','pre',
 'First contact — before the contact date',
 'For athletes whose sport and division don''t yet allow a coach to reply. Setting that expectation yourself reads as maturity.',
 '150 words',
 $s${{gradYear}} {{position}} | {{carryingTool}} | {{playerName}} | {{hometownCity}}, {{hometownState}}$s$,
 $b${{coachSalutation}},

My name is {{playerName}}. I'm a {{gradYear}} {{position}} at {{highSchool}} in {{hometownCity}}, {{hometownState}}, and I compete for {{clubTeam}}.

{{programNote}} {{fitReason}}

Where I am right now:
{{metrics}}
- {{gpaUnweighted}} unweighted GPA, planning to study {{intendedMajor}}

Film: {{videoLink}}
Full profile: {{profileLink}}

I understand you may not be able to respond in detail yet given where I am in school. I'll keep you updated as my numbers and film improve, and I hope to be on your list when those conversations can start. If your staff runs camps before then, I'd like to hear about them.

Thank you,
{{playerName}}
{{gradYear}} | {{position}} | {{highSchool}}
{{playerPhone}} | {{playerEmail}}$b$,
 '["programNote"]'::jsonb, 20, true),

('intro-referral','email','intro','any',
 'First contact — referred by a coach',
 'Send within days of the referral, while your name is still fresh with them.',
 '130 words',
 $s${{referrerName}} suggested I reach out — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

{{referrerName}} suggested I get in touch with you. My name is {{playerName}}, a {{gradYear}} {{position}} at {{highSchool}} in {{hometownCity}}, {{hometownState}}.

{{programNote}}

{{metrics}}
- {{gpaUnweighted}} unweighted GPA, {{testLabel}} {{testScore}}

Film: {{videoLink}}

{{referrerName}} can speak to how I work and where I'm headed. I'd appreciate any feedback on whether I'd be a fit at {{schoolName}}.

Thank you,
{{playerName}}
{{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["programNote","referrerName"]'::jsonb, 30, true),

('intro-late-cycle','email','intro','any',
 'First contact — senior or late in the cycle',
 'For seniors and post-grads still looking. Be direct about timing; D2, D3, NAIA, and JUCO programs recruit late every year.',
 '140 words',
 $s${{gradYear}} {{position}} still available | {{carryingTool}} | {{playerName}}$s$,
 $b${{coachSalutation}},

I'm {{playerName}}, a {{gradYear}} {{position}} at {{highSchool}} in {{hometownCity}}, {{hometownState}}. I'm still looking for the right program and wanted to reach out directly.

{{programNote}}

Current numbers as of {{metricsAsOf}}:
{{metrics}}
- {{gpaUnweighted}} unweighted GPA, {{testLabel}} {{testScore}}

Film: {{videoLink}}

I know where I am in the calendar. If you have a need at my position, I'd welcome a conversation — and if you don't, I'd still value knowing what level you think fits me.

{{hsCoachName}}, {{highSchool}} — {{hsCoachPhone}}
{{clubCoachName}}, {{clubTeam}} — {{clubCoachPhone}}

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["programNote"]'::jsonb, 40, true),

-- === UPDATES ================================================================

('update-metrics','email','update','any',
 'New verified numbers',
 'Within a week of a new verified reading. No more than about monthly per program.',
 '90 words',
 $s$Updated — {{carryingTool}} | {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Quick update: {{updateHook}}

Current numbers as of {{metricsAsOf}}:
{{metrics}}

{{schoolName}} is still near the top of my list. Film is current here: {{videoLink}}

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook"]'::jsonb, 50, true),

('update-film','email','update','any',
 'New film',
 'Whenever film is genuinely new. Link it — never attach video.',
 '90 words',
 $s$New film — {{playerName}} | {{gradYear}} {{position}} | {{highSchool}}$s$,
 $b${{coachSalutation}},

I posted new film: {{videoLink}}

{{filmDescription}}

Since I last reached out, {{updateHook}}

If you have a minute, I'd value your honest read on what stands out and what I need to clean up to compete at {{schoolName}}.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook","filmDescription"]'::jsonb, 60, true),

('update-academic','email','update','any',
 'Academic update',
 'New transcript, new test score, or a completed eligibility-center step.',
 '80 words',
 $s$Academic update — {{playerName}} | {{gradYear}} {{position}} | {{gpaUnweighted}} GPA$s$,
 $b${{coachSalutation}},

An academic update: {{updateHook}}

- Unweighted GPA: {{gpaUnweighted}}
- {{testLabel}}: {{testScore}}
- Intended major: {{intendedMajor}}
- {{academicHonors}}
- NCAA Eligibility Center ID: {{ncaaId}}

Still very interested in {{schoolName}}.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook"]'::jsonb, 70, true),

('update-season','email','update','any',
 'Season or team result',
 'End of a season, or after a result worth reporting.',
 '90 words',
 $s${{seasonLabel}} results — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Wrapping up {{seasonLabel}}: {{updateHook}}

- {{seasonStatLine}}
- {{teamAccomplishment}}
- {{awards}}

Film from the season: {{videoLink}}

Still very interested in {{schoolName}}, and I'd value knowing what you'd want to see from me next.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook"]'::jsonb, 80, true),

('update-role-change','email','update','any',
 'Position or role change',
 'When the athlete changes position, event, or role — coaches evaluate by roster slot.',
 '80 words',
 $s$Position update — {{playerName}} | {{gradYear}} | now {{position}}$s$,
 $b${{coachSalutation}},

Wanted to let you know about a change: {{roleChange}}

{{updateHook}}

Updated film showing the new role: {{videoLink}}

Current numbers:
{{metrics}}

I think this makes me a better fit for what {{schoolName}} needs, and I'd welcome your read on that.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["roleChange","updateHook"]'::jsonb, 90, true),

('update-injury','email','update','any',
 'Injury and recovery update',
 'Send it. Coaches hear about injuries anyway, and hearing it from the athlete first builds more trust than silence does.',
 '90 words',
 $s$Status update — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

I want to be straightforward with you about where I am. {{injuryNote}}

{{returnTimeline}}

I'm still very interested in {{schoolName}} and I'm not slowing down on the work — {{updateHook}}

{{hsCoachName}} at {{highSchool}} can speak to my rehab and progress: {{hsCoachPhone}}

I'll keep you posted as I get closer to full go.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["injuryNote","returnTimeline"]'::jsonb, 100, true),

-- === EVENTS =================================================================

('event-showcase','email','event','any',
 'Upcoming showcase or tournament',
 '10–14 days out. Coaches build their event schedules days ahead — a night-before email is wasted.',
 '140 words',
 $s${{eventName}} — {{playerName}} | {{gradYear}} {{position}} | #{{jerseyNumber}}$s$,
 $b${{coachSalutation}},

I'll be competing at {{eventName}} in {{eventLocation}}, {{eventDates}}, for {{teamAtEvent}}. I'll be #{{jerseyNumber}}.

Schedule:
{{eventSchedule}}

{{roleNote}}

If anyone on your staff is on site, I'd love the chance to be evaluated. Any feedback afterward would mean a lot.

Film if it's useful beforehand: {{videoLink}}
Event roster: {{rosterLink}}

{{hsCoachName}}, {{highSchool}} — {{hsCoachPhone}}
{{clubCoachName}}, {{clubTeam}} — {{clubCoachPhone}}

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '[]'::jsonb, 110, true),

('event-season-schedule','email','event','any',
 'Season schedule',
 'Start of a high school or club season, or when a coach asks for the schedule.',
 '110 words',
 $s${{highSchool}} {{seasonLabel}} schedule — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

My {{seasonLabel}} schedule is set. Any of these are open if you or someone on your staff is in the area:

{{eventSchedule}}

I wear #{{jerseyNumber}} and play {{position}}. {{roleNote}}

{{updateHook}}

{{hsCoachName}}, {{highSchool}} — {{hsCoachPhone}}

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '[]'::jsonb, 120, true),

('event-camp-registered','email','event','any',
 'Registered for your camp',
 'Right after registering. Coaches build evaluation lists before camp day.',
 '90 words',
 $s$Registered for {{eventName}} — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

I registered for {{eventName}} on {{visitDate}} and I'm looking forward to it.

{{programNote}}

So you know what to look for: I'm a {{gradYear}} {{position}}, {{height}}, {{dominantSide}}, and I'll be #{{jerseyNumber}}.

{{metrics}}

Film ahead of time: {{videoLink}}

I'd appreciate any direct evaluation you can give me while I'm there.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["programNote"]'::jsonb, 130, true),

-- === POST-EVENT =============================================================

('post-event-followup','email','post_event','any',
 'After a showcase or tournament',
 '24–72 hours after. Honest beats flattering — coaches named self-praise as content they don''t want.',
 '110 words',
 $s$Following up — {{eventName}} | {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thanks for the chance to be seen at {{eventName}}. I was #{{jerseyNumber}} for {{teamAtEvent}}.

How it went: {{performanceSummary}}

Updated numbers from the event:
{{metrics}}

Event film: {{videoLink}}

I'd value your evaluation, including what I need to improve. My next event is {{nextEventName}} on {{nextEventDates}}.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["performanceSummary"]'::jsonb, 140, true),

('post-camp-thanks','email','thanks','any',
 'Thank you after a camp',
 'Within 24–48 hours. CC the rest of the staff. For top programs, consider a handwritten note too — rare enough now that it lands.',
 '80 words',
 $s$Thank you — {{eventName}} | {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thank you for {{eventName}} on {{visitDate}}. {{specificMoment}}

It confirmed what I thought about {{schoolName}}. I'd like to stay in touch as I keep working.

Thank you again for your time,
{{playerName}}
{{gradYear}} | {{position}} | {{highSchool}}
{{playerPhone}} | {{playerEmail}}$b$,
 '["specificMoment"]'::jsonb, 150, true),

-- === RELATIONSHIP ===========================================================

('nudge-no-response','email','nudge','any',
 'Follow up after no response',
 '7–14 days after the intro, and only with a real update. Cap at two — then widen the list instead.',
 '80 words',
 $s${{updateHookShort}} — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Following up on my note from {{daysSinceContact}} days ago. Since then, {{updateHook}}

Current film: {{videoLink}}

I'm still very interested in {{schoolName}}. If it helps, my coach {{hsCoachName}} is happy to talk — {{hsCoachPhone}}.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook"]'::jsonb, 160, true),

('reply-first-response','email','reply','post',
 'Replying to a coach''s first response',
 'Within 24 hours. This is where most athletes stall out.',
 '90 words',
 $s$Re: {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thank you for getting back to me — that means a lot.

{{answerTheirQuestion}}

{{questionBack}}

My schedule over the next few weeks, in case any of it works:
{{eventSchedule}}

Thanks again,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["answerTheirQuestion","questionBack"]'::jsonb, 170, true),

('thanks-phone-call','email','thanks','post',
 'Thank you after a phone call',
 'Same day. Short.',
 '70 words',
 $s$Thank you for the call — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thanks for taking the time to talk today. {{specificTakeaway}}

{{questionBack}}

I'll keep you updated as things develop on my end.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["specificTakeaway"]'::jsonb, 180, true),

('visit-request','email','visit','post',
 'Requesting a visit',
 'After real back-and-forth. Offer specific dates — it makes saying yes easy.',
 '90 words',
 $s$Visit request — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

I'd like to get on campus and see {{schoolShortName}} in person.

{{programNote}}

These dates work for my family:
{{eventSchedule}}

If none of those fit, I'm glad to work around your calendar. I'd love to see a practice and meet some of the guys if that's possible.

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["programNote"]'::jsonb, 190, true),

('thanks-visit','email','thanks','post',
 'Thank you after a campus visit',
 'Within 24 hours. CC the full staff.',
 '90 words',
 $s$Thank you for the visit — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thank you for having me on campus on {{visitDate}}. {{specificMoment}}

{{fitReason}}

{{schoolName}} moved up my list after seeing it in person. I'd welcome a conversation about what comes next.

Please thank the rest of your staff for me as well.

{{playerName}}
{{gradYear}} | {{position}} | {{highSchool}}
{{playerPhone}} | {{playerEmail}}$b$,
 '["specificMoment"]'::jsonb, 200, true),

('status-check','email','status','post',
 'Asking where you stand',
 'Only after a call or a visit. Never as a second email.',
 '80 words',
 $s$Checking in on the {{gradYear}} class — {{playerName}} | {{position}}$s$,
 $b${{coachSalutation}},

I appreciate the conversations we've had about {{schoolName}}.

I'd like an honest read: where do I sit for you in the {{gradYear}} class, and what would you need to see from me between now and {{decisionTimeframe}}?

I'd rather know the real answer than guess at it. Either way, thank you for the time you've given me.

{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["decisionTimeframe"]'::jsonb, 210, true),

('decision-request-time','email','decision','post',
 'Asking for time on an offer',
 'Within a day or two of the offer. Being straight about your timeline is normal and coaches expect it.',
 '90 words',
 $s$Thank you — {{playerName}} | {{gradYear}} {{position}}$s$,
 $b${{coachSalutation}},

Thank you for the offer to join {{schoolName}}. It means a great deal, and I want you to know I'm taking it seriously.

{{offerDetails}}

I'd like to talk it through with my family and finish two visits I already have scheduled. Could I give you an answer by {{decisionTimeframe}}?

If that timeline creates a problem on your end, tell me and we'll work with it.

Thank you again,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["decisionTimeframe"]'::jsonb, 220, true),

('decision-decline','email','decision','post',
 'Declining respectfully',
 'Send it. Coaching staffs are small and they talk — how you close a door matters.',
 '80 words',
 $s$Thank you, {{coachSalutation}} — {{playerName}}$s$,
 $b${{coachSalutation}},

I want you to hear this from me directly: I've decided to commit elsewhere.

Thank you for the time and honesty you gave me through this process. {{specificMoment}}

I have a lot of respect for what you're building at {{schoolName}}, and I'll be pulling for your guys.

Thank you,
{{playerName}} | {{gradYear}} | {{position}}$b$,
 '["specificMoment"]'::jsonb, 230, true),

('reconnect','email','intro','any',
 'Reconnecting after a long gap',
 'Six months or more since the last contact. Lead with what changed, not with an apology.',
 '90 words',
 $s$Reintroducing myself — {{playerName}} | {{gradYear}} {{position}} | {{carryingTool}}$s$,
 $b${{coachSalutation}},

We connected a while back — I'm {{playerName}}, a {{gradYear}} {{position}} at {{highSchool}}. A lot has changed since then.

{{updateHook}}

Current numbers as of {{metricsAsOf}}:
{{metrics}}

New film: {{videoLink}}

{{schoolName}} is still a program I'd like to be part of. Worth another look?

Thank you,
{{playerName}} | {{gradYear}} | {{position}} | {{playerPhone}}$b$,
 '["updateHook"]'::jsonb, 240, true),

-- === TEXT ===================================================================
-- Gate all of these behind an explicit "the coach texted me first, or said it's OK" toggle.

('text-first','message','intro','post',
 'First text after permission',
 'Only after the coach texts first or says it''s fine.', '2 lines',
 null,
 $b${{coachSalutation}} — thanks for the OK to text. {{updateHook}}
Let me know if a call works better this week.
— {{playerName}}, {{gradYear}} {{position}}$b$,
 '["updateHook"]'::jsonb, 300, true),

('text-event-day','message','event','post',
 'Event day heads-up',
 'Morning of, or the night before.', '2 lines',
 null,
 $b${{coachSalutation}} — competing today at {{eventName}}, {{eventSchedule}}. #{{jerseyNumber}}, {{position}}. Hope to see you there.
— {{playerName}}, {{gradYear}}$b$,
 '[]'::jsonb, 310, true),

('text-post-call','message','thanks','post',
 'After a call',
 'Same day. Follow with an email to the full staff.', '2 lines',
 null,
 $b${{coachSalutation}} — thanks for the call today. {{specificTakeaway}} {{schoolShortName}} is a place I could see myself. Talk soon.
— {{playerName}}, {{gradYear}} {{position}}$b$,
 '["specificTakeaway"]'::jsonb, 320, true),

('text-arriving','message','visit','post',
 'Arriving on campus',
 'On arrival, if you''ve already been texting.', '1 line',
 null,
 $b${{coachSalutation}} — just got to campus, looking forward to today.
— {{playerName}}, {{gradYear}}$b$,
 '[]'::jsonb, 330, true),

('text-update','message','update','post',
 'Quick update',
 'Sparingly. Email is still the default channel for updates.', '2 lines',
 null,
 $b${{coachSalutation}} — quick one: {{updateHook}}. New film if you want it: {{videoLink}}
— {{playerName}}, {{gradYear}} {{position}}$b$,
 '["updateHook"]'::jsonb, 340, true),

('text-thanks-visit','message','thanks','post',
 'After a visit',
 'Same day, in addition to the email — not instead of it.', '2 lines',
 null,
 $b${{coachSalutation}} — thank you for today. {{specificTakeaway}} Really appreciated the time.
— {{playerName}}, {{gradYear}} {{position}}$b$,
 '["specificTakeaway"]'::jsonb, 350, true),

('text-schedule-reply','message','reply','post',
 'Answering a coach''s question by text',
 'Within a few hours. A reply the same day is plenty.', '2 lines',
 null,
 $b${{coachSalutation}} — {{answerTheirQuestion}}
— {{playerName}}, {{gradYear}} {{position}}$b$,
 '["answerTheirQuestion"]'::jsonb, 360, true),

-- === SOCIAL =================================================================

('social-visit-thanks','social','thanks','any',
 'Public thank-you after a visit',
 'After the visit, and after the private thank-you email.', '1 post',
 null,
 $b$Thank you to the coaching staff at @{{schoolTwitter}} for having me on campus today. Great to see the program up close.$b$,
 '[]'::jsonb, 400, true),

('social-commitment','social','decision','any',
 'Commitment announcement',
 'After you''ve told every coach who recruited you, privately, first.', '1 post',
 null,
 $b$Committed. Thank you to @{{schoolTwitter}} for the opportunity, and to my coaches and family for getting me here.$b$,
 '[]'::jsonb, 410, true)

-- partial unique index arbiter (Phase 0) requires the matching predicate here:
on conflict (slug) where slug is not null do update set
  type = excluded.type,
  stage = excluded.stage,
  contact_window = excluded.contact_window,
  name = excluded.name,
  send_timing_note = excluded.send_timing_note,
  length_target = excluded.length_target,
  subject = excluded.subject,
  body = excluded.body,
  required_variables = excluded.required_variables,
  sort_order = excluded.sort_order,
  is_predefined = excluded.is_predefined;
