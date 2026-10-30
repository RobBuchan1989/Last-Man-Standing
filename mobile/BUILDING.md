# Building the Last Man Standing mobile app

These steps create preview builds from the `mobile/native` app. Use your own Expo account; do not share account passwords or tokens in chat.

## Prerequisites

- An Expo account with access to create/link an EAS project.
- For an installable iOS device build, an Apple Developer account and access to the relevant App Store Connect/team settings.
- The isolated staging Supabase project only.

## Link the EAS project

From the repository root:

```sh
cd mobile/native
npx eas-cli login
npx eas-cli build:configure
```

Follow the prompts to create or link the Expo project. This adds the project ID to the Expo configuration; review and commit that generated configuration on `mobile-app-foundation`. Do not run production submissions.

## Configure the staging endpoint

The EAS `development` and `preview` profiles in `mobile/native/eas.json` explicitly set `EXPO_PUBLIC_SUPABASE_URL` to the isolated staging project. The CI safety check verifies this and rejects backend secret keys in build-profile environment variables.

This is a public endpoint URL, not a secret. Never add a service-role key, Supabase secret key, football-data.org token, or fixture-sync secret to Expo environment variables or the native app. The `production` profile deliberately has no backend URL configured; do not configure or run a production build without explicit approval.

## Build preview artifacts

```sh
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

The Android preview profile is configured to produce an APK for internal testing. The iOS preview profile targets a physical device rather than a simulator; EAS will require suitable Apple signing access.

## Before any release

- Install and test both builds on physical devices.
- Verify create/join, recovery-code restore, private current-round picks, normal picks, Multi Chip, round settlement, winner history and organiser-only reset against a dedicated staging league.
- Do not switch the app to production or submit a store release without explicit approval.
