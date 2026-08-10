-- Run once in the Supabase SQL editor.
create table if not exists public.admin_action_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_action_log enable row level security;
drop policy if exists admin_action_log_admin_read on public.admin_action_log;
create policy admin_action_log_admin_read on public.admin_action_log for select to authenticated
using (public.is_admin());

create or replace function public.admin_set_client_status(p_user_id uuid, p_status text, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_status text;
begin
  perform public.require_admin_pin(p_pin);
  if p_status not in ('new','active','unpaid','inactive') then
    raise exception 'Invalid client status';
  end if;
  if exists(select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Administrator accounts cannot be moved';
  end if;
  membership_status := case p_status when 'new' then 'pending' when 'active' then 'active' when 'unpaid' then 'paused' else 'cancelled' end;
  insert into public.memberships(user_id, plan_name, status, starts_on, updated_at)
  values (p_user_id, 'À confirmer', membership_status, case when membership_status='active' then current_date else null end, now())
  on conflict (user_id) do update set
    status = excluded.status,
    starts_on = case when excluded.status='active' then coalesce(public.memberships.starts_on,current_date) else public.memberships.starts_on end,
    updated_at = now();
  insert into public.admin_action_log(admin_id,target_user_id,action,details)
  values(auth.uid(),p_user_id,'client_status_changed',jsonb_build_object('section',p_status,'membership_status',membership_status));
end;
$$;

create or replace function public.admin_delete_client(p_user_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
begin
  perform public.require_admin_pin(p_pin);
  if p_user_id = auth.uid() or exists(select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Administrator accounts cannot be deleted';
  end if;
  if not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'Client not found';
  end if;
  insert into public.admin_action_log(admin_id,target_user_id,action)
  values(auth.uid(),p_user_id,'client_deleted');
  delete from storage.objects where bucket_id='client-documents' and name like p_user_id::text || '/%';
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_client_status(uuid,text,text) from public;
revoke all on function public.admin_delete_client(uuid,text) from public;
grant execute on function public.admin_set_client_status(uuid,text,text) to authenticated;
grant execute on function public.admin_delete_client(uuid,text) to authenticated;
