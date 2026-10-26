/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

import { constantTimeEqual, convertMatch, scheduledStatuses, type FootballDataResponse } from "./fixture-utils.ts";

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return respond({ error: "Use POST to sync fixtures." }, 405);

  const syncSecret = Deno.env.get("LMS_FIXTURE_SYNC_SECRET");
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!syncSecret) return respond({ error: "Fixture sync is not configured: the server-side sync secret is missing." }, 503);
  if (!suppliedSecret || !constantTimeEqual(suppliedSecret, syncSecret)) {
    return respond({ error: "Not authorised to sync fixtures." }, 401);
  }

  const apiToken = Deno.env.get("FOOTBALL_DATA_API_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serverKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiToken || !supabaseUrl || !serverKey) {
    return respond({ error: "Fixture sync requires the football-data token and server-side Supabase credentials." }, 503);
  }

  try {
    const upstream = await fetch("https://api.football-data.org/v4/competitions/PL/matches", {
      headers: { "X-Auth-Token": apiToken, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      // Do not include upstream response bodies or request headers in logs or errors.
      console.error("football-data.org fixture request failed with status", upstream.status);
      return respond({ error: upstream.status === 429
        ? "The fixture provider rate limit was reached. Try again later."
        : "The fixture provider could not return Premier League fixtures." }, 502);
    }

    const payload = await upstream.json() as FootballDataResponse;
    const matches = Array.isArray(payload.matches) ? payload.matches : [];
    const fixtures = matches.map(convertMatch).filter((fixture): fixture is NonNullable<ReturnType<typeof convertMatch>> => fixture !== null);
    if (fixtures.length === 0) return respond({ error: "The fixture provider returned no usable Premier League matches." }, 502);

    const admin = createClient(supabaseUrl, serverKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (let offset = 0; offset < fixtures.length; offset += 100) {
      const batch = fixtures.slice(offset, offset + 100);
      const { error } = await admin.from("fixtures").upsert(batch, { onConflict: "id" });
      if (error) {
        console.error("Staging fixture upsert failed:", error.code);
        return respond({ error: "Could not save the latest fixtures to staging." }, 503);
      }
    }

    const now = Date.now();
    const nextMatchday = fixtures
      .filter((fixture) => fixture.kickoff && new Date(fixture.kickoff).getTime() > now && scheduledStatuses.has(fixture.status))
      .reduce<number | null>((minimum, fixture) => minimum === null ? fixture.round : Math.min(minimum, fixture.round), null);

    let leaguesAssigned = 0;
    if (nextMatchday !== null) {
      const { data: activeLeagues, error: activeAssignError } = await admin
        .from("competitions")
        .update({ fixture_matchday: nextMatchday })
        .is("fixture_matchday", null)
        .in("status", ["active", "open"])
        .select("id");
      if (activeAssignError) {
        console.error("Staging league fixture-matchday assignment failed:", activeAssignError.code);
        return respond({ error: "Fixtures synced, but active staging leagues could not be assigned a matchday." }, 503);
      }

      const { data: waitingLeagues, error: waitingAssignError } = await admin
        .from("competitions")
        .update({ fixture_matchday: nextMatchday, status: "active" })
        .is("fixture_matchday", null)
        .eq("status", "waiting_fixtures")
        .select("id");
      if (waitingAssignError) {
        console.error("Staging waiting-league recovery failed:", waitingAssignError.code);
        return respond({ error: "Fixtures synced, but waiting staging leagues could not be resumed." }, 503);
      }
      leaguesAssigned = (activeLeagues?.length ?? 0) + (waitingLeagues?.length ?? 0);
    }

    const { data: processing, error: processingError } = await admin.rpc("lms_process_ready_rounds");
    if (processingError) {
      console.error("Staging round processing failed:", processingError.code);
      return respond({ error: "Fixtures were synced, but automatic round processing could not run." }, 503);
    }

    return respond({
      ok: true,
      fixturesUpserted: fixtures.length,
      nextUpcomingMatchday: nextMatchday,
      leaguesAssigned,
      processing,
    });
  } catch (error) {
    console.error("Staging fixture sync failed:", error instanceof Error ? error.name : "unknown");
    return respond({ error: "Fixture sync failed temporarily. Please try again." }, 503);
  }
});
