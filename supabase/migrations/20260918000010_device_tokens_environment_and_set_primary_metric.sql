-- Closes two more migration-history gaps discovered while verifying
-- schema parity between staging and the new prod project (issue #118):
-- `device_tokens.environment` and `set_primary_metric()` both existed on
-- staging with no corresponding checked-in migration.
--
-- `prune_invalid_device_tokens` (also undocumented) was confirmed to be a
-- one-time data cleanup, not a persisted function/object — nothing to
-- backport for it.

alter table public.device_tokens
  add column if not exists environment text not null default 'sandbox';

create or replace function public.set_primary_metric(p_metric_id uuid)
returns void
language plpgsql
as $function$
declare
  v_user uuid;
begin
  select user_id into v_user from performance_metrics where id = p_metric_id;
  if v_user is null then
    raise exception 'metric % not found', p_metric_id;
  end if;
  update performance_metrics
    set is_primary = false
    where user_id = v_user and is_primary and id <> p_metric_id;
  update performance_metrics
    set is_primary = true
    where id = p_metric_id;
end;
$function$;
