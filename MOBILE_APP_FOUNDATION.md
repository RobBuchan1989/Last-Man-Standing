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

## Architecture decision

Do not convert the existing site to a static Next.js export: the current server actions, API routes, cookie-based sessions, and authentication routes depend on the Next.js server.

Do not point a release Capacitor build at a remote website using Capacitor's development `server.url` setting. That setting is intended for development/live reload and a thin WebView alone may not meet App Store review requirements.

The mobile implementation should use Capacitor for native iOS/Android capabilities while the existing Render-hosted Next.js server and Supabase remain authoritative. Before generating release projects, implement and test a mobile shell/navigation approach that supports the existing server-rendered routes, league query links, Supabase authentication and player recovery. Add native app value (for example, push notifications for pick deadlines/results, native share flows, and robust external-link handling) rather than shipping a bare website wrapper.

## Data and safety constraints

- Do not migrate, recreate, truncate, or reset production Supabase tables.
- Do not duplicate game progression logic in the mobile client.
- Do not expose Supabase service-role keys or the football-data API key in a mobile bundle.
- Keep automatic result sync and round progression on the existing backend.
- Develop on `mobile-app-foundation`, test against a non-production/test league where possible, and merge only after regression tests pass.

## Additional audit findings

- The repository has API routes for picks, leaderboard data, and player recovery. These can be called from a mobile shell, but the current pick route depends on the existing browser cookies and player-entry identity.
- The player recovery route sets long-lived, HTTP-only cookies. Native WebView cookie handling and shared-link behaviour must be tested before choosing the final shell.
- The current package does not include Capacitor packages.
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
- The repository has no `.github/workflows` directory on this branch, so there is no checked-in CI workflow currently available to run mobile or type-check validation.
- The existing Next.js app uses server actions and request cookies; therefore, a fully offline/static Capacitor app is not a viable first step.

## Implementation gate

Before adding Capacitor dependencies or native project files, the next work item is to establish a testable development/staging target and document the device-session approach. The first implementation should be additive and confined to this branch: a native shell plus universal/app links and an explicit cookie/session strategy. No production credentials, Render settings, Supabase schema, or live league data should be changed.
