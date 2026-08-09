-- Fix MT5 credential encryption/decryption on Supabase.
-- pgcrypto is installed in the extensions schema.

begin;

alter function public.submit_mt5_credential(smallint, text)
  set search_path = public, vault, extensions;

alter function public.claim_mt5_credential(uuid)
  set search_path = public, vault, extensions;

alter function public.reveal_mt5_credential(uuid)
  set search_path = public, vault, extensions;

alter function public.reveal_mt5_credential(uuid, text)
  set search_path = public, vault, extensions;

commit;
