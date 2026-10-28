-- Mobile recovery codes for the isolated staging app.
-- Both functions are server-only; the Edge Function never exposes database privileges.
create or replace function public.lms_mobile_issue_recovery(
  p_session_token text,
  p_league_code text,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $lms$
declare
  v_entry_id uuid;
begin
  if coalesce(length(trim(p_session_token)), 0) = 0
     or length(trim(p_session_token)) > 100
     or coalesce(length(trim(p_league_code)), 0) < 4
     or coalesce(p_code_hash, '') !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'A valid player session, league code and recovery code are required.');
  end if;

  select e.id
    into v_entry_id
    from public.entries e
    join public.competitions c on c.id = e.competition_id
   where e.session_token::text = trim(p_session_token)
     and upper(c.code) = upper(regexp_replace(trim(p_league_code), '[^A-Za-z0-9-]', '', 'g'))
   for update of e;

  if not found then
    return jsonb_build_object('ok', false, 'status', 401, 'error', 'This player session could not be verified.');
  end if;

  insert into public.player_recovery_codes(entry_id, code_hash, issued_by, issued_at, updated_at)
  values (v_entry_id, lower(p_code_hash), 'mobile-session', now(), now())
  on conflict (entry_id) do update
    set code_hash = excluded.code_hash,
        issued_by = excluded.issued_by,
        issued_at = now(),
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$lms$;

revoke all on function public.lms_mobile_issue_recovery(text, text, text) from public, anon, authenticated;
grant execute on function public.lms_mobile_issue_recovery(text, text, text) to service_role;

create or replace function public.lms_mobile_recover_player(
  p_league_code text,
  p_player_name text,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $lms$
declare
  v_attempt_key text;
  v_failures integer;
  v_entry record;
  v_new_session_token uuid;
begin
  if coalesce(length(trim(p_league_code)), 0) < 4
     or coalesce(length(trim(p_player_name)), 0) < 1
     or length(trim(coalesce(p_player_name, ''))) > 40
     or coalesce(p_code_hash, '') !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object(
      'ok', false, 'status', 400,
      'error', 'Those details could not be verified. Check them and try again.'
    );
  end if;

  v_attempt_key := encode(
    extensions.digest(
      upper(trim(p_league_code)) || '|' || lower(trim(p_player_name)),
      'sha256'
    ),
    'hex'
  );

  delete from public.player_recovery_attempts
   where attempted_at < now() - interval '2 days';

  select count(*)
    into v_failures
    from public.player_recovery_attempts
   where attempt_key = v_attempt_key
     and succeeded = false
     and attempted_at > now() - interval '15 minutes';

  if v_failures >= 8 then
    insert into public.player_recovery_attempts(attempt_key, succeeded)
    values (v_attempt_key, false);
    return jsonb_build_object(
      'ok', false, 'status', 400,
      'error', 'Those details could not be verified. Check them and try again. If you have tried repeatedly, wait 15 minutes before trying again.'
    );
  end if;

  select
      e.id as entry_id,
      e.name as player_name,
      e.alive,
      e.multi_chip_used,
      c.id as competition_id,
      c.code as competition_code,
      c.name as competition_name,
      c.status as competition_status,
      c.round,
      c.season_number,
      c.owner_entry_id,
      rc.code_hash
    into v_entry
    from public.entries e
    join public.competitions c on c.id = e.competition_id
    join public.player_recovery_codes rc on rc.entry_id = e.id
   where upper(c.code) = upper(trim(p_league_code))
     and lower(trim(e.name)) = lower(trim(p_player_name))
   limit 1
   for update of e;

  if not found or v_entry.code_hash is distinct from lower(p_code_hash) then
    insert into public.player_recovery_attempts(attempt_key, succeeded)
    values (v_attempt_key, false);
    return jsonb_build_object(
      'ok', false, 'status', 400,
      'error', 'Those details could not be verified. Check them and try again. If you have tried repeatedly, wait 15 minutes before trying again.'
    );
  end if;

  v_new_session_token := gen_random_uuid();

  update public.entries
     set session_token = v_new_session_token
   where id = v_entry.entry_id;

  -- Recovery codes are one-time credentials. Consume the code in the same transaction
  -- as session rotation so it cannot be replayed on another device.
  delete from public.player_recovery_codes
   where entry_id = v_entry.entry_id;

  insert into public.player_recovery_attempts(attempt_key, succeeded)
  values (v_attempt_key, true);

  return jsonb_build_object(
    'ok', true,
    'action', 'recover',
    'competition', jsonb_build_object(
      'id', v_entry.competition_id,
      'code', v_entry.competition_code,
      'name', v_entry.competition_name,
      'status', v_entry.competition_status,
      'round', v_entry.round,
      'seasonNumber', v_entry.season_number
    ),
    'entry', jsonb_build_object(
      'id', v_entry.entry_id,
      'name', v_entry.player_name,
      'alive', v_entry.alive
    ),
    'sessionToken', v_new_session_token::text
  );
end;
$lms$;

revoke all on function public.lms_mobile_recover_player(text, text, text) from public, anon, authenticated;
grant execute on function public.lms_mobile_recover_player(text, text, text) to service_role;

comment on function public.lms_mobile_issue_recovery(text, text, text) is
  'Issues or rotates a hashed player recovery code after verifying that player session in the isolated mobile backend.';
comment on function public.lms_mobile_recover_player(text, text, text) is
  'Validates a recovery code with throttling, rotates the player session token, and returns the new mobile session. Server-only.';
