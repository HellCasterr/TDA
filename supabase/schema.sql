create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  completed boolean not null default false,
  inserted_at timestamptz not null default now()
);

alter table public.todos enable row level security;

drop policy if exists "Users can read own todos" on public.todos;
drop policy if exists "Users can insert own todos" on public.todos;
drop policy if exists "Users can update own todos" on public.todos;
drop policy if exists "Users can delete own todos" on public.todos;

create policy "Users can read own todos"
on public.todos
for select
using ((select auth.uid()) = user_id);

create policy "Users can insert own todos"
on public.todos
for insert
with check ((select auth.uid()) = user_id);

create policy "Users can update own todos"
on public.todos
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own todos"
on public.todos
for delete
using ((select auth.uid()) = user_id);
