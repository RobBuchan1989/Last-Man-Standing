-- Atomic, server-only mobile pick submission for the isolated staging game.
-- The caller must use the service-role client; direct public execution is revoked.
create or replace function public.lms_mobile_submit_pick(
  p_session_token text,
  p_league_code text,
  p_teams text[],
  p_use_multi_chip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $lms$
declare
  v_entry_id uuid;
  v_competition_id uuid;
  v_entry public.entries%rowtype;
  v_competition public.competitions%rowtype;
  v_fixture_round integer;
  v_requested_team text;
  v_canonical_team text;
  v_fixture_id text;
  v_canonical_teams text[] := array[]::text[];
  v_fixture_ids text[] := array[]::text[];
  v_existing_count integer;
  v_team_index integer;
begin
  if coalesce(length(trim(p_session_token)), 0) = 0
     or coalesce(length(trim(p_league_code)), 0) < 4 then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'A valid player session and league code are required.');
  end if;

  if p_teams is null
     or cardinality(p_teams) <> (case when coalesce(p_use_multi_chip, false) then 2 else 1 end)
     or exists (select 1 from unnest(p_teams) as t where nullif(trim(t), '') is null or length(trim(t)) > 80)
     or (select count(distinct lower(trim(t))) from unnest(p_teams) as t) <> cardinality(p_teams) then
    return jsonb_build_object(
      'ok', false, 'status', 400,
      'error', case when coalesce(p_use_multi_chip, false)
        then 'Choose two different teams for the Multi Chip.'
        else 'Choose exactly one team.' end
    );
  end if;

  select e.id, e.competition_id
    into v_entry_id, v_competition_id
    from public.entries e
   where e.session_token::text = trim(p_session_token)
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'This player session could not be verified.');
  end if;

  -- Serialize all pick submissions against this league's round processing.
  select c.* into v_competition
    from public.competitions c
   where c.id = v_competition_id
     and c.code = upper(regexp_replace(trim(p_league_code), '[^A-Za-z0-9-]', '', 'g'))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 403, 'error', 'This session does not match that league.');
  end if;

  select e.* into v_entry
    from public.entries e
   where e.id = v_entry_id
   for update;

  if not found or v_entry.competition_id <> v_competition.id then
    return jsonb_build_object('ok', false, 'status', 403, 'error', 'This session does not match that league.');
  end if;

  if not v_entry.alive then
    return jsonb_build_object('ok', false, 'status', 409, 'error', 'You have been eliminated from this league.');
  end if;

  if v_competition.status not in ('active', 'open') then
    return jsonb_build_object('ok', false, 'status', 409, 'error', 'This league is not accepting picks right now.');
  end if;

  if coalesce(p_use_multi_chip, false) and v_entry.multi_chip_used then
    return jsonb_build_object('ok', false, 'status', 409, 'error', 'Your Multi Chip has already been used this season.');
  end if;

  select count(*) into v_existing_count
    from public.picks p
   where p.entry_id = v_entry.id and p.round = v_competition.round;

  if v_existing_count > 0 then
    return jsonb_build_object('ok', false, 'status', 409, 'error', 'You have already submitted a pick for this round.');
  end if;

  v_fixture_round := coalesce(v_competition.fixture_matchday, v_competition.round);

  -- Validate every requested team before inserting any rows. Canonical team
  -- names and fixture IDs come from the trusted fixture table.
  foreach v_requested_team in array p_teams loop
    select f.id,
           case when lower(f.home_team) = lower(trim(v_requested_team))
                then f.home_team else f.away_team end
      into v_fixture_id, v_canonical_team
      from public.fixtures f
     where f.round = v_fixture_round
       and f.kickoff > now()
       and upper(coalesce(f.status, '')) in ('TIMED', 'SCHEDULED', 'NS')
       and (lower(f.home_team) = lower(trim(v_requested_team))
         or lower(f.away_team) = lower(trim(v_requested_team)))
     order by f.kickoff
     limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'status', 400, 'error', trim(v_requested_team) || ' does not have an upcoming fixture in this round.');
    end if;

    if exists (
      select 1 from public.picks p
       where p.entry_id = v_entry.id
         and lower(p.team) = lower(v_canonical_team)
    ) then
      return jsonb_build_object('ok', false, 'status', 409, 'error', 'You have already used ' || v_canonical_team || '. Choose a different team.');
    end if;

    v_canonical_teams := array_append(v_canonical_teams, v_canonical_team);
    v_fixture_ids := array_append(v_fixture_ids, v_fixture_id);
  end loop;

  -- This function executes in one database transaction: either all selected
  -- teams and the chip flag commit, or none do.
  for v_team_index in 1..cardinality(v_canonical_teams) loop
    insert into public.picks(entry_id, round, team, result, fixture_id, locked_at, is_multi)
    values (
      v_entry.id, v_competition.round, v_canonical_teams[v_team_index],
      'pending', v_fixture_ids[v_team_index], now(), coalesce(p_use_multi_chip, false)
    );
  end loop;

  if coalesce(p_use_multi_chip, false) then
    update public.entries set multi_chip_used = true where id = v_entry.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'round', v_competition.round,
    'teams', to_jsonb(v_canonical_teams),
    'multiChipUsed', coalesce(p_use_multi_chip, false)
  );
end;
$lms$;

revoke all on function public.lms_mobile_submit_pick(text, text, text[], boolean) from public, anon, authenticated;
grant execute on function public.lms_mobile_submit_pick(text, text, text[], boolean) to service_role;

comment on function public.lms_mobile_submit_pick(text, text, text[], boolean) is
  'Atomically validates and records a mobile pick or Multi Chip selection. Intended for the isolated staging mobile-league server function using service_role.';
