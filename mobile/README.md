# Last Man Standing mobile app

This branch contains an Expo/React Native app foundation for iOS and Android, connected to a separate staging Supabase project. The existing Next.js website and live leagues remain the production source of truth and must not be changed by mobile testing.

## Current implementation

- Native Expo app with create/join forms, saved league sessions in Expo SecureStore, a league dashboard, historical picks, fixture selection and pick submission UI.
- Staging Edge Function `mobile-league` deployed to project `tdtwbuoakjsbkjaljmla` (current deployed version 8).
- Staging-only `lms_mobile_submit_pick` SQL function validates a normal pick or Multi Chip selection and writes the rows atomically.
- Staging fixture-sync Edge Function source is in `supabase/functions/sync-fixtures/index.ts`. It upserts Premier League fixtures from football-data.org and assigns a next matchday to existing leagues that do not have one. It is not deployed until the required staging secrets are configured.
- `mobile/TEST_PLAN.md` records verified checks and outstanding acceptance tests.

## Required staging-only secrets for fixture sync

Add these through the Supabase dashboard for project `tdtwbuoakjsbkjaljmla` under **Edge Functions → Secrets** (or the project Edge Function secrets page):

- `FOOTBALL_DATA_API_TOKEN`: the football-data.org API token.
- `LMS_FIXTURE_SYNC_SECRET`: a newly generated, high-entropy secret used to authorise the sync endpoint.

Never commit either value, place them in `.env.example`, or bundle them into the native app. Do not reuse or copy a production-only token without explicit approval. The sync function expects a POST request with `Authorization: Bearer <LMS_FIXTURE_SYNC_SECRET>`; do not send that secret in a browser URL. Once the two secrets are present, the function can be deployed to staging and its authenticated sync can be tested.

The native app only needs the public staging Supabase URL and publishable key in `mobile/native/.env`. The committed `.env.example` contains those public client settings, not server secrets.

## Safe implementation sequence

1. Keep all changes on `mobile-app-foundation` and all runtime tests on isolated staging.
2. Validate create/join/dashboard HTTP flows and secure session restoration.
3. Configure and deploy protected fixture sync; verify real Premier League team names, kickoff times, scores and statuses.
4. Implement/test automatic result settlement, Multi Chip aggregation, missed-pick elimination, progression, winner history and reset.
5. Complete invite links, sharing, admin access and accessibility/error-state review.
6. Build and test Android and iOS packages after the core game flow passes end to end.
7. Never merge or change production configuration without explicit approval.

## Important architecture constraints

- Do not point a production Capacitor/native build at the live website as a remote WebView wrapper.
- Do not expose Supabase service-role/secret keys or the football-data token to the app or public database access.
- Keep current-round picks hidden from other players; expose only through reviewed server-side responses.
- Do not test against production or touch existing live leagues.
