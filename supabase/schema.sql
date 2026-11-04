-- Схема для необов'язкової синхронізації історії тренувань.
-- Виконайте цей файл у Supabase SQL Editor.
-- Також увімкніть Authentication → Sign In / Providers → Anonymous sign-ins.

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  energy smallint not null check (energy between 1 and 5),
  duration smallint not null check (duration in (7, 12, 15)),
  zone text not null check (zone in ('back_neck', 'core', 'full_body')),
  source text not null check (source in ('ai', 'mock')),
  model_label text,
  workout_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_created_idx
  on public.workouts (user_id, created_at desc);

alter table public.workouts enable row level security;

create policy "Users read own workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Users insert own workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "Users delete own workouts"
  on public.workouts for delete
  using (auth.uid() = user_id);
