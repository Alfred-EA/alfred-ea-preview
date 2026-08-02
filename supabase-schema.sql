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

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents','client-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists client_files_read on storage.objects;
create policy client_files_read on storage.objects for select to authenticated
using (bucket_id = 'client-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists client_files_upload on storage.objects;
create policy client_files_upload on storage.objects for insert to authenticated
with check (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists client_files_admin_manage on storage.objects;
create policy client_files_admin_manage on storage.objects for all to authenticated
using (bucket_id = 'client-documents' and public.is_admin())
with check (bucket_id = 'client-documents' and public.is_admin());
