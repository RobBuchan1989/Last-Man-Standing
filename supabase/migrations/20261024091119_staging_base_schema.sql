-- Initial schema for the isolated Last Man Standing staging project.
-- Deliberately starts with no anon/authenticated table policies. Access will be
-- opened only through reviewed server-side API/RPC paths, so current-round picks
-- cannot be queried directly with a public key.

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'open',
  round integer not null default 1 check (round >= 1),
  created_at timestamptz not null default now(),
  owner_entry_id uuid,
  season_number integer not null default 1 check (season_number >= 1),
  season_started_at timestamptz,
  fixture_matchday integer check (fixture_matchday is null or fixture_matchday >= 1),
  constraint competitions_code_key unique (code)
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  alive boolean not null default true,
  created_at timestamptz not null default now(),
  multi_chip_used boolean not null default false,
  session_token uuid not null default gen_random_uuid()
);

create unique index entries_competition_id_name_ci_key
  on public.entries (competition_id, lower(name));
create index entries_competition_id_idx
  on public.entries (competition_id);

create table public.fixtures (
  id text primary key,
  round integer check (round is null or round >= 1),
  home_team text,
  away_team text,
  kickoff timestamptz,
  home_score integer,
  away_score integer,
  status text,
  updated_at timestamptz not null default now()
);
create index fixtures_round_kickoff_idx
  on public.fixtures (round, kickoff);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  round integer not null check (round >= 1),
  team text not null,
  result text default 'pending',
  fixture_id text references public.fixtures(id) on delete set null,
  locked_at timestamptz default now(),
  is_multi boolean not null default false
);
create unique index picks_entry_team_ci_key
  on public.picks (entry_id, lower(team));
create index picks_entry_id_round_idx
  on public.picks (entry_id, round);
create index picks_fixture_id_idx
  on public.picks (fixture_id);

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.season_winners (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  season_number integer not null check (season_number >= 1),
  winner_entry_id uuid references public.entries(id) on delete set null,
  winner_name text not null,
  completed_at timestamptz not null default now(),
  constraint season_winners_competition_season_key unique (competition_id, season_number)
);
create index season_winners_competition_completed_idx
  on public.season_winners (competition_id, completed_at desc);

create table public.player_recovery_codes (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  code_hash text not null,
  issued_at timestamptz not null default now(),
  issued_by text,
  updated_at timestamptz not null default now()
);

create table public.player_recovery_attempts (
  id bigint generated always as identity primary key,
  attempt_key text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index player_recovery_attempts_key_time_idx
  on public.player_recovery_attempts (attempt_key, attempted_at desc);

alter table public.competitions enable row level security;
alter table public.entries enable row level security;
alter table public.fixtures enable row level security;
alter table public.picks enable row level security;
alter table public.admin_users enable row level security;
alter table public.season_winners enable row level security;
alter table public.player_recovery_codes enable row level security;
alter table public.player_recovery_attempts enable row level security;

-- No direct public table access in the initial migration. Subsequent migrations
-- will add narrow policies/RPCs after the mobile/server identity flow is in place.
revoke all privileges on table
  public.competitions,
  public.entries,
  public.fixtures,
  public.picks,
  public.admin_users,
  public.season_winners,
  public.player_recovery_codes,
  public.player_recovery_attempts
from public, anon, authenticated;

grant all privileges on table
  public.competitions,
  public.entries,
  public.fixtures,
  public.picks,
  public.admin_users,
  public.season_winners,
  public.player_recovery_codes,
  public.player_recovery_attempts
to service_role;

revoke all privileges on sequence public.player_recovery_attempts_id_seq
from public, anon, authenticated;
grant usage, select, update on sequence public.player_recovery_attempts_id_seq
to service_role;

comment on table public.picks is
  'Game picks. Public direct reads remain disabled; expose only through reviewed APIs that hide the current live round.';
