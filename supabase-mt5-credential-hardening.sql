-- Harden persistent MT5 credentials without exposing or rewriting plaintext.
-- Existing passwords remain encrypted with AES-256 and the key remains in Supabase Vault.

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'mt5_credential_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'mt5_credential_key',
      'Server-controlled AES-256 key for MT5 credentials'
    );
  end if;
end $$;

-- A refreshed access token is not sufficient: the JWT must contain a password
-- authentication method recorded during the last five minutes.
create or replace function public.require_recent_admin_auth(p_max_age_seconds integer default 300)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  password_authenticated_at bigint;
  max_age integer := greatest(60, least(coalesce(p_max_age_seconds, 300), 900));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select max((method ->> 'timestamp')::bigint)
    into password_authenticated_at
  from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
  where method ->> 'method' = 'password'
    and (method ->> 'timestamp') ~ '^[0-9]+$';

  if password_authenticated_at is null
     or extract(epoch from now())::bigint - password_authenticated_at > max_age then
    raise exception 'Recent administrator authentication required' using errcode = '28000';
  end if;
end;
$$;

-- Credential metadata is exposed through a narrow admin-only RPC. The encrypted
-- bytea value is never returned to the browser or to an ordinary client.
create or replace function public.admin_list_mt5_credentials(p_user_id uuid)
returns table(id uuid, slot smallint, created_at timestamptz, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
    select credential.id, credential.slot, credential.created_at, credential.expires_at
    from public.mt5_credentials credential
    where credential.user_id = p_user_id
    order by credential.slot;
end;
$$;

create or replace function public.reveal_mt5_credential(p_credential_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  credential_row public.mt5_credentials%rowtype;
  encryption_key text;
  plain_password text;
begin
  perform public.require_recent_admin_auth(300);

  select * into credential_row
  from public.mt5_credentials
  where id = p_credential_id;

  if credential_row.id is null then
    raise exception 'Credential unavailable' using errcode = 'P0002';
  end if;

  select decrypted_secret into encryption_key
  from vault.decrypted_secrets
  where name = 'mt5_credential_key'
  limit 1;

  if encryption_key is null then
    raise exception 'Credential service unavailable';
  end if;

  plain_password := extensions.pgp_sym_decrypt(credential_row.encrypted_password, encryption_key);

  insert into public.credential_access_log(client_id, admin_id, slot)
  values (credential_row.user_id, auth.uid(), credential_row.slot);

  return plain_password;
end;
$$;

-- Remove obsolete one-argument claim and PIN-based reveal access paths.
revoke all on function public.claim_mt5_credential(uuid) from public, anon, authenticated;
revoke all on function public.reveal_mt5_credential(uuid, text) from public, anon, authenticated;
revoke all on function public.reveal_mt5_credential(uuid) from public, anon;
revoke all on function public.require_recent_admin_auth(integer) from public, anon, authenticated;
revoke all on function public.admin_list_mt5_credentials(uuid) from public, anon;

grant execute on function public.reveal_mt5_credential(uuid) to authenticated;
grant execute on function public.admin_list_mt5_credentials(uuid) to authenticated;

-- Clients submit passwords only through submit_mt5_credential(). They cannot
-- select ciphertext, insert ciphertext, update it, or delete credential rows.
revoke all on table public.mt5_credentials from anon, authenticated;
grant execute on function public.submit_mt5_credential(smallint, text) to authenticated;

drop policy if exists mt5_credentials_status_own_or_admin on public.mt5_credentials;

-- Server-controlled encryption configuration and fixed search paths.
alter function public.submit_mt5_credential(smallint, text)
  set search_path = public, vault, extensions;
alter function public.reveal_mt5_credential(uuid)
  set search_path = public, vault, extensions;

commit;
