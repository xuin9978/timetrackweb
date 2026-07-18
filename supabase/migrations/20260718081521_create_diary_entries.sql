create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diary_entries_user_entry_date_key unique (user_id, entry_date)
);

create index if not exists idx_diary_entries_user_date
  on public.diary_entries(user_id, entry_date);

grant select, insert, update, delete on public.diary_entries to authenticated;

alter table public.diary_entries enable row level security;

drop policy if exists diary_entries_select on public.diary_entries;
drop policy if exists diary_entries_insert on public.diary_entries;
drop policy if exists diary_entries_update on public.diary_entries;
drop policy if exists diary_entries_delete on public.diary_entries;

create policy diary_entries_select on public.diary_entries
  for select
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy diary_entries_insert on public.diary_entries
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy diary_entries_update on public.diary_entries
  for update
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy diary_entries_delete on public.diary_entries
  for delete
  to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
