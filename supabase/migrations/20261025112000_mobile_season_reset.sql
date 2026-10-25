-- Organiser-only season reset for the isolated mobile staging game.
-- Keep the winner ledger, but clear round picks so round numbers can restart at one.

drop function if exists public.lms_mobile_submit_pick(uuid, text, text[], boolean);
drop function if exists public.lms_mobile_reset_season(uuid, text);
create unique index if not exists entries_session_token_key on public.entries(session_token);

create or replace function public.lms_mobile_reset_season(p_session_token text, p_league_code text)
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
  v_next_matchday integer;
begin
  if coalesce(length(trim(p_session_token)), 0) = 0
     or coalesce(length(trim(p_league_code)), 0) < 4 then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'A valid organiser session and league code are required.');
  end if;
  select e.id, e.competition_id into v_entry_id, v_competition_id
    from public.entries e where e.session_token::text = trim(p_session_token) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'This player session could not be verified.');
  end if;
  select c.* into v_competition from public.competitions c
   where c.id = v_competition_id
     and c.code = upper(regexp_replace(trim(p_league_code), '[^A-Za-z0-9-]', '', 'g'))
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 403, 'error', 'This session does not match that league.');
  end if;
  select e.* into v_entry from public.entries e where e.id = v_entry_id for update;
  if not found or v_entry.competition_id <> v_competition.id then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'This player session could not be verified.');
  end if;
  if v_competition.owner_entry_id is distinct from v_entry.id then
    return jsonb_build_object('ok', false, 'status', 403, 'error', 'Only the league organiser can reset this season.');
  end if;
  if v_competition.status <> 'finished' then
    return jsonb_build_object('ok', false, 'status', 409, 'error', 'The season can only be reset after it has finished.');
  end if;

  select min(f.round) into v_next_matchday from public.fixtures f
   where f.round is not null and f.kickoff > now()
     and upper(coalesce(f.status, '')) in ('TIMED', 'SCHEDULED', 'NS');
  if v_next_matchday is null then
    return jsonb_build_object('ok', false, 'status', 409,
      'error', 'No upcoming Premier League fixtures are available for the new season yet.');
  end if;

  delete from public.picks p using public.entries e
   where p.entry_id = e.id and e.competition_id = v_competition.id;
  update public.entries set alive = true, multi_chip_used = false
   where competition_id = v_competition.id;
  update public.competitions
     set season_number = season_number + 1, round = 1,
         fixture_matchday = v_next_matchday, season_started_at = now(), status = 'active'
   where id = v_competition.id;

  return jsonb_build_object('ok', true, 'status', 200,
    'seasonNumber', v_competition.season_number + 1,
    'round', 1, 'fixtureMatchday', v_next_matchday);
end;
$lms$;

revoke all on function public.lms_mobile_reset_season(text, text) from public, anon, authenticated;
grant execute on function public.lms_mobile_reset_season(text, text) to service_role;
comment on function public.lms_mobile_reset_season(text, text) is
  'Resets a finished staging season only for the league owner; retains season winner history and restores entries and Multi Chip availability.';
