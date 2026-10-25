# Mobile acceptance test plan

Run only against an isolated staging backend and a dedicated test league.

## Staging checkpoint — 24 October 2026

- [x] Created the staging base schema and persistent rate-limit table in project `tdtwbuoakjsbkjaljmla`.
- [x] Verified the staging tables are empty and RLS is enabled.
- [x] Verified no public/authenticated table grants or RLS policies exist yet; direct public table access remains closed.
- [x] Deployed the `mobile-league` Edge Function to staging (active, version 1) for create/join actions.
- [x] Added native create/join forms and SecureStore-backed player-session persistence.
- [x] Added CI workflow definitions for Expo typechecking/config validation and Deno checking of the Edge Function.
- [ ] End-to-end HTTP test of create/join and a real iOS/Android typecheck still need a successful CI/device run.
- [ ] Fixture sync, dashboard reads, pick submission, round processing, and deep links are not yet connected.

## Onboarding
- [ ] Open app to home screen.
- [ ] Create a new league with a name and organiser/player name.
- [ ] Confirm the league code and share link are shown.
- [ ] Share the invite link to another device.
- [ ] Join via code and via link; verify the player can enter a name.
- [ ] Reopen a shared link with the app installed and without the app installed.

## Player identity and persistence
- [ ] App restart preserves the correct league/player identity.
- [ ] Switching between two leagues selects the correct player entry for each league.
- [ ] Recovery flow restores the intended player without changing another entry.
- [ ] Invalid recovery details fail safely.
- [ ] PKCE/password-reset flow works or is deliberately routed through a secure browser fallback.

## Game rules
- [ ] A valid pick saves once.
- [ ] Duplicate team selection is rejected.
- [ ] Draw/loss elimination and win progression follow the existing backend rules.
- [ ] Current live-round picks remain hidden from other players.
- [ ] Previous-round picks and statuses can be viewed.
- [ ] Multi Chip works once per season and either winning selection advances the player.
- [ ] Round processing and result sync remain server-driven.
- [ ] Winner detection and season reset behave as on the website.
- [ ] Season winner history remains visible.

## Security and release
- [ ] Admin pages/actions remain restricted.
- [ ] No service-role key or football-data API key is bundled into the app.
- [ ] No production league or player records are touched during testing.
- [ ] iOS and Android builds tested on physical devices.
- [ ] Accessibility, external links, back navigation, offline/error states, and app-store requirements reviewed.

## Staging checkpoint — 25 October 2026

- [x] Added server-only `lms_mobile_submit_pick` RPC in migration `20261025103000_atomic_mobile_pick_submission.sql`.
- [x] Replaced the mobile Edge Function's multi-request pick writes with one RPC call. The database now validates the session, league, round, player status, unused teams, fixture eligibility and Multi Chip before committing.
- [x] Applied the RPC migration to staging project `tdtwbuoakjsbkjaljmla`.
- [x] Deployed `mobile-league` version 7 to staging.
- [x] Ran isolated SQL smoke tests using temporary staging-only competition, players and future fixtures: normal pick saved once; duplicate round pick rejected; Multi Chip saved exactly two picks and set its used flag; second Multi Chip attempt rejected; invalid second Multi Chip team saved no partial picks and left the chip unused.
- [x] Removed the temporary test competition and fixtures; verified zero test rows remained.
- [ ] Full mobile HTTP create/join/dashboard/pick flow remains unverified because this execution environment cannot reach the staging HTTPS endpoint directly.
- [ ] Fixture sync still needs a server-side `FOOTBALL_DATA_API_TOKEN` secret and a protected invocation mechanism; staging fixtures are currently empty.
- [x] Added server-only result settlement and progression RPCs in migration `20261025110000_staging_round_processing.sql`; the functions only execute for `service_role`.
- [x] Ran isolated staging regression tests with temporary fixtures and entries: standard win survives; standard loss is eliminated; a Multi Chip pair with one win and one loss survives; a missed pick is eliminated; logical round advances to the next fixture matchday; a sole survivor is recorded in `season_winners`; zero survivors finishes the league without recording a false winner.
- [x] Removed all temporary processing-test competitions, fixtures, picks and winner-history rows; staging game tables were verified empty after cleanup.
- [x] Added and deployed protected `sync-fixtures` Edge Function version 1; its source passed Deno typechecking and it calls the staging round processor after upserting fixtures.
- [ ] A real fixture sync is not yet verified. Confirm `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` exist in staging Edge Function secrets, invoke the endpoint securely, and check the imported fixture rows.
- [ ] Reset/new-season behavior and full HTTP/device end-to-end flow still need tests.

## Result-processing regression details — 25 October 2026

- Standard pick results were settled from final fixture scores as `win`/`loss`.
- Multi Chip survival was aggregated per player/round; either winning selection was sufficient to keep the player alive.
- Players with no pick were eliminated when the fixture matchday completed.
- The competition advanced from logical round 1 / fixture matchday 1 to logical round 2 / fixture matchday 2 after all matchday 1 fixtures were final.
- A one-survivor test stored the winner name and entry reference and marked the league finished.
- A zero-survivor test marked the league finished but wrote no winner row.
- These were controlled SQL-level staging tests, not a full HTTP/device end-to-end test.

## Season reset regression — 25 October 2026

- [x] Verified a non-owner session receives HTTP-equivalent status 403 from the reset RPC and the finished league remains unchanged.
- [x] Verified the organiser can reset a finished staging season: season increments, logical round returns to 1, the next upcoming fixture matchday is assigned, player survival and Multi Chip availability reset, and prior season winner history remains intact.
- [x] Deleted the temporary reset-test league and fixture; no reset-test rows remain.
- [ ] The reset and winner-history Edge Function routes are deployed to staging, but HTTP-level verification through the public endpoint remains outstanding.


## Verified staging processing and reset — 25 October 2026

- [x] Ran isolated SQL smoke tests against staging for result settlement, Multi Chip success when one of two teams wins, missed-pick elimination, logical-round advancement, draw elimination, sole-winner recording, and organiser-only season reset.
- [x] Confirmed reset increments the season, restarts at logical round 1, restores all players and Multi Chip availability, clears prior-season picks, and preserves the season winner record.
- [x] Confirmed the synthetic test leagues and fixtures were cleaned up; staging tables are back to zero rows.
- [x] Deployed the protected `sync-fixtures` Edge Function (version 2) and refreshed `mobile-league` (version 11) in staging only.
- [x] Added mobile season-winner history and an organiser-only reset action; GitHub Actions Expo/Deno checks passed on the current branch.
- [x] Configured a staging-only Supabase `pg_cron` job named `lms-staging-fixture-sync` to invoke the protected sync endpoint hourly at minute 17; it safely does nothing until the Vault secret exists.
- [ ] Real fixture sync remains blocked until `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are added to staging Edge Function secrets, and the same sync secret is added to Supabase Vault as `lms_fixture_sync_secret`. The hourly cron is already configured and will begin syncing once the Vault secret is present.
- [ ] Full mobile HTTP create/join/dashboard/pick journey, live fixture sync, and physical-device Android/iOS builds are still unverified.
