# Last Man Standing native app scaffold

This is the initial Expo/React Native app for iOS and Android.

## Run locally

1. Install a current Node.js LTS release.
2. From this directory run `npm install`.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the isolated staging origin.
4. Run `npm start` and open the project in Expo Go or a simulator.

## Current status

The first home screen is a visual scaffold only. Create/join buttons are intentionally not wired to the backend yet. Do not treat the app as playable until the staging schema, server-side create/join flow, identity/session handling, and pick API have been validated.

## Safety

- Use only the staging backend for development and testing.
- Never embed Supabase service-role keys, admin secrets, or football-data API tokens in the app.
- Keep game rules and result progression server-side.
- Do not change production deployment settings or production database.
- Test shared league links, player identity persistence, and app restart behaviour before release.
