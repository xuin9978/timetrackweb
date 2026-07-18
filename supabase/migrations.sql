alter table public.events add column if not exists category text;
alter table public.tags add column if not exists "order" int;

create index if not exists idx_events_user_start on public.events(user_id, start_time);
create index if not exists idx_tags_user_order on public.tags(user_id, "order");

alter table public.events enable row level security;
alter table public.tags enable row level security;

drop policy if exists events_select on public.events;
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
drop policy if exists tags_select on public.tags;
drop policy if exists tags_insert on public.tags;
drop policy if exists tags_update on public.tags;
drop policy if exists tags_delete on public.tags;

create policy events_select on public.events
  for select using (user_id = auth.uid());
create policy events_insert on public.events
  for insert with check (user_id = auth.uid());
create policy events_update on public.events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy events_delete on public.events
  for delete using (user_id = auth.uid());

create policy tags_select on public.tags
  for select using (user_id = auth.uid());
create policy tags_insert on public.tags
  for insert with check (user_id = auth.uid());
create policy tags_update on public.tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_delete on public.tags
  for delete using (user_id = auth.uid());

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint diary_entries_user_entry_date_key unique (user_id, entry_date)
);

create index if not exists idx_diary_entries_user_date on public.diary_entries(user_id, entry_date);

grant select, insert, update, delete on public.diary_entries to authenticated;

alter table public.diary_entries enable row level security;

drop policy if exists diary_entries_select on public.diary_entries;
drop policy if exists diary_entries_insert on public.diary_entries;
drop policy if exists diary_entries_update on public.diary_entries;
drop policy if exists diary_entries_delete on public.diary_entries;

create policy diary_entries_select on public.diary_entries
  for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
create policy diary_entries_insert on public.diary_entries
  for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));
create policy diary_entries_update on public.diary_entries
  for update to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));
create policy diary_entries_delete on public.diary_entries
  for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
