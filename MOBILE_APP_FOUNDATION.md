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

## Next implementation tasks

1. Inspect all API routes, auth callbacks, environment variables, and Render start/build settings.
2. Decide and document the Capacitor integration pattern for this server-rendered Next.js app.
3. Add Capacitor packages and configuration only once the web asset/server strategy is settled.
4. Create iOS and Android projects and test league deep links, join/create, picks, history, Multi Chip, recovery, and admin isolation.
5. Add native features and store review materials; test release builds before submission.
