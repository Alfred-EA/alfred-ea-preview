begin;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.set_admin_pin(text, text) from public, anon;
revoke execute on function public.has_admin_pin() from public, anon;
revoke execute on function public.require_admin_pin(text) from public, anon, authenticated;
revoke execute on function public.verify_admin_pin(text) from public, anon;
revoke execute on function public.submit_mt5_credential(smallint, text) from public, anon;
revoke execute on function public.claim_mt5_credential(uuid) from public, anon, authenticated;
revoke execute on function public.reveal_mt5_credential(uuid) from public, anon, authenticated;
revoke execute on function public.reveal_mt5_credential(uuid, text) from public, anon;
revoke execute on function public.approve_member(uuid, text) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.set_admin_pin(text, text) to authenticated;
grant execute on function public.has_admin_pin() to authenticated;
grant execute on function public.verify_admin_pin(text) to authenticated;
grant execute on function public.submit_mt5_credential(smallint, text) to authenticated;
grant execute on function public.reveal_mt5_credential(uuid, text) to authenticated;
grant execute on function public.approve_member(uuid, text) to authenticated;

drop policy if exists mt5_results_public_files on storage.objects;
create policy mt5_results_public_files
on storage.objects
for select
to public
using (
  bucket_id = 'mt5-results'
  and exists (
    select 1
    from public.mt5_results result
    where result.image_path = storage.objects.name
      and result.is_published = true
  )
);

commit;
