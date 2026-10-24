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
- Session-authenticated league dashboard API and native dashboard view.
- Dashboard shows league round, player status, Multi Chip status, player list, historical picks, and the player's own current pick only.
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


## Installable test builds

EAS build profiles are defined in `eas.json`:

- `preview`: Android APK for direct device testing and an iOS internal build route.
- `production`: store-oriented build profile, not to be used until the staging acceptance checks pass.

To build after signing into an Expo account on a developer machine:

```sh
npm install
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

An iPhone install outside the simulator requires an Apple signing/distribution route. TestFlight distribution requires Apple Developer account access and App Store Connect setup. No Apple credentials or paid account are stored in this repository. Never put private signing credentials in Git.
