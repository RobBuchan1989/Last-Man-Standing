# Mobile app foundation

## Goal

Ship Last Man Standing to the Apple App Store and Google Play while keeping the existing Next.js app, Supabase database, Render deployment, and scheduled football-result processing as the source of truth.

## Repository audit (2026-10-24)

- The app is Next.js 16 with React 19 and is deployed as a server-rendered application.
- `app/page.tsx` uses server actions for joining and creating leagues.
- `lib/supabase/server.ts` uses Next.js request cookies for Supabase server sessions.
- `app/api/player-recovery` is called by the player recovery form.
- `app/auth/confirm/route.ts` handles Supabase PKCE confirmation and redirects to the production domain.
- The README says Supabase pg_cron/pg_net handles automatic football-data.org synchronisation.

## Architecture decision (updated 25 October 2026)

The current native client is an **Expo / React Native app** in `mobile/native`, not a Capacitor WebView. It has its own native screens and calls a reviewed, server-side Supabase Edge Function for mobile create/join, dashboard, fixture, pick, and season-reset actions. The mobile app is connected to a separate staging Supabase project while it is being developed.

Do not convert the existing Next.js website to a static export: the production site still depends on server actions, API routes, cookie-based sessions, and authentication routes. Keep the existing Render-hosted Next.js site and its production database as the website source of truth; do not migrate live leagues into the native app automatically.

Keep Supabase service-role credentials and the football-data.org token on the server only. The native client uses only the staging project URL and publishable key. The mobile app must not expose other players' current-round picks or perform result settlement in the client.

## Data and safety constraints

- Do not migrate, recreate, truncate, or reset production Supabase tables.
- Do not duplicate game progression logic in the mobile client.
- Do not expose Supabase service-role keys or the football-data API key in a mobile bundle.
- Keep automatic result sync and round progression on the existing backend.
- Develop on `mobile-app-foundation`, test against a non-production/test league where possible, and merge only after regression tests pass.

## Additional audit findings

- The repository has API routes for picks, leaderboard data, and player recovery. These can be called from a mobile shell, but the current pick route depends on the existing browser cookies and player-entry identity.
- The player recovery route sets long-lived, HTTP-only cookies. Native WebView cookie handling and shared-link behaviour must be tested before choosing the final shell.
- The native implementation uses Expo and EAS build profiles; Capacitor is not part of the current implementation.
- `next.config.mjs` enables `typescript.ignoreBuildErrors`. A green deployment alone therefore may not prove the TypeScript code is clean; mobile work should add a separate explicit type-check step in CI before release.
- The README's deployment instructions refer to Vercel, while the live service is hosted on Render. Deployment settings must be verified rather than inferred from the README.

## Live-site protection rules

- All work stays on `mobile-app-foundation`; never commit mobile changes to `main`.
- Do not merge a pull request or change Render's production branch, build command, start command, environment variables, or auto-deploy settings as part of this work.
- Do not run database migrations or test writes against production data. Use a separate test league and verify the environment before any test that writes data.
- Do not add mobile-specific redirects, headers, middleware changes, or package scripts to the production branch without review.
- Before any merge, inspect the complete diff and confirm that the change is isolated. A separate branch protects source code, but a deployment platform configured to deploy every branch could still deploy it; check Render's deployment configuration before enabling any preview deployment.

## Next implementation tasks

1. Inspect all API routes, auth callbacks, environment variables, and Render start/build settings.
2. Decide and document the Capacitor integration pattern for this server-rendered Next.js app.
3. Add Capacitor packages and configuration only once the web asset/server strategy is settled.
4. Create iOS and Android projects and test league deep links, join/create, picks, history, Multi Chip, recovery, and admin isolation.
5. Add native features and store review materials; test release builds before submission.


## Route and identity audit (2026-10-24)

- The home page performs create/join operations through Next.js Server Actions. These are not available from a static bundle and should continue to execute on the hosted Next.js server.
- The pick endpoint validates the submitted entry ID against the current entry derived from the request's league/player cookies before saving. A mobile integration must preserve this identity check; it must not trust a client-supplied entry ID alone.
- Player recovery uses a Supabase RPC and then sets three HTTP-only cookies: `lms_entry_id`, `lms_competition_code`, and `lms_player_entries`. Native cookie persistence, app restarts, and opening a shared league link must be tested on real devices.
- The leaderboard endpoint is read-only and accepts a league code as a query parameter. The pick endpoint is a write operation and must only be exercised against a dedicated test league.
- The Supabase confirmation route exchanges a PKCE code using a cookie-based verifier and redirects to the production origin. Password-reset / admin-auth flows need explicit device testing; the current callback is not yet a native deep-link callback.
- `proxy.ts` currently passes requests through to the app and does not implement Supabase refresh logic despite its helper name/comment. Do not change this as part of mobile work without a separate investigation, because it is existing authentication behaviour.
- A checked-in GitHub Actions workflow now type-checks the Expo app, validates Expo configuration, and runs Deno checks for the mobile and fixture-sync Edge Functions.
- The existing Next.js app uses server actions and request cookies; therefore, a fully offline/static Capacitor app is not a viable first step.

## Implementation gate

The initial Expo client and isolated staging backend now exist. Before any release build, complete the staging secret setup, real fixture sync, mobile HTTP end-to-end tests, deep-link/session-recovery tests, and physical-device checks. All work remains additive on `mobile-app-foundation`; no production credentials, Render production settings, production schema, or live league data may be changed.


## Product decision: app launch and league migration

The owner is happy for players to create fresh leagues in the mobile app and, if needed, invite/re-invite players to join those leagues through the app. This gives us a safe adoption path without forcing existing website leagues or live seasons to migrate.

- Keep existing website leagues and live competitions working unchanged.
- Allow the mobile app to create new leagues using the existing server-side league creation logic.
- Make joining/rejoining straightforward via league code/share link and a clear in-app join flow.
- Do not automatically copy, reset, migrate, or alter existing league/player records.
- Treat any future migration of an existing league as an explicit, separately tested choice—not a requirement for the initial app release.
- Verify that shared links open the app when installed and still fall back to the website when the app is not installed.
- Test app-created leagues and all write actions in a dedicated test league before considering release.
