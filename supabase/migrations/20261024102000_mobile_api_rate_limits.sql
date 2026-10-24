-- Persistent per-IP rate limiting for the public mobile create/join endpoint.
-- IP addresses are hashed in the function; raw addresses are not stored.

create table public.mobile_api_rate_limits (
  id bigint generated always as identity primary key,
  request_key text not null,
  operation text not null check (operation in ('create', 'join')),
  attempted_at timestamptz not null default now()
);

create index mobile_api_rate_limits_key_operation_time_idx
  on public.mobile_api_rate_limits (request_key, operation, attempted_at desc);

alter table public.mobile_api_rate_limits enable row level security;

revoke all privileges on table public.mobile_api_rate_limits
  from public, anon, authenticated;
grant all privileges on table public.mobile_api_rate_limits
  to service_role;

revoke all privileges on sequence public.mobile_api_rate_limits_id_seq
  from public, anon, authenticated;
grant usage, select, update on sequence public.mobile_api_rate_limits_id_seq
  to service_role;
