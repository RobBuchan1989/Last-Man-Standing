-- Server-only result settlement and automatic round progression for isolated staging.
create or replace function public.lms_process_competition_round(p_competition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $lms$
declare
  v_competition public.competitions%rowtype;
  v_fixture_round integer;
  v_fixture_count integer;
  v_incomplete_count integer;
  v_invalid_pick_count integer;
  v_eliminated_count integer := 0;
  v_alive_count integer;
  v_winner_id uuid;
  v_winner_name text;
  v_next_matchday integer;
begin
  select c.* into v_competition
    from public.competitions c
   where c.id = p_competition_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 404, 'error', 'League not found.');
  end if;

  if v_competition.status not in ('active', 'open') then
    return jsonb_build_object('ok', true, 'processed', false, 'reason', 'league_not_active', 'status', v_competition.status);
  end if;

  -- Never fall back to the logical game round when no Premier League
  -- matchday is assigned; that could accidentally process a historical matchday.
  if v_competition.fixture_matchday is null then
    return jsonb_build_object('ok', true, 'processed', false, 'reason', 'waiting_fixtures');
  end if;
  v_fixture_round := v_competition.fixture_matchday;

  select count(*) into v_fixture_count
    from public.fixtures f
   where f.round = v_fixture_round;

  if v_fixture_count = 0 then
    return jsonb_build_object('ok', true, 'processed', false, 'reason', 'no_fixtures');
  end if;

  select count(*) into v_incomplete_count
    from public.fixtures f
   where f.round = v_fixture_round
     and (
       upper(coalesce(f.status, '')) not in ('FINISHED', 'FT', 'COMPLETED', 'AWARDED')
       or f.home_score is null
       or f.away_score is null
     );

  if v_incomplete_count > 0 then
    return jsonb_build_object(
      'ok', true, 'processed', false, 'reason', 'waiting_results',
      'fixturesRemaining', v_incomplete_count
    );
  end if;

  select count(*) into v_invalid_pick_count
    from public.picks p
    join public.entries e on e.id = p.entry_id and e.competition_id = v_competition.id
    left join public.fixtures f on f.id = p.fixture_id
   where p.round = v_competition.round
     and (
       f.id is null
       or f.round <> v_fixture_round
       or f.home_score is null
       or f.away_score is null
       or upper(coalesce(f.status, '')) not in ('FINISHED', 'FT', 'COMPLETED', 'AWARDED')
       or (
         lower(p.team) <> lower(coalesce(f.home_team, ''))
         and lower(p.team) <> lower(coalesce(f.away_team, ''))
       )
     );

  if v_invalid_pick_count > 0 then
    return jsonb_build_object(
      'ok', false, 'status', 409, 'error', 'One or more picks do not match a completed fixture in the current matchday.',
      'invalidPicks', v_invalid_pick_count
    );
  end if;

  update public.picks p
     set result = case
       when lower(p.team) = lower(f.home_team) and f.home_score > f.away_score then 'win'
       when lower(p.team) = lower(f.away_team) and f.away_score > f.home_score then 'win'
       when f.home_score = f.away_score then 'draw'
       else 'loss'
     end
    from public.fixtures f
   where p.fixture_id = f.id
     and p.round = v_competition.round
     and exists (
       select 1 from public.entries e
        where e.id = p.entry_id and e.competition_id = v_competition.id
     );

  with outcomes as (
    select
      p.entry_id,
      count(*)::integer as pick_count,
      bool_and(p.is_multi) as all_multi,
      bool_or(p.result = 'win') as any_win,
      bool_and(p.result = 'win') as all_win
    from public.picks p
    join public.entries e on e.id = p.entry_id
    where e.competition_id = v_competition.id
      and p.round = v_competition.round
    group by p.entry_id
  )
  update public.entries e
     set alive = false
   where e.competition_id = v_competition.id
     and e.alive = true
     and (
       not exists (select 1 from outcomes o where o.entry_id = e.id)
       or exists (
         select 1 from outcomes o
          where o.entry_id = e.id
            and (
              (o.all_multi and (o.pick_count <> 2 or not o.any_win))
              or (not o.all_multi and (o.pick_count <> 1 or not o.all_win))
            )
       )
     );
  get diagnostics v_eliminated_count = row_count;

  select count(*) into v_alive_count
    from public.entries e
   where e.competition_id = v_competition.id
     and e.alive = true;

  if v_alive_count = 1 then
    select e.id, e.name into v_winner_id, v_winner_name
      from public.entries e
     where e.competition_id = v_competition.id and e.alive = true
     limit 1;

    insert into public.season_winners(competition_id, season_number, winner_entry_id, winner_name, completed_at)
    values (v_competition.id, v_competition.season_number, v_winner_id, v_winner_name, now())
    on conflict (competition_id, season_number) do nothing;

    update public.competitions set status = 'finished' where id = v_competition.id;
    return jsonb_build_object(
      'ok', true, 'processed', true, 'status', 'finished', 'reason', 'winner',
      'winnerEntryId', v_winner_id, 'winnerName', v_winner_name,
      'eliminated', v_eliminated_count, 'alive', 1, 'round', v_competition.round
    );
  end if;

  if v_alive_count = 0 then
    update public.competitions set status = 'finished' where id = v_competition.id;
    return jsonb_build_object(
      'ok', true, 'processed', true, 'status', 'finished', 'reason', 'no_survivors',
      'eliminated', v_eliminated_count, 'alive', 0, 'round', v_competition.round,
      'winnerRecorded', false
    );
  end if;

  select min(f.round) into v_next_matchday
    from public.fixtures f
   where f.round > v_fixture_round
     and f.kickoff > now()
     and upper(coalesce(f.status, '')) in ('TIMED', 'SCHEDULED', 'NS');

  update public.competitions
     set round = v_competition.round + 1,
         fixture_matchday = v_next_matchday,
         status = case when v_next_matchday is null then 'waiting_fixtures' else 'active' end
   where id = v_competition.id;

  return jsonb_build_object(
    'ok', true, 'processed', true,
    'status', case when v_next_matchday is null then 'waiting_fixtures' else 'active' end,
    'reason', case when v_next_matchday is null then 'waiting_next_matchday' else 'round_advanced' end,
    'eliminated', v_eliminated_count, 'alive', v_alive_count,
    'previousRound', v_competition.round, 'round', v_competition.round + 1,
    'fixtureMatchday', v_next_matchday
  );
end;
$lms$;

create or replace function public.lms_process_ready_rounds()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $lms$
declare
  v_competition_id uuid;
  v_result jsonb;
  v_processed integer := 0;
  v_results jsonb := '[]'::jsonb;
begin
  for v_competition_id in
    select c.id from public.competitions c
     where c.status in ('active', 'open')
     order by c.created_at
  loop
    v_result := public.lms_process_competition_round(v_competition_id);
    if coalesce((v_result->>'processed')::boolean, false) then
      v_processed := v_processed + 1;
    end if;
    v_results := v_results || jsonb_build_array(
      jsonb_build_object('competitionId', v_competition_id, 'result', v_result)
    );
  end loop;

  return jsonb_build_object('ok', true, 'processedCompetitions', v_processed, 'results', v_results);
end;
$lms$;

revoke all on function public.lms_process_competition_round(uuid) from public, anon, authenticated;
revoke all on function public.lms_process_ready_rounds() from public, anon, authenticated;
grant execute on function public.lms_process_competition_round(uuid) to service_role;
grant execute on function public.lms_process_ready_rounds() to service_role;

comment on function public.lms_process_competition_round(uuid) is
  'Settles a completed staging Premier League matchday, applies normal/Multi Chip survival rules, eliminates missed picks, advances rounds, and records a sole winner. Service-role only.';
comment on function public.lms_process_ready_rounds() is
  'Processes all active/open staging competitions whose assigned fixture matchday is fully settled. Service-role only.';
