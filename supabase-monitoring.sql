-- Administrator-only operational health and error reporting.
begin;

create or replace function public.admin_system_health()
returns table(metric text, value bigint, status text, checked_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query
  select 'webhook_errors_24h', count(*)::bigint,
         case when count(*)=0 then 'ok' else 'attention' end, now()
  from public.stripe_webhook_events
  where received_at >= now()-interval '24 hours' and error_message is not null
  union all
  select 'webhooks_unprocessed_15m', count(*)::bigint,
         case when count(*)=0 then 'ok' else 'attention' end, now()
  from public.stripe_webhook_events
  where received_at < now()-interval '15 minutes' and processed_at is null
  union all
  select 'failed_invoices', count(*)::bigint,
         case when count(*)=0 then 'ok' else 'attention' end, now()
  from public.invoices i where i.status='overdue'
  union all
  select 'audit_events_24h', count(*)::bigint, 'info', now()
  from public.admin_action_log where created_at >= now()-interval '24 hours';
end;
$$;

revoke all on function public.admin_system_health() from public, anon;
grant execute on function public.admin_system_health() to authenticated;

create or replace function public.admin_recent_system_errors(p_limit integer default 50)
returns table(event_id text, event_type text, received_at timestamptz, error_message text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query
  select e.event_id,e.event_type,e.received_at,e.error_message
  from public.stripe_webhook_events e
  where e.error_message is not null
  order by e.received_at desc
  limit least(greatest(coalesce(p_limit,50),1),200);
end;
$$;

revoke all on function public.admin_recent_system_errors(integer) from public, anon;
grant execute on function public.admin_recent_system_errors(integer) to authenticated;

commit;
