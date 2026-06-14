revoke execute on function public.current_user_email() from public, anon, authenticated;
revoke execute on function public.user_can_access_map(uuid) from public, anon, authenticated;
revoke execute on function public.user_can_edit_map(uuid) from public, anon, authenticated;
revoke execute on function public.user_owns_map(uuid) from public, anon, authenticated;