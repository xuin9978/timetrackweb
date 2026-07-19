revoke all on public.chat_sessions from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
