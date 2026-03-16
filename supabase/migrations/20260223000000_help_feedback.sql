-- Help Center feedback table
-- Records thumbs up/down votes on help pages for content quality tracking

create table help_feedback (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,
  helpful     boolean not null,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

comment on table help_feedback is 'Thumbs up/down feedback for help center pages';
comment on column help_feedback.page is 'The /help/[slug] path that received feedback';
comment on column help_feedback.helpful is 'true = thumbs up, false = thumbs down';

-- Allow authenticated users to insert their own feedback
create policy "Users can submit help feedback"
  on help_feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Allow service role to read all feedback (for admin/analytics)
create policy "Service role can read all help feedback"
  on help_feedback for select
  to service_role
  using (true);

alter table help_feedback enable row level security;
