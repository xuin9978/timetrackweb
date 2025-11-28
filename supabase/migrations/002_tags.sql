create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  color text not null,
  icon text not null,
  created_at timestamptz default now()
);

alter table public.tags enable row level security;

drop policy if exists "read_own"   on public.tags;
drop policy if exists "insert_own" on public.tags;
drop policy if exists "update_own" on public.tags;
drop policy if exists "delete_own" on public.tags;

create policy "read_own" on public.tags for select
  using (auth.uid() = user_id);

create policy "insert_own" on public.tags for insert
  with check (auth.uid() = user_id);

create policy "update_own" on public.tags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete_own" on public.tags for delete
  using (auth.uid() = user_id);

