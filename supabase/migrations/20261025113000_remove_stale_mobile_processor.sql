-- Remove an earlier staging-only mobile processor superseded by lms_process_competition_round.
-- The active sync path calls lms_process_ready_rounds; this legacy helper is not used.
drop function if exists public.lms_mobile_process_round(uuid);