-- Mandatory administrator MFA and expanded permanent audit logging.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
    and exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.approve_member(p_user_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_pin(p_pin);
  insert into public.memberships(user_id, plan_name, status, starts_on, updated_at)
  values (p_user_id, 'Abonnement Alfred-EA', 'active', current_date, now())
  on conflict (user_id) do update set plan_name=case when public.memberships.plan_name='À confirmer' then 'Abonnement Alfred-EA' else public.memberships.plan_name end,status='active',starts_on=coalesce(public.memberships.starts_on,current_date),updated_at=now();
  insert into public.admin_action_log(admin_id,target_user_id,action)
  values(auth.uid(),p_user_id,'member_approved');
end;
$$;

create or replace function public.admin_create_mt5_result(p_title text,p_description text,p_result_date date,p_image_path text,p_is_published boolean,p_pin text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  perform public.require_admin_pin(p_pin);
  insert into public.mt5_results(title,description,result_date,image_path,is_published,created_by)
  values(p_title,nullif(p_description,''),p_result_date,p_image_path,p_is_published,auth.uid()) returning id into result_id;
  insert into public.admin_action_log(admin_id,action,details) values(auth.uid(),'mt5_result_created',jsonb_build_object('result_id',result_id,'published',p_is_published,'image_path',p_image_path));
  return result_id;
end; $$;

create or replace function public.admin_set_mt5_result_visibility(p_result_id uuid,p_is_published boolean,p_pin text)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin_pin(p_pin);
  update public.mt5_results set is_published=p_is_published where id=p_result_id;
  if not found then raise exception 'Result not found'; end if;
  insert into public.admin_action_log(admin_id,action,details) values(auth.uid(),'mt5_result_visibility_changed',jsonb_build_object('result_id',p_result_id,'published',p_is_published));
end; $$;

create or replace function public.admin_delete_mt5_result(p_result_id uuid,p_pin text)
returns text language plpgsql security definer set search_path=public as $$
declare stored_path text;
begin
  perform public.require_admin_pin(p_pin);
  delete from public.mt5_results where id=p_result_id returning image_path into stored_path;
  if stored_path is null then raise exception 'Result not found'; end if;
  insert into public.admin_action_log(admin_id,action,details) values(auth.uid(),'mt5_result_deleted',jsonb_build_object('result_id',p_result_id,'image_path',stored_path));
  return stored_path;
end; $$;

revoke all on function public.admin_create_mt5_result(text,text,date,text,boolean,text) from public;
revoke all on function public.admin_set_mt5_result_visibility(uuid,boolean,text) from public;
revoke all on function public.admin_delete_mt5_result(uuid,text) from public;
grant execute on function public.admin_create_mt5_result(text,text,date,text,boolean,text) to authenticated;
grant execute on function public.admin_set_mt5_result_visibility(uuid,boolean,text) to authenticated;
grant execute on function public.admin_delete_mt5_result(uuid,text) to authenticated;
