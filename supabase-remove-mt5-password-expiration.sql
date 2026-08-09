-- Keep encrypted MT5 passwords until the client replaces them.

begin;

alter table public.mt5_credentials
  alter column expires_at drop not null,
  alter column expires_at drop default;

update public.mt5_credentials
set expires_at = null;

commit;
