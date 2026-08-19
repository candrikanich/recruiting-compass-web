-- Per-school coach-outreach answers backing the template variables
-- {{programNote}} ("why this program") and {{fitReason}} ("why it fits").
-- Prefilled into Quick Comm and editable on the school detail page.
alter table public.schools
  add column if not exists why_program text,
  add column if not exists fit_reason text;

comment on column public.schools.why_program is 'Athlete answer: why this program (backs template {{programNote}}); prefilled into Quick Comm and editable on school detail.';
comment on column public.schools.fit_reason is 'Athlete answer: why it fits (backs template {{fitReason}}).';
