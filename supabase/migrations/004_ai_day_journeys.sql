create table if not exists public.ai_day_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  markdown text not null,
  prompt_version text,
  model_provider text,
  model_name text,
  source_event_ids jsonb default '[]'::jsonb,
  input_snapshot jsonb,
  warnings jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.ai_day_journeys enable row level security;

drop policy if exists "read_own"   on public.ai_day_journeys;
drop policy if exists "insert_own" on public.ai_day_journeys;
drop policy if exists "update_own" on public.ai_day_journeys;
drop policy if exists "delete_own" on public.ai_day_journeys;

create policy "read_own" on public.ai_day_journeys for select
  using (auth.uid() = user_id);

create policy "insert_own" on public.ai_day_journeys for insert
  with check (auth.uid() = user_id);

create policy "update_own" on public.ai_day_journeys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete_own" on public.ai_day_journeys for delete
  using (auth.uid() = user_id);
