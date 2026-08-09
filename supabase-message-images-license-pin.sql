begin;

alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_mime text;
alter table public.messages alter column body drop not null;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  (body is null or char_length(body) between 1 and 5000)
  and (body is not null or attachment_path is not null)
);
alter table public.messages drop constraint if exists messages_attachment_mime_check;
alter table public.messages add constraint messages_attachment_mime_check check (
  attachment_mime is null or attachment_mime in ('image/jpeg', 'image/png', 'image/webp')
);

create table if not exists public.document_access_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  accessed_at timestamptz not null default now()
);

alter table public.document_access_log enable row level security;

drop policy if exists document_access_log_admin_read on public.document_access_log;
create policy document_access_log_admin_read
on public.document_access_log for select
to authenticated
using (public.is_admin());

create or replace function public.authorize_license_view(p_document_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  license_document public.documents%rowtype;
begin
  perform public.require_admin_pin(p_pin);

  select * into license_document
  from public.documents
  where id = p_document_id
    and category in ('drivers_license_front', 'drivers_license_back');

  if license_document.id is null then
    raise exception 'Licence document not found';
  end if;

  insert into public.document_access_log(document_id, client_id, admin_id)
  values (license_document.id, license_document.client_id, auth.uid());

  return license_document.storage_path;
end;
$$;

revoke all on function public.authorize_license_view(uuid, text) from public;
revoke all on function public.authorize_license_view(uuid, text) from anon;
grant execute on function public.authorize_license_view(uuid, text) to authenticated;

commit;
