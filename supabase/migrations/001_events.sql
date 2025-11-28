-- Create events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.events enable row level security;

-- Policies: only owner can read/write
drop policy if exists "read_own"   on public.events;
drop policy if exists "insert_own" on public.events;
drop policy if exists "update_own" on public.events;
drop policy if exists "delete_own" on public.events;

create policy "read_own" on public.events for select
  using (auth.uid() = user_id);

create policy "insert_own" on public.events for insert
  with check (auth.uid() = user_id);

create policy "update_own" on public.events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete_own" on public.events for delete
  using (auth.uid() = user_id);
