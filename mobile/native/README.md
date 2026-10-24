# Last Man Standing native app

Expo / React Native foundation for iOS and Android.

## Run locally

1. Use a current Node.js LTS release.
2. From this directory run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the isolated staging project's URL and publishable key only.
5. Run `npm run typecheck`, then `npm start` and open the project in Expo Go or a simulator.

## Implemented in this stage

- Native home screen with create-league and join-by-code forms.
- Create/join calls to the staging-only `mobile-league` Edge Function.
- Player session token saved using Expo SecureStore, not plain AsyncStorage.
- Duplicate player names rejected within a league.
- Rate limiting for create/join requests.
- No direct public table access; game data remains behind server-side functions.

## Not yet playable end-to-end

The create/join flow is connected, but league dashboard reads, team selection, Multi Chip, historical picks, admin controls, result processing, and share-link deep linking still need their API flows and tests. Do not use this as a production app yet.

## Safety

- Only use the staging Supabase project while developing.
- Never embed Supabase secret/service-role keys, admin secrets, or football-data API tokens in the app.
- Keep game rules and result progression server-side.
- Production Supabase, the live website, and existing leagues must remain untouched.
