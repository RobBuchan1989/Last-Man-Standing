/// <reference lib="deno.ns" />
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

type Action = "create" | "join";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanName(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const name = value.trim();
  if (
    name.length < 1 ||
    name.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) return "";
  return name;
}

function cleanCode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function withinRateLimit(
  admin: SupabaseClient<any>,
  request: Request,
  action: Action,
): Promise<boolean> {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("cf-connecting-ip")?.trim() || forwarded || "unknown";
  const requestKey = await sha256(ip);
  const { error: insertError } = await admin
    .from("mobile_api_rate_limits")
    .insert({ request_key: requestKey, operation: action });

  if (insertError) throw new Error("Rate limiting is temporarily unavailable.");

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("mobile_api_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("request_key", requestKey)
    .eq("operation", action)
    .gte("attempted_at", since);

  if (error) throw new Error("Rate limiting is temporarily unavailable.");
  return (count ?? 0) <= 30;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond({ error: "Use POST for mobile league actions." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serverKey =
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serverKey) {
    return respond({ error: "The mobile league service is not configured." }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Request body must be valid JSON." }, 400);
  }

  const action = body.action;

  // Dashboard requests authenticate with the unguessable per-entry session token.
  // Other players' current-round picks are never included in the response.
  if (action === "dashboard") {
    const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken : "";
    const requestedCode = cleanCode(body.leagueCode);
    if (!sessionToken || sessionToken.length > 100 || requestedCode.length < 4) {
      return respond({ error: "A valid player session and league code are required." }, 400);
    }

    const admin = createClient(supabaseUrl, serverKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      const { data: player, error: playerError } = await admin
        .from("entries")
        .select("id, competition_id, name, alive, multi_chip_used")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (playerError || !player) {
        return respond({ error: "This player session could not be verified. Please rejoin the league." }, 401);
      }

      const { data: competition, error: competitionError } = await admin
        .from("competitions")
        .select("id, code, name, status, round, season_number, fixture_matchday")
        .eq("id", player.competition_id)
        .eq("code", requestedCode)
        .maybeSingle();

      if (competitionError || !competition) {
        return respond({ error: "This session does not match that league." }, 403);
      }

      const { data: entries, error: entriesError } = await admin
        .from("entries")
        .select("id, name, alive, multi_chip_used, created_at")
        .eq("competition_id", competition.id)
        .order("created_at", { ascending: true });

      if (entriesError) {
        return respond({ error: "Could not load league players." }, 503);
      }

      const { data: history, error: historyError } = await admin
        .from("picks")
        .select("entry_id, round, team, result, is_multi")
        .in("entry_id", (entries ?? []).map((entry) => entry.id))
        .lt("round", competition.round)
        .order("round", { ascending: true });

      if (historyError) {
        return respond({ error: "Could not load previous-round picks." }, 503);
      }

      const { data: ownCurrentPick, error: ownPickError } = await admin
        .from("picks")
        .select("round, team, result, is_multi")
        .eq("entry_id", player.id)
        .eq("round", competition.round)
        .maybeSingle();

      if (ownPickError) {
        return respond({ error: "Could not load your current-round pick." }, 503);
      }

      return respond({
        ok: true,
        action,
        competition: {
          id: competition.id,
          code: competition.code,
          name: competition.name,
          status: competition.status,
          round: competition.round,
          seasonNumber: competition.season_number,
          fixtureMatchday: competition.fixture_matchday,
        },
        player: {
          id: player.id,
          name: player.name,
          alive: player.alive,
          multiChipUsed: player.multi_chip_used,
        },
        entries: entries ?? [],
        historicalPicks: history ?? [],
        ownCurrentPick: ownCurrentPick ?? null,
      });
    } catch (error) {
      console.error("Mobile dashboard error:", error instanceof Error ? error.message : "unknown");
      return respond({ error: "The league dashboard is temporarily unavailable." }, 503);
    }
  }

  if (action !== "create" && action !== "join") {
    return respond({ error: "Action must be create or join." }, 400);
  }

  const playerName = cleanName(body.playerName, 40);
  if (!playerName) {
    return respond({ error: "Enter a player name of 1–40 characters." }, 400);
  }

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (!(await withinRateLimit(admin, request, action))) {
      return respond({ error: "Too many attempts. Please wait a few minutes and try again." }, 429);
    }

    if (action === "create") {
      const leagueName = cleanName(body.leagueName, 60);
      if (!leagueName) {
        return respond({ error: "Enter a league name of 1–60 characters." }, 400);
      }

      let competition: {
        id: string;
        code: string;
        name: string;
        status: string;
        round: number;
        season_number: number;
        season_started_at: string | null;
      } | null = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        const { data, error } = await admin
          .from("competitions")
          .insert({
            code,
            name: leagueName,
            status: "active",
            round: 1,
            season_number: 1,
            season_started_at: new Date().toISOString(),
          })
          .select("id, code, name, status, round, season_number, season_started_at")
          .single();

        if (isUniqueViolation(error)) continue;
        if (error) {
          console.error("Mobile league create failed:", error.code);
          return respond({ error: "Could not create the league. Please try again." }, 500);
        }
        competition = data;
        break;
      }

      if (!competition) {
        return respond({ error: "Could not allocate a unique league code. Please try again." }, 503);
      }

      const entryId = crypto.randomUUID();
      const sessionToken = crypto.randomUUID();
      const { data: entry, error: entryError } = await admin
        .from("entries")
        .insert({
          id: entryId,
          competition_id: competition.id,
          name: playerName,
          alive: true,
          session_token: sessionToken,
        })
        .select("id, name, alive, created_at")
        .single();

      if (entryError) {
        await admin.from("competitions").delete().eq("id", competition.id);
        if (isUniqueViolation(entryError)) {
          return respond({ error: "That player name is already taken in this league." }, 409);
        }
        console.error("Mobile league owner entry failed:", entryError.code);
        return respond({ error: "The league was created but the player entry could not be added." }, 500);
      }

      const { error: ownerError } = await admin
        .from("competitions")
        .update({ owner_entry_id: entry.id })
        .eq("id", competition.id);

      if (ownerError) {
        await admin.from("entries").delete().eq("id", entry.id);
        await admin.from("competitions").delete().eq("id", competition.id);
        console.error("Mobile league owner assignment failed:", ownerError.code);
        return respond({ error: "Could not finish setting up the league. Please try again." }, 500);
      }

      return respond({
        ok: true,
        action,
        competition: {
          id: competition.id,
          code: competition.code,
          name: competition.name,
          status: competition.status,
          round: competition.round,
          seasonNumber: competition.season_number,
        },
        entry: { id: entry.id, name: entry.name, alive: entry.alive },
        sessionToken,
      }, 201);
    }

    const code = cleanCode(body.leagueCode);
    if (code.length < 4) {
      return respond({ error: "Enter a valid league code." }, 400);
    }

    const { data: competition, error: competitionError } = await admin
      .from("competitions")
      .select("id, code, name, status, round, season_number")
      .eq("code", code)
      .maybeSingle();

    if (competitionError) {
      console.error("Mobile league lookup failed:", competitionError.code);
      return respond({ error: "Could not look up that league. Please try again." }, 500);
    }
    if (!competition) {
      return respond({ error: "That league code was not found." }, 404);
    }
    if (competition.status === "finished") {
      return respond({ error: "That league has finished and is not accepting new players." }, 409);
    }

    const { data: existingEntries, error: entriesError } = await admin
      .from("entries")
      .select("id, name")
      .eq("competition_id", competition.id);

    if (entriesError) {
      console.error("Mobile duplicate-name check failed:", entriesError.code);
      return respond({ error: "Could not check player names. Please try again." }, 500);
    }

    const duplicate = (existingEntries ?? []).some(
      (entry) => entry.name.trim().toLocaleLowerCase("en-GB") === playerName.toLocaleLowerCase("en-GB"),
    );
    if (duplicate) {
      return respond({ error: "That player name is already taken in this league." }, 409);
    }

    const sessionToken = crypto.randomUUID();
    const { data: entry, error: entryError } = await admin
      .from("entries")
      .insert({
        competition_id: competition.id,
        name: playerName,
        alive: true,
        session_token: sessionToken,
      })
      .select("id, name, alive, created_at")
      .single();

    if (entryError) {
      if (isUniqueViolation(entryError)) {
        return respond({ error: "That player name is already taken in this league." }, 409);
      }
      console.error("Mobile league join failed:", entryError.code);
      return respond({ error: "Could not join the league. Please try again." }, 500);
    }

    return respond({
      ok: true,
      action,
      competition: {
        id: competition.id,
        code: competition.code,
        name: competition.name,
        status: competition.status,
        round: competition.round,
        seasonNumber: competition.season_number,
      },
      entry: { id: entry.id, name: entry.name, alive: entry.alive },
      sessionToken,
    }, 201);
  } catch (error) {
    console.error("Mobile league API error:", error instanceof Error ? error.message : "unknown");
    return respond({ error: "The mobile league service is temporarily unavailable." }, 503);
  }
});
