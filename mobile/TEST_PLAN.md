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
- [ ] Result settlement, Multi Chip win aggregation, automatic progression, season winner history and reset are not yet implemented/tested end-to-end.
