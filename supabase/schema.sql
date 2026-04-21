-- Ad Performance Analyzer — database schema
-- Paste into the Supabase SQL Editor (Project → SQL → New query) and run once.

create table if not exists public.analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),

  -- raw inputs
  spend         numeric not null,
  impressions   numeric not null,
  clicks        numeric not null,
  conversions   numeric not null,
  revenue       numeric not null,

  -- calculated metrics
  cpm   numeric,
  ctr   numeric,
  cpc   numeric,
  cvr   numeric,
  roas  numeric,

  -- insights
  biggest_issue  text,
  money_impact   numeric,

  -- context (used to decide when two rows are safe to compare)
  platform  text,
  industry  text,

  -- 'actual' (real campaign data) or 'planned' (projected inputs).
  type      text not null default 'actual'
);

-- For existing projects that ran an earlier version of this file:
alter table public.analyses add column if not exists platform text;
alter table public.analyses add column if not exists industry text;
alter table public.analyses add column if not exists type text not null default 'actual';

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

-- A signed-in user can only read their own rows.
create policy "Users can read their own analyses"
  on public.analyses
  for select
  to authenticated
  using (user_id = auth.uid());

-- A signed-in user can only insert rows for themselves.
create policy "Users can insert their own analyses"
  on public.analyses
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- A signed-in user can update their own rows (for publishing shares).
create policy "Users can update their own analyses"
  on public.analyses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- Shareable reports
-- =============================================================================
alter table public.analyses add column if not exists share_id uuid;
alter table public.analyses add column if not exists is_public boolean not null default false;

create unique index if not exists analyses_share_id_uidx
  on public.analyses (share_id)
  where share_id is not null;

-- Anyone (including anon) can read analyses explicitly marked public.
-- Scoped by share_id lookup in the client.
drop policy if exists "Public analyses are readable by anyone" on public.analyses;
create policy "Public analyses are readable by anyone"
  on public.analyses
  for select
  to anon, authenticated
  using (is_public = true);

-- =============================================================================
-- Profiles (is_premium flag for paywall)
-- =============================================================================
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  is_premium           boolean not null default false,
  stripe_customer_id   text,
  created_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Auto-create a profile row on signup so the client can always read one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this trigger existed.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
