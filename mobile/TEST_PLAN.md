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

## Staging checkpoint — 26 October 2026

- [x] Verified the application-code commit deployed to staging is `218e4d9a63b299e8a3b9b3939d7c189b4dba9537`; the latest automated code-check run at parent commit `51ada432de281ee96b1534992c50c2df20c15191` passed all three jobs: Expo typecheck/config, mobile Edge Function Deno check, and fixture-sync Deno check plus helper tests.
- [x] Verified `mobile-league` is active in isolated staging at version 12 and `sync-fixtures` is active at version 3.
- [x] Manually deployed the current branch head to the separate Render staging service with auto-deploy still disabled. The Next.js build succeeded, the service started, and Render reported the service live.
- [x] Rechecked staging table status: `competitions`, `entries`, `fixtures`, `picks`, and `season_winners` all have zero rows; RLS remains enabled.
- [x] Verified the `lms-staging-fixture-sync` cron job is active with schedule `17 * * * *`; its recent scheduled executions succeeded.
- [x] Verified the Vault secret named `lms_fixture_sync_secret` is currently absent. The scheduled job therefore has no configured sync secret to use and fixture syncing remains blocked.
- [ ] Do not mark live fixture sync complete until the staging Edge Function secrets `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are configured and the matching `lms_fixture_sync_secret` is added to staging Vault. Secret values must never be committed or bundled in the app.
- [ ] Fixture table remains empty; a real provider sync has not been verified.
- [ ] Full public HTTP create/join/dashboard/pick/reset test is still outstanding because this environment cannot make direct outbound HTTPS requests to the staging endpoint. SQL regression tests are not a substitute for that end-to-end check.
- [ ] EAS Android/iOS builds and physical-device tests have not yet been run; Expo/Apple build credentials are not configured in this workspace.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.

## Staging checkpoint — 27 October 2026

- [x] Hardened the fixture-sync secret comparison so empty supplied/configured values never compare as authenticated; added regression assertions for both empty-token directions.
- [x] Deployed the updated protected fixture-sync function to the isolated staging Supabase project as version 4; `mobile-league` remains active at version 12.
- [x] GitHub Actions run [40485783306](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40485783306) passed all three jobs on branch head `42c0b4fe6a70d56fbb626d605a3b355425f530da`: Expo typecheck/config, mobile Edge Function Deno check, and fixture-sync Deno check plus helper tests.
- [x] Verified the staging fixture-sync endpoint is reachable from the staging database's HTTP extension. A no-authorization POST returned HTTP 503 with the explicit response that the server-side sync secret is missing. No fixture write occurred.
- [x] Rechecked the staging game tables: `competitions`, `entries`, `fixtures`, `picks`, and `season_winners` all contain zero rows.
- [x] Confirmed the hourly `lms-staging-fixture-sync` cron remains active at `17 * * * *`.
- [ ] Vault secret `lms_fixture_sync_secret` remains absent. The Edge Function secrets `LMS_FIXTURE_SYNC_SECRET` and `FOOTBALL_DATA_API_TOKEN` still require configuration/verification in staging. The direct request confirms fail-closed behaviour, not a real fixture import.
- [ ] Real fixture sync, complete mobile HTTP flow, and physical Android/iOS builds remain unverified.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 27 October 2026 (HTTP journey verified)

- [x] Reached the deployed staging `mobile-league` endpoint through the staging database HTTP extension and executed real HTTP requests against the deployed Edge Function; these were not simulated direct RPC calls.
- [x] Create league returned HTTP 201 and a player session; joining with a second player returned HTTP 201.
- [x] Duplicate player name returned HTTP 409 with the expected rejection.
- [x] Fixture-list route returned HTTP 200 and the controlled synthetic staging matchday fixtures.
- [x] Normal pick returned HTTP 200; Multi Chip with two teams returned HTTP 200 and marked the chip used; a second pick in the same round returned HTTP 409.
- [x] Before round settlement, each player's dashboard returned only that player's own current-round picks; the other player's picks were absent from both `ownCurrentPicks` and `historicalPicks`.
- [x] Settled synthetic round 1 through `lms_process_ready_rounds`: Manchester City and Arsenal were wins, Liverpool was a loss; the normal-pick player survived and the Multi Chip player also survived because one of the two selections won. The logical round advanced to 2 / fixture matchday 39.
- [x] In round 2, one synthetic pick won and the other lost. The processor eliminated one player, recorded the remaining player as season 1 winner, and marked the league finished.
- [x] The deployed HTTP reset route returned HTTP 200; direct staging DB verification confirmed season 2, round 1, matchday 40, both players restored, Multi Chip unused, picks cleared, and the season 1 winner record retained.
- [x] Deleted the temporary league, entries, picks, synthetic fixtures, winner-history row, rate-limit records and HTTP response rows created by the test. Final staging counts: 0 competitions, 0 entries, 0 fixtures, 0 picks, 0 season winners, 0 rate-limit rows.
- [x] Diagnosed a mobile client configuration issue: including the configured publishable key in the `apikey` header returned HTTP 401 `Invalid API key`; the same protected-by-session Edge Function routes worked without that header. Removed the key and bearer header from native requests and removed the unnecessary publishable-key setting from `mobile/native/.env.example`. The Edge Function still validates per-player session tokens server-side. GitHub Actions run [40487388157](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40487388157) passed all three jobs on commit `048bb966c496d6745b3fa37e6de9a2fedafc11ad`.
- [ ] Cross-device recovery with a recovery code is not implemented or tested. SecureStore restoration is currently same-device session persistence only.
- [ ] Real football-data.org fixture import remains blocked by missing staging Edge Function secrets `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET`, plus missing Vault secret `lms_fixture_sync_secret`. Synthetic test fixtures do not count as a real feed test.
- [ ] EAS Android/iOS builds and physical-device tests remain outstanding; Expo/Apple build access is not configured in this workspace.
- [x] No production deployment, production database, or existing live league was accessed or modified during these tests.


## Staging checkpoint — 28 October 2026

- [x] Added mobile self-service recovery-code issuance and recovery UI on `mobile-app-foundation`. The app generates a 24-byte random code, sends only its SHA-256 hash to the server, and displays the plaintext code once for the player to save.
- [x] Added server-only RPCs `lms_mobile_issue_recovery` and `lms_mobile_recover_player`. Recovery validates league, player name and code; failed attempts are throttled by league/player; successful recovery rotates the session token and consumes the code in the same transaction, preventing replay.
- [x] Expanded the staging rate-limit constraint to include recovery-code issuance.
- [x] Applied the recovery, rate-limit and one-time-consumption migrations to staging project `tdtwbuoakjsbkjaljmla`.
- [x] Ran transactional SQL smoke tests in staging: recovery code hash stored; incorrect code rejected; correct code accepted; session token rotated; old token replaced; recovery code deleted; replay rejected. The transaction was rolled back after assertions, leaving no test rows.
- [x] Ran an additional transactional throttle test: eight incorrect codes were rejected, the next attempt was rate-limited even with the correct code, and the stored code/session were left unchanged. The test transaction was rolled back.
- [x] Verified the two recovery RPCs cannot be executed by `anon` or `authenticated`; `service_role` can execute them.
- [x] Deployed the mobile Edge Function to isolated staging (active version 14); fixture-sync remains active at version 4.
- [x] GitHub Actions run [40671023910](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40671023910) passed all three jobs on commit `e7b7af4e47b12d5b3a1fdc882dd29a5b60ad67b3`: Expo typecheck/config, mobile Edge Function Deno check, and fixture-sync Deno check plus helper tests.
- [x] Rechecked staging game/recovery tables after the tests: competitions, entries, fixtures, picks, season winners, recovery codes, recovery attempts and rate-limit rows are all zero.
- [ ] Recovery-code issue/recover still needs a real HTTP-level test through the deployed endpoint and a cross-device UI test; SQL smoke tests alone do not prove the mobile request journey.
- [ ] Real fixture sync remains blocked until `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are configured in staging Edge Function secrets and matching `lms_fixture_sync_secret` is present in staging Vault. The fixture table remains empty.
- [ ] EAS Android/iOS builds and physical-device testing remain outstanding; build credentials are not configured.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 28 October 2026 (mobile recovery codes)

- [x] Added the mobile recovery RPCs to the isolated staging database using migrations `20261028100000_mobile_recovery.sql` and `20261028100500_mobile_recovery_rate_limit.sql`; the rate-limit constraint permits the `issue_recovery` operation.
- [x] Deployed the current branch's `mobile-league` Edge Function to the staging Supabase project as version 14. It exposes recovery-code issue and restore routes, hashes codes server-side, throttles recovery attempts, and rotates the session token after a valid restore.
- [x] Tightened recovery security: successful restore consumes the recovery code in the same database transaction as session-token rotation, preventing replay; the native UI now explains that a successful restore consumes the code and generating another code invalidates the previous one.
- [x] Ran controlled SQL-level staging regression tests: issue a recovery hash for a test player, recover successfully, confirm the returned session token differs from the old token, confirm the code row is consumed, and confirm replay is rejected. All assertions passed and temporary data was removed.
- [x] Verified staging game/recovery tables and rate-limit table were empty after cleanup.
- [x] GitHub Actions run [40670582024](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40670582024) passed all three jobs at commit `0a7f7fc8f09322b45249a8d0d349c40175677f5c`: Expo typecheck/config, mobile Edge Function Deno check, and fixture-sync Deno check/helper tests.
- [ ] HTTP-level recovery-code issue/restore/replay test was attempted but the outbound request was blocked by the execution safety layer; do not treat the SQL RPC test as a full HTTP recovery test.
- [x] The latest code-check run [40671303018](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40671303018) passed after the recovery help-text change.
- [x] Added Android and iOS Metro bundle exports to CI. Run [40671412798](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40671412798) passed on code commit `82fd80113e8cf7505f2520ad75507ba2a4952864`: Expo typecheck/config plus Android bundle export and iOS bundle export, alongside both Edge Function checks. These are JavaScript bundle checks, not EAS installable builds.
- [x] Added `mobile/BUILDING.md` with safe preview-build setup instructions. No EAS build has been launched because an Expo/EAS project is not linked and Apple signing access is not configured.
- [ ] Real football-data.org fixture sync remains blocked by staging secrets `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET`, plus matching Vault secret `lms_fixture_sync_secret`. The fixture table is still empty.
- [ ] EAS Android/iOS builds and physical-device tests remain outstanding; Expo/Apple build access is not configured in this workspace.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 29 October 2026

- [x] Rechecked the current branch head: `6948fa58525235e3ba6516c79724a572bdbd476c`. It is a documentation-only commit after the application-code commit `82fd80113e8cf7505f2520ad75507ba2a4952864`; no newer app code has been deployed.
- [x] Rechecked GitHub Actions run [40671412798](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/40671412798): Expo typecheck/config and Android/iOS Metro bundle exports passed; mobile Edge Function Deno check passed; fixture-sync Deno check and helper tests passed.
- [x] Rechecked staging Edge Functions: `mobile-league` active version 14 and `sync-fixtures` active version 4.
- [x] Rechecked execution privileges for recovery issue/recover, atomic pick submission, round processing, and season reset RPCs: `anon` and `authenticated` have no execute privilege; `service_role` does.
- [x] Rechecked the staging fixture-sync Vault secret by name only (never reading its value): `lms_fixture_sync_secret` is still absent.
- [x] Confirmed the hourly cron job `lms-staging-fixture-sync` remains active at `17 * * * *`. Its latest scheduled executions report SQL job success, but the job deliberately skips the HTTP request while the Vault secret is absent; these successes do not represent a fixture sync.
- [x] Rechecked staging game/recovery/rate-limit tables: competitions, entries, fixtures, picks, season winners, recovery codes, recovery attempts and rate-limit records are all zero.
- [ ] Real football-data.org sync remains blocked until `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are configured as staging Edge Function secrets and the matching `lms_fixture_sync_secret` is added to staging Vault.
- [ ] Cross-device recovery HTTP/UI test remains outstanding. SQL-level recovery, one-time consumption and throttling tests passed previously, but the direct HTTP attempt was blocked by the execution safety layer.
- [ ] EAS Android/iOS installable builds and physical-device testing remain outstanding; Expo project linking and Apple signing access are not configured here.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.

## Staging checkpoint — 30 October 2026

- [x] Pinned EAS `development` and `preview` build profiles to the isolated staging Supabase URL in `mobile/native/eas.json`; the production profile remains without a backend URL.
- [x] Added `mobile/native/scripts/check-build-config.mjs` and `npm run check:build-config`. It verifies the app scheme and platform identifiers, requires development/preview to target staging, checks Android preview is an APK and iOS preview targets physical devices, and rejects secret-like backend variables in EAS profile environment settings.
- [x] Added the EAS safety check to the native CI job and updated `mobile/BUILDING.md` with the staging-pinned build setup.
- [x] Ran the build-config script locally against the checked-in app/EAS configuration; all assertions passed.
- [x] GitHub Actions run [41039713016](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41039713016) completed successfully: EAS staging/secret safety check, Expo TypeScript typecheck, Expo config validation, Android bundle export, iOS bundle export, mobile Edge Function Deno check, and fixture-sync Deno check/helper tests all passed.
- [ ] No installable EAS APK/IPA has been produced; EAS project linking and account/signing access are still required.
- [ ] Fixture syncing remains blocked: staging Vault secret `lms_fixture_sync_secret` is absent. The staging fixture table remains empty; no real football-data.org sync has been verified.
- [x] Rechecked staging game tables: competitions, entries, fixtures, picks and season winners all contain zero rows.
- [x] Render staging remains on `mobile-app-foundation` with automatic deploys disabled; no staging redeploy was triggered by these mobile-only code/config changes.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 31 October 2026

- [x] Added a fixture-normalisation regression test covering all 20 club names currently listed in `lib/teams.ts`, using common football-data.org-style `FC`/`AFC` suffixes and the Brighton naming variant. The protected fixture-sync CI job completed successfully on commit `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`, including the Deno helper tests.
- [x] Rechecked staging Edge Functions: `mobile-league` active version 14 and `sync-fixtures` active version 4.
- [x] Rechecked the staging fixture cron: `lms-staging-fixture-sync` is active at `17 * * * *`. Recent SQL job runs report success, but the job skips its HTTP request while the Vault secret is absent; these are not fixture-sync successes.
- [x] Rechecked the Vault secret by name only: `lms_fixture_sync_secret` is absent. Edge Function secret values were not read.
- [x] Rechecked execution privileges: recovery issue/recover, atomic pick submission, result processing and season reset RPCs cannot be executed by `anon` or `authenticated`; `service_role` can execute them.
- [x] Rechecked staging data: competitions, entries, fixtures, picks, season winners, recovery codes, recovery attempts and rate-limit records all contain zero rows.
- [x] GitHub Actions run [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845) completed successfully: fixture-sync Deno typecheck and all 20 club-name normalisation tests passed; mobile Edge Function Deno check passed; Expo build-safety check, TypeScript typecheck, Expo config validation, Android bundle export and iOS bundle export all passed. These are code/bundle checks, not installable EAS builds.
- [ ] Real football-data.org fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are configured as staging Edge Function secrets and the matching `lms_fixture_sync_secret` is added to staging Vault.
- [ ] HTTP-level recovery-code issue/restore/replay test, EAS installable Android/iOS builds and physical-device testing remain outstanding.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.

## Staging checkpoint — 1 November 2026

- [x] Ran a real HTTP recovery-code journey against the deployed staging `mobile-league` Edge Function (version 14), using the staging database HTTP extension and a temporary test player. Recovery-code issuance returned HTTP 200.
- [x] Restored the player with the issued code; recovery returned HTTP 200 and rotated the session token.
- [x] Verified the new session token could load the league dashboard over HTTP (200), while the pre-recovery session token was rejected (401).
- [x] Replayed the same recovery code; the endpoint rejected it with HTTP 400, confirming one-time consumption through the deployed HTTP route.
- [x] Removed the temporary competition/player, recovery attempt, rate-limit row and HTTP response records. Final staging counts: 0 competitions, 0 entries, 0 fixtures, 0 picks, 0 season winners, 0 recovery codes, 0 recovery attempts and 0 rate-limit rows.
- [x] Rechecked the isolated staging project: `mobile-league` is active at version 14; `sync-fixtures` is active at version 4; the fixture cron remains active at `17 * * * *`.
- [ ] The HTTP recovery route is verified, but the complete recovery UI flow on a second physical device is still outstanding.
- [ ] Real fixture import remains blocked: the staging Vault contains no secrets, including the required `lms_fixture_sync_secret`. The presence of `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` in Edge Function secrets cannot be inspected through the available project connection. The cron therefore skips its HTTP call; fixture count remains zero.
- [ ] Installable EAS Android APK/iOS device build and physical-device acceptance tests remain outstanding; EAS project linking/account access and Apple signing access are required.
- [x] No production deployment, production database, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 2 November 2026

- [x] Compared `mobile-app-foundation` with the previously reviewed commit `122c06ba46cbd1f420d72fd0bcbdc021f8572c7d`; the branch is identical. No application-code changes have landed since the 1 November checkpoint.
- [x] Rechecked GitHub Actions run [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845): all three jobs completed successfully. The fixture helper suite reported 6 passed / 0 failed, including canonicalisation of all 20 current Premier League clubs; the mobile Edge Function Deno check passed; Expo typecheck, build-safety/config checks, and Android/iOS Metro bundle exports passed. These are CI checks and JavaScript bundles, not installable EAS packages.
- [x] Rechecked isolated Supabase staging project `tdtwbuoakjsbkjaljmla`: project status is `ACTIVE_HEALTHY`; `mobile-league` is active at version 14 and `sync-fixtures` is active at version 4.
- [x] Confirmed the hourly `lms-staging-fixture-sync` cron is active. Its five latest scheduled executions (06:17–10:17 UTC on 2 November) completed as cron jobs, but the job is designed to skip the HTTP request when its Vault secret is absent; these are not successful fixture imports.
- [x] Confirmed staging row counts remain zero for fixtures, competitions, entries, picks and season winners; Vault currently contains zero secrets.
- [x] Sent an unauthorised POST to the staging fixture-sync endpoint at 10:48 UTC. It returned HTTP 503 with the expected fail-closed message that the server-side sync secret is missing. No fixture write occurred; the temporary HTTP response record created by this probe was removed.
- [x] Inspected native build configuration: development and preview profiles are pinned to the staging Supabase URL; Android preview is configured as an internal APK and iOS preview targets a physical device. App scheme and bundle/package identifiers are present.
- [ ] Real fixture import remains blocked until `LMS_FIXTURE_SYNC_SECRET` is configured in staging Edge Function secrets and the same value is stored in Vault as `lms_fixture_sync_secret`. The existing `FOOTBALL_DATA_API_TOKEN` must also be present in staging Edge Function secrets; its hidden value cannot be inspected through the available connection.
- [ ] The EAS project is not linked in the checked-in app configuration (no `extra.eas.projectId` is present). An Expo/EAS account with access is required to link it and create installable preview builds; iOS device builds additionally require Apple Developer signing access.
- [ ] Complete second-device recovery UI and physical Android/iOS acceptance testing remain outstanding.
- [x] No production deployment, production database, existing live league, or production configuration was accessed or modified during this checkpoint.


## Staging checkpoint — 3 November 2026 (deployed HTTP regression)

- [x] Used only the isolated staging Supabase project and deployed `mobile-league` version 14. Inserted five temporary synthetic fixtures across matchdays 100 and 101, then created a dedicated test league through the deployed HTTP endpoint (HTTP 201).
- [x] Joined a second test player through HTTP (201); duplicate player name was rejected (409).
- [x] Fixture-list route returned HTTP 200 for matchday 100. The organiser's normal pick returned HTTP 200; the second player's two-team Multi Chip returned HTTP 200 and set the used flag. A second pick in the same round was rejected (409).
- [x] Dashboard HTTP responses returned only each caller's own current-round picks; the other player's current-round selections were absent. An invalid session was rejected (401).
- [x] Marked the three synthetic matchday-100 fixtures final and invoked the server-side `lms_process_ready_rounds` processor. Arsenal won for the normal pick; the Multi Chip pair had one loss (Manchester City) and one win (Chelsea), and that player survived. The league advanced from logical round 1 / matchday 100 to round 2 / matchday 101.
- [x] Submitted both round-2 picks through HTTP (both 200). After synthetic final scores were applied, the processor eliminated the losing player, finished the league and recorded Regression Owner as the season-1 winner.
- [x] The finished dashboard route returned previous-round pick history and the season-winner record.
- [x] Removed the temporary league (including entries, picks and winner history), five synthetic fixtures, three test rate-limit rows and all 13 HTTP response rows created by this test. Verified final staging counts: 0 competitions, 0 entries, 0 fixtures, 0 picks, 0 season winners and 0 rate-limit rows; Vault still has 0 secrets.
- [ ] This was a deployed HTTP journey with synthetic fixtures and a direct server-side round-processor invocation. It is not a real football-data.org import test, a physical-device test, or proof that the scheduled fixture-sync invocation is working.
- [ ] Real fixture sync remains blocked until staging Edge Function secrets `FOOTBALL_DATA_API_TOKEN` and `LMS_FIXTURE_SYNC_SECRET` are configured and the identical sync secret is added to Vault as `lms_fixture_sync_secret`. The existing API token's hidden value cannot be inspected through the available connection.
- [ ] EAS project linking, installable Android/iOS preview builds and physical-device acceptance remain outstanding; Expo/EAS access and Apple signing access are required.
- [ ] Season reset was not rerun in this checkpoint; the earlier controlled staging reset regression remains the available evidence.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified.



## Staging checkpoint — 4 November 2026

- [x] Confirmed the current `mobile-app-foundation` branch head is `593a0659b2b1fd6c7f62e507f723d484437c25da` (the 3 November HTTP-regression documentation commit). No later application-code commit is present.
- [x] Rechecked isolated Supabase staging project `tdtwbuoakjsbkjaljmla`: status `ACTIVE_HEALTHY`; `mobile-league` active at version 14; `sync-fixtures` active at version 4.
- [x] Rechecked staging game and recovery data: fixtures, competitions, entries, picks, season winners, recovery codes, recovery attempts and rate-limit rows are all zero. Supabase Vault contains zero secrets.
- [x] Confirmed the staging fixture cron remains active at `17 * * * *`. Its five latest runs on 4 November (06:17–10:17 UTC) have cron status `succeeded`, but the command is conditional on Vault secret `lms_fixture_sync_secret`; with Vault empty, it takes the no-op branch. There were zero rows in `net._http_response` since midnight, so no fixture-sync HTTP request or import is evidenced today.
- [x] Re-read deployed `sync-fixtures` version 4: it requires Edge Function secrets `LMS_FIXTURE_SYNC_SECRET`, `FOOTBALL_DATA_API_TOKEN`, and server-side Supabase credentials; it fetches football-data.org Premier League matches, upserts fixtures, assigns a next matchday to eligible staging competitions and invokes `lms_process_ready_rounds`. Secret values are not exposed by the available project connection.
- [x] Rechecked native build files: `mobile/native/app.json` still has no `extra.eas.projectId`; `eas.json` pins development/preview profiles to the staging Supabase URL, configures Android preview as an APK and iOS preview for physical devices. No EAS build has been created.
- [x] Checked current branch-head GitHub status: no status checks are attached to the 3 November documentation-only commit. The previously recorded 31 October CI run is not a fresh run for this branch head.
- [x] Ran Supabase security/performance advisors. The nine RLS-enabled/no-policy findings are consistent with the deliberate server-only table-access model: a fresh privilege query returned no table grants to `anon` or `authenticated`. One informational performance finding identifies the missing index on `season_winners.winner_entry_id`; this is non-blocking with the staging table empty and is recorded for later schema review.
- [ ] Real fixture import remains blocked until the existing `FOOTBALL_DATA_API_TOKEN` is verified in staging Edge Function secrets, a new high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical value is stored in Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking, installable Android/iOS preview builds and physical-device acceptance remain outstanding; Expo/EAS access and Apple Developer signing access are required.
- [ ] No new gameplay or recovery HTTP regression was run in this checkpoint; the 3 November deployed HTTP gameplay test and 1 November deployed HTTP recovery test remain the latest evidence for those flows.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 5 November 2026

- [x] Re-read the live GitHub branch reference: `mobile-app-foundation` points to `8bbc44c9850f1666ac3a769cf198a95f8ee86b4a`. The commit is documentation-only (`mobile/TEST_PLAN.md`) and its parent is `593a0659b2b1fd6c7f62e507f723d484437c25da`.
- [x] Checked the current branch-head combined commit status: no status checks are attached to the 5 November checkpoint's starting commit. The latest successful workflow run found for this branch is [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845), created 31 October on application commit `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`; it is not a fresh run for the current branch head.
- [x] Confirmed the isolated staging Supabase project `tdtwbuoakjsbkjaljmla` is `ACTIVE_HEALTHY`; `mobile-league` is active at version 14 and `sync-fixtures` is active at version 4.
- [x] Rechecked staging data: competitions, entries, fixtures, picks, season winners, recovery codes, recovery attempts and rate-limit rows all contain zero records. Supabase Vault contains zero secrets.
- [x] Rechecked the hourly `lms-staging-fixture-sync` cron. It is active at `17 * * * *`; its five latest runs on 5 November (05:17–09:17 UTC) report SQL job status `succeeded`. The command checks Vault first and skips the HTTP request when `lms_fixture_sync_secret` is absent; these cron successes are no-op executions, not fixture imports.
- [x] Sent a fresh unauthorised POST to the isolated staging `sync-fixtures` endpoint. It returned HTTP 503 with the expected message that the server-side sync secret is missing. The probe created one temporary `net._http_response` diagnostic row (not a fixture or league write). A DELETE cleanup attempt was blocked by the SQL safety layer, so that single diagnostic row may remain.
- [x] Re-read the deployed fixture importer source. It requires `LMS_FIXTURE_SYNC_SECRET`, `FOOTBALL_DATA_API_TOKEN` and server-side Supabase credentials before it calls football-data.org or upserts fixtures. Hidden Edge Function secret values are not exposed by the available connection.
- [x] Re-read native Expo configuration. Development and preview profiles remain pinned to the staging Supabase URL; Android preview is configured as an internal APK and iOS preview targets a physical device. `mobile/native/app.json` still has no `extra.eas.projectId`, so EAS linking/builds remain outstanding.
- [x] Refreshed Supabase advisors. The security advisor reports nine RLS-enabled tables without policies; this is consistent with the intended server-only data access, and no public policies were added. The performance advisor reports one unindexed foreign key on `season_winners.winner_entry_id`; this remains a non-blocking schema optimisation and was not changed.
- [ ] Real football-data.org fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` is confirmed in staging Edge Function secrets, a new high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical sync secret is stored in Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking and installable Android/iOS preview builds remain outstanding. Expo/EAS account access is required; iOS device signing also requires Apple Developer access.
- [ ] The 1 November recovery HTTP test and 3 November gameplay HTTP regression remain the latest positive deployed HTTP evidence. No gameplay/recovery success-path or physical-device test was rerun on 5 November.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 6 November 2026

- [x] Read the live Git ref: `mobile-app-foundation` points to `4a84ab5eb823fd57ea5c5527debecc8342253c64` (commit message: “Clarify fixture probe response-log cleanup”).
- [x] Compared the branch head with the latest application commit covered by CI, `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`. The branch is 9 commits ahead and 0 behind; the only changed paths across those commits are `mobile/README.md` and `mobile/TEST_PLAN.md`. No application source, Edge Function or migration code has changed since that CI-tested application commit.
- [x] Checked combined commit status for the current branch head: no status checks are attached. The latest successful workflow run remains [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845), created 31 October 2026 against `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`. Its three jobs completed successfully: Expo typecheck/config plus Android/iOS bundle exports; mobile Edge Function Deno check; fixture-sync Deno check and fixture normalisation tests. This is not a fresh run against the 6 November branch head.
- [x] Re-read the workflow definition. Push CI is path-filtered to `mobile/native/**`, `supabase/functions/mobile-league/**`, `supabase/functions/sync-fixtures/**`, `supabase/migrations/**` and the workflow file. Documentation-only updates do not trigger this workflow.
- [x] Confirmed staging project `tdtwbuoakjsbkjaljmla` remains `ACTIVE_HEALTHY`; `mobile-league` is active at version 14 and `sync-fixtures` at version 4.
- [x] Read-only staging snapshot: competitions 0, entries 0, fixtures 0, picks 0, season winners 0; Vault secret names are empty.
- [x] Confirmed `lms-staging-fixture-sync` remains active on `17 * * * *`. The six latest runs (05:17–10:17 UTC) have cron status `succeeded`, but the command checks Vault and skips `net.http_post` when `lms_fixture_sync_secret` is absent. These are no-op scheduler runs, not successful provider imports.
- [x] Confirmed `net._http_response` has 0 rows in the last 24 hours and 1 historical row in total. The older diagnostic row from the unauthorised 5 November probe is not game data; no current fixture-sync HTTP request is being recorded.
- [x] Re-read deployed `sync-fixtures` source. It checks `LMS_FIXTURE_SYNC_SECRET` before using `FOOTBALL_DATA_API_TOKEN`, then upserts provider fixtures and calls `lms_process_ready_rounds`. Hidden Edge Function secret values remain unavailable through the current connection.
- [x] Re-read native configuration: development/preview builds remain pinned to staging; Android preview is an internal APK and iOS preview is a physical-device build. `mobile/native/app.json` still has no `extra.eas.projectId`; no installable EAS artifact has been produced.
- [x] Refreshed Supabase advisors: nine RLS-enabled tables without policies (consistent with the current server-only access model; no public policies added) and one informational unindexed foreign key on `season_winners.winner_entry_id`. No schema changes were made.
- [ ] Real fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` is confirmed in staging Edge Function secrets, a new high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical value is stored in Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking and installable Android/iOS preview builds remain outstanding. Expo/EAS access is required; iOS device signing also requires Apple Developer access.
- [ ] No gameplay/recovery success-path HTTP regression or physical-device test was run in this checkpoint. The 3 November gameplay HTTP regression and 1 November recovery HTTP test remain the latest positive deployed HTTP evidence.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified during this checkpoint.


## Staging checkpoint — 7 November 2026

- [x] Compared `mobile-app-foundation` with the latest application commit covered by the recorded successful CI run, `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`. The branch is 10 commits ahead and 0 behind. Across that comparison, only `mobile/README.md` and `mobile/TEST_PLAN.md` changed; no application source, Edge Function or migration code has changed since the CI-tested application commit.
- [x] Re-read native Expo configuration. `mobile/native/app.json` still has no `extra.eas.projectId`. `mobile/native/eas.json` pins development and preview profiles to staging, configures Android preview as an internal APK and iOS preview for a physical device. No installable EAS build is evidenced.
- [x] Rechecked isolated Supabase staging project `tdtwbuoakjsbkjaljmla`: project status `ACTIVE_HEALTHY`; `mobile-league` active at version 14; `sync-fixtures` active at version 4.
- [x] Read-only staging counts: competitions 0, entries 0, fixtures 0, picks 0, season winners 0, recovery codes 0, recovery attempts 0, rate-limit rows 0, Vault secrets 0.
- [x] Confirmed `lms-staging-fixture-sync` remains active at `17 * * * *`. The eight latest cron runs on 7 November (03:17–10:17 UTC) have scheduler status `succeeded`. The cron command only calls the endpoint when Vault contains a non-empty `lms_fixture_sync_secret`; Vault is empty, so these are no-op runs, not fixture imports.
- [x] Confirmed `net._http_response` contains 0 rows from the last 24 hours. No fixture-sync HTTP request or provider import is evidenced today.
- [x] Re-read deployed `sync-fixtures` version 4. It checks `LMS_FIXTURE_SYNC_SECRET` before using `FOOTBALL_DATA_API_TOKEN`, requires server-side Supabase credentials, upserts provider fixtures and invokes `lms_process_ready_rounds`. Hidden Edge Function secret values remain unavailable through the current connection.
- [x] Retrieved job-level details for GitHub Actions run [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845): all three jobs completed successfully. Fixture-sync Deno typecheck and helper tests passed; mobile Edge Function Deno typecheck passed; Expo typecheck, staging/build configuration validation and Android/iOS bundle exports passed. This run is dated 31 October and is not a fresh run against the current branch head. The branch-head documentation-only changes do not trigger the configured path-filtered workflow.
- [x] Refreshed Supabase advisors. Nine RLS-enabled tables have no policies, consistent with the current server-only access model; no public policies were added. One informational unindexed foreign key remains on `season_winners.winner_entry_id`; no schema change was made.
- [ ] Real fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` is confirmed in staging Edge Function secrets, a new high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical sync secret is stored in Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking, installable Android/iOS preview builds and physical-device acceptance remain outstanding; Expo/EAS access and Apple Developer signing access are required.
- [ ] No gameplay or recovery success-path regression, provider-backed result processing or physical-device test was run in this checkpoint. The 3 November deployed HTTP gameplay regression and 1 November deployed HTTP recovery test remain the latest positive HTTP evidence.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified.


## Staging checkpoint — 8 November 2026

- [x] Rechecked the isolated Supabase staging project `tdtwbuoakjsbkjaljmla`: project status `ACTIVE_HEALTHY`; `mobile-league` active at version 14; `sync-fixtures` active at version 4.
- [x] Read-only staging counts remain zero for competitions, entries, fixtures, picks, season winners and Vault secrets. No staging game data was created or changed during this checkpoint.
- [x] Rechecked `lms-staging-fixture-sync`: active, scheduled `17 * * * *`. There were 24 scheduler runs in the previous 24 hours, all with status `succeeded`; the latest started at 10:17 UTC on 8 November. The cron command only invokes the importer when Vault contains a non-empty `lms_fixture_sync_secret`. Vault is empty, so these are successful no-op scheduler runs, not successful fixture imports.
- [x] Confirmed `net._http_response` has 0 rows in the last 24 hours and 1 historical row in total. No fixture-sync HTTP invocation or provider import is evidenced in the current window.
- [x] Re-read deployed `sync-fixtures` version 4. It requires `LMS_FIXTURE_SYNC_SECRET`, `FOOTBALL_DATA_API_TOKEN` and server-side Supabase credentials; after authentication it fetches Premier League matches, upserts fixtures, assigns matchdays to eligible staging leagues and calls `lms_process_ready_rounds`. Hidden Edge Function secret values cannot be inspected through the current connection.
- [x] Re-read native Expo configuration. Development and preview profiles remain pinned to the staging Supabase URL; Android preview is configured as an internal APK and iOS preview targets a physical device. `mobile/native/app.json` still has no `extra.eas.projectId`; no installable EAS artifact is evidenced.
- [x] Compared the last recorded branch checkpoint `3d02739b47d3d03e5623d2333f87603e7f6bddda` with the CI-tested application commit `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`: 11 commits ahead, 0 behind. The comparison contains changes only to `mobile/README.md` and `mobile/TEST_PLAN.md`; no application source, Edge Function or migration code changed after the CI-tested application commit.
- [x] Retrieved job details for the previously reviewed GitHub Actions run [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845): all three jobs completed successfully (fixture-sync Deno/typecheck and helper tests; mobile Edge Function Deno/typecheck; Expo typecheck/config validation and Android/iOS bundle exports). This is not a fresh run for the current branch checkpoint, and bundle exports are not installable builds.
- [x] Refreshed Supabase advisors. Nine tables have RLS enabled but no policies; read-only privilege checks confirmed `anon` and `authenticated` have no SELECT privilege on the checked game tables. No public policies or grants were added. One informational unindexed foreign key remains on `season_winners.winner_entry_id`; no schema change was made.
- [ ] Real fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` is confirmed in staging Edge Function secrets, a new high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical sync secret is stored in Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking, installable Android/iOS preview builds and physical-device acceptance remain outstanding; Expo/EAS access is required and iOS device signing additionally requires Apple Developer access.
- [ ] No gameplay/recovery success-path regression, provider-backed result processing or physical-device test was run in this checkpoint. The 3 November deployed HTTP gameplay regression and 1 November deployed HTTP recovery test remain the latest positive HTTP evidence.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified.


## Staging checkpoint — 9 November 2026

- [x] Compared `mobile-app-foundation` with its previous recorded checkpoint `1d1e04ec1b317c79e394ed49882221b8e9465fb3`: identical, with no new commits since 8 November. Compared with the last CI-tested application commit `077e7b8e688ac914b6bfa8f625e8e5b15515ff6a`: 12 commits ahead and 0 behind. Changed paths are limited to documentation; application source, Edge Functions and migrations have not changed since that application commit.
- [x] Checked current branch-head combined CI status and commit-associated workflow runs: no status checks and no PR-triggered workflow runs are attached to the branch head. The latest previously recorded successful workflow remains run [41192192845](https://github.com/RobBuchan1989/Last-Man-Standing/actions/runs/41192192845), dated 31 October; it is not a fresh run for this branch head.
- [x] Rechecked isolated Supabase project `tdtwbuoakjsbkjaljmla`: `ACTIVE_HEALTHY`; `mobile-league` active version 14; `sync-fixtures` active version 4.
- [x] Read-only table snapshot: competitions 0, entries 0, fixtures 0, picks 0, season winners 0; Vault secret names 0. No staging game data was written during this checkpoint.
- [x] Confirmed `lms-staging-fixture-sync` is active on `17 * * * *`. The last 24 hours contain 24 succeeded cron executions and 0 other-status executions (first 8 November 11:17 UTC; latest 9 November 10:17 UTC). The job SQL checks Vault for `lms_fixture_sync_secret` and returns null without calling `net.http_post` when the secret is absent. Vault is empty, and `net._http_response` has 0 rows in the last 24 hours. These are successful no-op scheduler executions, not fixture imports.
- [x] Re-read deployed `sync-fixtures` version 4: it checks `LMS_FIXTURE_SYNC_SECRET`, then requires `FOOTBALL_DATA_API_TOKEN` and server-side Supabase credentials before fetching Premier League matches, upserting fixtures and invoking `lms_process_ready_rounds`. Hidden Edge Function secret values cannot be inspected through the current connection.
- [x] Re-read native configuration: development/preview EAS profiles point to the staging Supabase URL; Android preview is an internal APK; iOS preview targets physical devices. `mobile/native/app.json` still has no `extra.eas.projectId`; no installable EAS APK/IPA is evidenced.
- [x] Refreshed Supabase advisors: nine RLS-enabled tables have no policies; read-only grant inspection returned no `anon` or `authenticated` grants on the five checked core game tables. One informational unindexed foreign key remains on `season_winners.winner_entry_id`. No policy, grant or schema change was made.
- [ ] Real fixture import remains blocked until `FOOTBALL_DATA_API_TOKEN` is confirmed in staging Edge Function secrets, a high-entropy `LMS_FIXTURE_SYNC_SECRET` is added there, and the identical value is stored in staging Vault as `lms_fixture_sync_secret`.
- [ ] EAS project linking and installable Android/iOS preview builds remain outstanding. Expo/EAS account access is required; iOS physical-device signing additionally requires Apple Developer access.
- [ ] No gameplay/recovery success-path regression, real provider sync, provider-driven result processing or physical-device test was run in this checkpoint. The 3 November gameplay HTTP regression and 1 November recovery HTTP test remain the latest positive deployed HTTP evidence.
- [x] No production deployment, production database, production configuration, or existing live league was accessed or modified during this checkpoint.
