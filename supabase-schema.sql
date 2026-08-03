-- Alfred-EA client portal foundation
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists pin_hash text;
alter table public.admin_users add column if not exists pin_failed_attempts integer not null default 0;
alter table public.admin_users add column if not exists pin_locked_until timestamptz;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop function if exists public.set_admin_pin(text);
create or replace function public.set_admin_pin(p_current_pin text, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare pin_is_configured boolean;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select pin_hash is not null into pin_is_configured from public.admin_users where user_id = auth.uid();
  if pin_is_configured then perform public.require_admin_pin(p_current_pin); end if;
  if p_new_pin !~ '^[0-9]{4}$' then raise exception 'PIN must contain exactly four digits'; end if;
  update public.admin_users set pin_hash = crypt(p_new_pin, gen_salt('bf', 10)), pin_failed_attempts = 0, pin_locked_until = null where user_id = auth.uid();
end;
$$;

create or replace function public.has_admin_pin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_admin() and exists(select 1 from public.admin_users where user_id = auth.uid() and pin_hash is not null); $$;

create or replace function public.require_admin_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare admin_row public.admin_users%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into admin_row from public.admin_users where user_id = auth.uid() for update;
  if admin_row.pin_hash is null then raise exception 'Administrator PIN is not configured'; end if;
  if admin_row.pin_locked_until is not null and admin_row.pin_locked_until > now() then raise exception 'PIN temporarily locked'; end if;
  if crypt(p_pin, admin_row.pin_hash) <> admin_row.pin_hash then
    update public.admin_users set pin_failed_attempts = pin_failed_attempts + 1, pin_locked_until = case when pin_failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end where user_id = auth.uid();
    raise exception 'Invalid administrator PIN';
  end if;
  update public.admin_users set pin_failed_attempts = 0, pin_locked_until = null where user_id = auth.uid();
end;
$$;

create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_pin(p_pin);
  return true;
end;
$$;

revoke all on function public.set_admin_pin(text, text) from public;
revoke all on function public.has_admin_pin() from public;
revoke all on function public.require_admin_pin(text) from public;
revoke all on function public.verify_admin_pin(text) from public;
grant execute on function public.set_admin_pin(text, text) to authenticated;
grant execute on function public.has_admin_pin() to authenticated;
grant execute on function public.verify_admin_pin(text) to authenticated;

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_name text not null default 'À confirmer',
  status text not null default 'pending' check (status in ('pending','active','paused','cancelled','expired')),
  starts_on date,
  renews_on date,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_client_created_idx on public.messages(client_id, created_at desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null unique,
  description text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'CAD' check (char_length(currency) = 3),
  status text not null default 'draft' check (status in ('draft','open','paid','void','overdue')),
  issued_on date,
  due_on date,
  file_path text,
  created_at timestamptz not null default now()
);

create index if not exists invoices_client_created_idx on public.invoices(client_id, created_at desc);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  category text not null default 'other',
  display_name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists documents_client_created_idx on public.documents(client_id, created_at desc);

create table if not exists public.mt5_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  broker text not null check (char_length(broker) between 1 and 120),
  server_name text check (server_name is null or char_length(server_name) <= 160),
  account_number text not null check (account_number ~ '^[0-9]{3,30}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

create index if not exists mt5_accounts_user_idx on public.mt5_accounts(user_id, slot);

create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'mt5_credential_key') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'mt5_credential_key', 'Encryption key for temporary MT5 credentials');
  end if;
end $$;

create table if not exists public.mt5_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  encrypted_password bytea not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  unique (user_id, slot)
);

create table if not exists public.credential_access_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null,
  accessed_at timestamptz not null default now()
);

create or replace function public.submit_mt5_credential(p_slot smallint, p_password text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare encryption_key text;
begin
  if auth.uid() is null or p_slot not between 1 and 5 or char_length(p_password) not between 4 and 128 then
    raise exception 'Invalid credential submission';
  end if;
  if not exists (select 1 from public.mt5_accounts where user_id = auth.uid() and slot = p_slot) then
    raise exception 'Save this MT5 account before sending its password';
  end if;
  select decrypted_secret into encryption_key from vault.decrypted_secrets where name = 'mt5_credential_key' limit 1;
  if encryption_key is null then raise exception 'Credential service unavailable'; end if;
  delete from public.mt5_credentials where user_id = auth.uid() and slot = p_slot;
  insert into public.mt5_credentials(user_id, slot, encrypted_password)
  values (auth.uid(), p_slot, pgp_sym_encrypt(p_password, encryption_key, 'cipher-algo=aes256'));
end;
$$;

create or replace function public.claim_mt5_credential(p_credential_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare credential_row public.mt5_credentials%rowtype;
declare encryption_key text;
declare plain_password text;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into credential_row from public.mt5_credentials where id = p_credential_id for update;
  if credential_row.id is null or credential_row.expires_at <= now() then
    delete from public.mt5_credentials where id = p_credential_id;
    raise exception 'Credential unavailable or expired';
  end if;
  select decrypted_secret into encryption_key from vault.decrypted_secrets where name = 'mt5_credential_key' limit 1;
  plain_password := pgp_sym_decrypt(credential_row.encrypted_password, encryption_key);
  insert into public.credential_access_log(client_id, admin_id, slot)
  values (credential_row.user_id, auth.uid(), credential_row.slot);
  delete from public.mt5_credentials where id = credential_row.id;
  return plain_password;
end;
$$;

create or replace function public.reveal_mt5_credential(p_credential_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare credential_row public.mt5_credentials%rowtype;
declare encryption_key text;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into credential_row from public.mt5_credentials where id = p_credential_id;
  if credential_row.id is null or credential_row.expires_at <= now() then
    delete from public.mt5_credentials where id = p_credential_id;
    raise exception 'Credential unavailable or expired';
  end if;
  select decrypted_secret into encryption_key from vault.decrypted_secrets where name = 'mt5_credential_key' limit 1;
  insert into public.credential_access_log(client_id, admin_id, slot)
  values (credential_row.user_id, auth.uid(), credential_row.slot);
  return pgp_sym_decrypt(credential_row.encrypted_password, encryption_key);
end;
$$;

create or replace function public.reveal_mt5_credential(p_credential_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare credential_row public.mt5_credentials%rowtype;
declare encryption_key text;
begin
  perform public.require_admin_pin(p_pin);
  select * into credential_row from public.mt5_credentials where id = p_credential_id;
  if credential_row.id is null or credential_row.expires_at <= now() then
    delete from public.mt5_credentials where id = p_credential_id;
    raise exception 'Credential unavailable or expired';
  end if;
  select decrypted_secret into encryption_key from vault.decrypted_secrets where name = 'mt5_credential_key' limit 1;
  insert into public.credential_access_log(client_id, admin_id, slot) values (credential_row.user_id, auth.uid(), credential_row.slot);
  return pgp_sym_decrypt(credential_row.encrypted_password, encryption_key);
end;
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
  on conflict (user_id) do update set
    plan_name = case when public.memberships.plan_name = 'À confirmer' then 'Abonnement Alfred-EA' else public.memberships.plan_name end,
    status = 'active',
    starts_on = coalesce(public.memberships.starts_on, current_date),
    updated_at = now();
end;
$$;

revoke all on function public.submit_mt5_credential(smallint, text) from public;
revoke all on function public.claim_mt5_credential(uuid) from public;
revoke all on function public.reveal_mt5_credential(uuid) from public;
revoke all on function public.reveal_mt5_credential(uuid, text) from public;
revoke all on function public.approve_member(uuid, text) from public;
grant execute on function public.submit_mt5_credential(smallint, text) to authenticated;
grant execute on function public.claim_mt5_credential(uuid) to authenticated;
revoke execute on function public.reveal_mt5_credential(uuid) from authenticated;
grant execute on function public.reveal_mt5_credential(uuid, text) to authenticated;
grant execute on function public.approve_member(uuid, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.memberships(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.memberships enable row level security;
alter table public.messages enable row level security;
alter table public.invoices enable row level security;
alter table public.documents enable row level security;
alter table public.mt5_accounts enable row level security;
alter table public.mt5_credentials enable row level security;
alter table public.credential_access_log enable row level security;

drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists memberships_read_own_or_admin on public.memberships;
create policy memberships_read_own_or_admin on public.memberships for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists memberships_admin_manage on public.memberships;
create policy memberships_admin_manage on public.memberships for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_read_own_or_admin on public.messages;
create policy messages_read_own_or_admin on public.messages for select to authenticated
using (client_id = auth.uid() or public.is_admin());
drop policy if exists messages_client_send on public.messages;
create policy messages_client_send on public.messages for insert to authenticated
with check (client_id = auth.uid() and sender_id = auth.uid());
drop policy if exists messages_admin_manage on public.messages;
create policy messages_admin_manage on public.messages for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists invoices_read_own_or_admin on public.invoices;
create policy invoices_read_own_or_admin on public.invoices for select to authenticated
using (client_id = auth.uid() or public.is_admin());
drop policy if exists invoices_admin_manage on public.invoices;
create policy invoices_admin_manage on public.invoices for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists documents_read_own_or_admin on public.documents;
create policy documents_read_own_or_admin on public.documents for select to authenticated
using (client_id = auth.uid() or public.is_admin());
drop policy if exists documents_client_add on public.documents;
create policy documents_client_add on public.documents for insert to authenticated
with check (client_id = auth.uid() and uploaded_by = auth.uid());
drop policy if exists documents_admin_manage on public.documents;
create policy documents_admin_manage on public.documents for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists mt5_accounts_read_own_or_admin on public.mt5_accounts;
create policy mt5_accounts_read_own_or_admin on public.mt5_accounts for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists mt5_accounts_add_own on public.mt5_accounts;
create policy mt5_accounts_add_own on public.mt5_accounts for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists mt5_accounts_update_own on public.mt5_accounts;
create policy mt5_accounts_update_own on public.mt5_accounts for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists mt5_accounts_delete_own on public.mt5_accounts;
create policy mt5_accounts_delete_own on public.mt5_accounts for delete to authenticated
using (user_id = auth.uid());
drop policy if exists mt5_accounts_admin_manage on public.mt5_accounts;
create policy mt5_accounts_admin_manage on public.mt5_accounts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists mt5_credentials_status_own_or_admin on public.mt5_credentials;
create policy mt5_credentials_status_own_or_admin on public.mt5_credentials for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists credential_access_log_admin_read on public.credential_access_log;
create policy credential_access_log_admin_read on public.credential_access_log for select to authenticated
using (public.is_admin());

drop policy if exists documents_client_delete on public.documents;
create policy documents_client_delete on public.documents for delete to authenticated
using (client_id = auth.uid() and uploaded_by = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents','client-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists client_files_read on storage.objects;
create policy client_files_read on storage.objects for select to authenticated
using (bucket_id = 'client-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists client_files_upload on storage.objects;
create policy client_files_upload on storage.objects for insert to authenticated
with check (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists client_files_delete on storage.objects;
create policy client_files_delete on storage.objects for delete to authenticated
using (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists client_files_admin_manage on storage.objects;
create policy client_files_admin_manage on storage.objects for all to authenticated
using (bucket_id = 'client-documents' and public.is_admin())
with check (bucket_id = 'client-documents' and public.is_admin());

insert into public.admin_users(user_id)
select id from auth.users where lower(email) = 'alfred.expert.advisor@gmail.com'
on conflict (user_id) do nothing;

-- Public MT5 result gallery managed from the administration dashboard.
create table if not exists public.mt5_results (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  result_date date not null default current_date,
  image_path text not null unique,
  is_published boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mt5_results_public_idx on public.mt5_results(is_published, result_date desc, created_at desc);
alter table public.mt5_results enable row level security;
drop policy if exists mt5_results_public_read on public.mt5_results;
create policy mt5_results_public_read on public.mt5_results for select to anon, authenticated
using (is_published or public.is_admin());
drop policy if exists mt5_results_admin_insert on public.mt5_results;
create policy mt5_results_admin_insert on public.mt5_results for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());
drop policy if exists mt5_results_admin_update on public.mt5_results;
create policy mt5_results_admin_update on public.mt5_results for update to authenticated
using (public.is_admin()) with check (public.is_admin());
drop policy if exists mt5_results_admin_delete on public.mt5_results;
create policy mt5_results_admin_delete on public.mt5_results for delete to authenticated
using (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('mt5-results','mt5-results',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mt5_results_public_files on storage.objects;
create policy mt5_results_public_files on storage.objects for select to public
using (bucket_id = 'mt5-results');
drop policy if exists mt5_results_admin_files on storage.objects;
create policy mt5_results_admin_files on storage.objects for all to authenticated
using (bucket_id = 'mt5-results' and public.is_admin())
with check (bucket_id = 'mt5-results' and public.is_admin());
