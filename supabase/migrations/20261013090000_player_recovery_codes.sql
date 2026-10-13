create table if not exists public.player_recovery_codes (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  code_hash text not null,
  issued_at timestamptz not null default now(),
  issued_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_recovery_attempts (
  id bigint generated always as identity primary key,
  attempt_key text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create index if not exists player_recovery_attempts_key_time_idx
  on public.player_recovery_attempts(attempt_key, attempted_at desc);

alter table public.player_recovery_codes enable row level security;
alter table public.player_recovery_attempts enable row level security;
revoke all on public.player_recovery_codes from anon, authenticated;
revoke all on public.player_recovery_attempts from anon, authenticated;

create or replace function public.lms_admin_set_player_recovery(p_entry_id uuid, p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text;
begin
  v_email := lower(coalesce(auth.jwt()->>'email',''));
  if v_email = '' or not exists (
    select 1 from public.admin_users
    where lower(email)=v_email and active=true
  ) then
    raise exception 'Administrator access required';
  end if;
  if coalesce(p_code_hash,'') !~ '^[a-f0-9]{64}
    raise exception 'Invalid recovery hash';
  end if;
  if not exists(select 1 from public.entries where id=p_entry_id) then
    raise exception 'Player entry not found';
  end if;
  insert into public.player_recovery_codes(entry_id,code_hash,issued_by,issued_at,updated_at)
  values(p_entry_id,p_code_hash,v_email,now(),now())
  on conflict(entry_id) do update
    set code_hash=excluded.code_hash, issued_by=excluded.issued_by,
        issued_at=now(), updated_at=now();
  return true;
end;
$$;
revoke all on function public.lms_admin_set_player_recovery(uuid,text) from public, anon;
grant execute on function public.lms_admin_set_player_recovery(uuid,text) to authenticated;

create or replace function public.lms_recover_player(p_league_code text, p_player_name text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_key text;
  v_entry record;
  v_failures integer;
begin
  if length(trim(coalesce(p_league_code,''))) < 3
    or length(trim(coalesce(p_player_name,''))) < 1
    or coalesce(p_code_hash,'') !~ '^[a-f0-9]{64}
    return null;
  end if;

  v_key := encode(digest(upper(trim(p_league_code)) || '|' || lower(trim(p_player_name)), 'sha256'),'hex');
  delete from public.player_recovery_attempts
    where attempted_at < now() - interval '2 days';

  select count(*) into v_failures
    from public.player_recovery_attempts
   where attempt_key=v_key
     and succeeded=false
     and attempted_at > now()-interval '15 minutes';

  if v_failures >= 8 then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  select e.id as entry_id, c.code as competition_code, rc.code_hash
    into v_entry
    from public.entries e
    join public.competitions c on c.id=e.competition_id
    join public.player_recovery_codes rc on rc.entry_id=e.id
   where upper(c.code)=upper(trim(p_league_code))
     and lower(trim(e.name))=lower(trim(p_player_name))
   limit 1;

  if not found or v_entry.code_hash is distinct from p_code_hash then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,true);
  return jsonb_build_object('entry_id',v_entry.entry_id,'competition_code',v_entry.competition_code);
end;
$$;
revoke all on function public.lms_recover_player(text,text,text) from public;
grant execute on function public.lms_recover_player(text,text,text) to anon, authenticated;
 then
    raise exception 'Invalid recovery hash';
  end if;
  if not exists(select 1 from public.entries where id=p_entry_id) then
    raise exception 'Player entry not found';
  end if;
  insert into public.player_recovery_codes(entry_id,code_hash,issued_by,issued_at,updated_at)
  values(p_entry_id,p_code_hash,v_email,now(),now())
  on conflict(entry_id) do update
    set code_hash=excluded.code_hash, issued_by=excluded.issued_by,
        issued_at=now(), updated_at=now();
  return true;
end;
$$;
revoke all on function public.lms_admin_set_player_recovery(uuid,text) from public, anon;
grant execute on function public.lms_admin_set_player_recovery(uuid,text) to authenticated;

create or replace function public.lms_recover_player(p_league_code text, p_player_name text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_key text;
  v_entry record;
  v_failures integer;
begin
  if length(trim(coalesce(p_league_code,''))) < 3
    or length(trim(coalesce(p_player_name,''))) < 1
    or p_code_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  v_key := encode(digest(upper(trim(p_league_code)) || '|' || lower(trim(p_player_name)), 'sha256'),'hex');
  delete from public.player_recovery_attempts
    where attempted_at < now() - interval '2 days';

  select count(*) into v_failures
    from public.player_recovery_attempts
   where attempt_key=v_key
     and succeeded=false
     and attempted_at > now()-interval '15 minutes';

  if v_failures >= 8 then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  select e.id as entry_id, c.code as competition_code, rc.code_hash
    into v_entry
    from public.entries e
    join public.competitions c on c.id=e.competition_id
    join public.player_recovery_codes rc on rc.entry_id=e.id
   where upper(c.code)=upper(trim(p_league_code))
     and lower(trim(e.name))=lower(trim(p_player_name))
   limit 1;

  if not found or v_entry.code_hash <> p_code_hash then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,true);
  return jsonb_build_object('entry_id',v_entry.entry_id,'competition_code',v_entry.competition_code);
end;
$$;
revoke all on function public.lms_recover_player(text,text,text) from public;
grant execute on function public.lms_recover_player(text,text,text) to anon, authenticated;
 then
    return null;
  end if;

  v_key := encode(digest(upper(trim(p_league_code)) || '|' || lower(trim(p_player_name)), 'sha256'),'hex');
  delete from public.player_recovery_attempts
    where attempted_at < now() - interval '2 days';

  select count(*) into v_failures
    from public.player_recovery_attempts
   where attempt_key=v_key
     and succeeded=false
     and attempted_at > now()-interval '15 minutes';

  if v_failures >= 8 then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  select e.id as entry_id, c.code as competition_code, rc.code_hash
    into v_entry
    from public.entries e
    join public.competitions c on c.id=e.competition_id
    join public.player_recovery_codes rc on rc.entry_id=e.id
   where upper(c.code)=upper(trim(p_league_code))
     and lower(trim(e.name))=lower(trim(p_player_name))
   limit 1;

  if not found or v_entry.code_hash <> p_code_hash then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,true);
  return jsonb_build_object('entry_id',v_entry.entry_id,'competition_code',v_entry.competition_code);
end;
$$;
revoke all on function public.lms_recover_player(text,text,text) from public;
grant execute on function public.lms_recover_player(text,text,text) to anon, authenticated;
 then
    raise exception 'Invalid recovery hash';
  end if;
  if not exists(select 1 from public.entries where id=p_entry_id) then
    raise exception 'Player entry not found';
  end if;
  insert into public.player_recovery_codes(entry_id,code_hash,issued_by,issued_at,updated_at)
  values(p_entry_id,p_code_hash,v_email,now(),now())
  on conflict(entry_id) do update
    set code_hash=excluded.code_hash, issued_by=excluded.issued_by,
        issued_at=now(), updated_at=now();
  return true;
end;
$$;
revoke all on function public.lms_admin_set_player_recovery(uuid,text) from public, anon;
grant execute on function public.lms_admin_set_player_recovery(uuid,text) to authenticated;

create or replace function public.lms_recover_player(p_league_code text, p_player_name text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_key text;
  v_entry record;
  v_failures integer;
begin
  if length(trim(coalesce(p_league_code,''))) < 3
    or length(trim(coalesce(p_player_name,''))) < 1
    or p_code_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  v_key := encode(digest(upper(trim(p_league_code)) || '|' || lower(trim(p_player_name)), 'sha256'),'hex');
  delete from public.player_recovery_attempts
    where attempted_at < now() - interval '2 days';

  select count(*) into v_failures
    from public.player_recovery_attempts
   where attempt_key=v_key
     and succeeded=false
     and attempted_at > now()-interval '15 minutes';

  if v_failures >= 8 then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  select e.id as entry_id, c.code as competition_code, rc.code_hash
    into v_entry
    from public.entries e
    join public.competitions c on c.id=e.competition_id
    join public.player_recovery_codes rc on rc.entry_id=e.id
   where upper(c.code)=upper(trim(p_league_code))
     and lower(trim(e.name))=lower(trim(p_player_name))
   limit 1;

  if not found or v_entry.code_hash <> p_code_hash then
    insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,false);
    return null;
  end if;

  insert into public.player_recovery_attempts(attempt_key,succeeded) values(v_key,true);
  return jsonb_build_object('entry_id',v_entry.entry_id,'competition_code',v_entry.competition_code);
end;
$$;
revoke all on function public.lms_recover_player(text,text,text) from public;
grant execute on function public.lms_recover_player(text,text,text) to anon, authenticated;
