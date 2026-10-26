# Staging fixture sync setup

This guide applies only to the isolated staging Supabase project:

- Project: `last-man-standing-staging`
- Project ID: `tdtwbuoakjsbkjaljmla`
- Function: `sync-fixtures`

Do not apply these steps to production or copy production credentials into staging.

## Required secrets

1. In the staging project's **Edge Functions → Secrets**, set:
   - `FOOTBALL_DATA_API_TOKEN`: the API token issued by football-data.org.
   - `LMS_FIXTURE_SYNC_SECRET`: a long, randomly generated secret used only to authorise fixture-sync requests.
2. In the staging project's **Vault**, create a secret named exactly `lms_fixture_sync_secret` using the same value as `LMS_FIXTURE_SYNC_SECRET`. The scheduled database job reads this Vault entry and sends it as the bearer token to the Edge Function.
3. Keep both values out of GitHub, app configuration, client-side environment variables, and chat messages.

The project must retain its server-side Supabase credentials for Edge Functions. Do not add a service-role or secret key to the mobile app.

## Scheduled sync

The staging cron job is configured to run at minute 17 of every hour (UTC). It intentionally skips the HTTP call if the Vault entry is missing. A successful cron status alone therefore does not prove that fixtures were fetched.

## Acceptance checks

After the secrets are set:

1. Invoke `POST /functions/v1/sync-fixtures` against the staging project with `Authorization: Bearer <LMS_FIXTURE_SYNC_SECRET>` and a JSON body of `{}`.
2. Expect an `ok: true` response containing `fixturesUpserted` greater than zero and a `nextUpcomingMatchday` when upcoming fixtures exist.
3. Verify staging `public.fixtures` contains fixture rows and that scores/statuses match the provider.
4. Check that the response's `processing` result completed without errors.
5. Confirm a subsequent scheduled run records an HTTP response and that fixtures continue to refresh.
6. Test with no or incorrect bearer token; it must be rejected without changing fixture data.

The fixture-sync endpoint is not considered operational until these checks pass. All tests must remain in staging.
