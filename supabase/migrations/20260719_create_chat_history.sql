create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '新对话',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  context_sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_pinned_updated
  on public.chat_sessions(user_id, pinned desc, updated_at desc);

create index if not exists idx_chat_messages_session_created
  on public.chat_messages(session_id, created_at);

create index if not exists idx_chat_messages_user_created
  on public.chat_messages(user_id, created_at desc);

revoke all on public.chat_sessions from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_sessions_select on public.chat_sessions;
drop policy if exists chat_sessions_insert on public.chat_sessions;
drop policy if exists chat_sessions_update on public.chat_sessions;
drop policy if exists chat_sessions_delete on public.chat_sessions;
drop policy if exists chat_messages_select on public.chat_messages;
drop policy if exists chat_messages_insert on public.chat_messages;
drop policy if exists chat_messages_delete on public.chat_messages;

create policy chat_sessions_select on public.chat_sessions
  for select
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy chat_sessions_insert on public.chat_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy chat_sessions_update on public.chat_sessions
  for update
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy chat_sessions_delete on public.chat_sessions
  for delete
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy chat_messages_select on public.chat_messages
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );

create policy chat_messages_delete on public.chat_messages
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );
