-- Permit rate limiting for mobile recovery-code issuance in staging.
alter table public.mobile_api_rate_limits
  drop constraint if exists mobile_api_rate_limits_operation_check;

alter table public.mobile_api_rate_limits
  add constraint mobile_api_rate_limits_operation_check
  check (operation = any (array['create'::text, 'join'::text, 'issue_recovery'::text]));
