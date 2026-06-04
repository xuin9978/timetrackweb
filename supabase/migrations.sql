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
