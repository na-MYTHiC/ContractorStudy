-- FL Business & Finance Prep: shared leaderboard.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run more than once.
-- Players can only change their own row: the app keeps a random secret on each device and the server checks it.

create table if not exists public.players (
  id          uuid primary key,
  secret_hash text not null,
  username    text not null,
  xp          integer not null default 0,
  level       integer not null default 1,
  rank        text,
  streak      integer not null default 0,
  mastered    integer not null default 0,
  best_test   real    not null default 0,
  tests       integer not null default 0,
  daily       jsonb   not null default '{}'::jsonb,
  recent      jsonb   not null default '[]'::jsonb,
  badges      integer not null default 0,
  updated_at  timestamptz not null default now()
);
create unique index if not exists players_username_lower on public.players (lower(username));

-- Lock the table: nothing can read or write it directly with the public key.
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- Public read-only view without the secret column.
create or replace view public.leaderboard as
  select id, username, xp, level, rank, streak, mastered, best_test, tests, daily, recent, badges, updated_at
  from public.players;
grant select on public.leaderboard to anon, authenticated;

-- The only way to write: create or update your own row.
create or replace function public.upsert_player(p_id uuid, p_secret text, p_username text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  clean    text := btrim(coalesce(p_username, ''));
begin
  if clean !~ '^[A-Za-z0-9][A-Za-z0-9 _.-]{1,18}[A-Za-z0-9]$' then raise exception 'bad_username'; end if;
  if length(coalesce(p_secret, '')) < 32 then raise exception 'bad_secret'; end if;
  if length(p_data::text) > 12000 then raise exception 'too_big'; end if;

  select secret_hash into existing from players where id = p_id;
  if existing is not null and existing <> md5(p_secret) then raise exception 'not_owner'; end if;
  if exists (select 1 from players where lower(username) = lower(clean) and id <> p_id) then raise exception 'username_taken'; end if;

  insert into players as pl (id, secret_hash, username, xp, level, rank, streak, mastered, best_test, tests, daily, recent, badges, updated_at)
  values (
    p_id, md5(p_secret), clean,
    least(greatest(coalesce((p_data->>'xp')::int, 0), 0), 2000000),
    least(greatest(coalesce((p_data->>'level')::int, 1), 1), 20),
    left(coalesce(p_data->>'rank', ''), 40),
    least(greatest(coalesce((p_data->>'streak')::int, 0), 0), 3650),
    least(greatest(coalesce((p_data->>'mastered')::int, 0), 0), 375),
    least(greatest(coalesce((p_data->>'bestTest')::real, 0), 0), 1),
    least(greatest(coalesce((p_data->>'tests')::int, 0), 0), 100000),
    coalesce(p_data->'daily', '{}'::jsonb),
    coalesce(p_data->'recent', '[]'::jsonb),
    least(greatest(coalesce((p_data->>'badges')::int, 0), 0), 100),
    now()
  )
  on conflict (id) do update set
    username = excluded.username, xp = excluded.xp, level = excluded.level, rank = excluded.rank,
    streak = excluded.streak, mastered = excluded.mastered, best_test = excluded.best_test, tests = excluded.tests,
    daily = excluded.daily, recent = excluded.recent, badges = excluded.badges, updated_at = now();
end;
$$;
revoke all on function public.upsert_player(uuid, text, text, jsonb) from public;
grant execute on function public.upsert_player(uuid, text, text, jsonb) to anon, authenticated;

-- To remove someone from the board: delete from public.players where lower(username) = lower('their name');
