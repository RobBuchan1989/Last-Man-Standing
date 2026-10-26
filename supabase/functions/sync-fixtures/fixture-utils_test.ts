import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalTeamName, constantTimeEqual, convertMatch, scheduledStatuses, type FootballDataMatch } from "./fixture-utils.ts";

const validMatch: FootballDataMatch = {
  id: 123,
  matchday: 8,
  utcDate: "2026-10-31T15:00:00Z",
  status: "timed",
  homeTeam: { name: "Wolves" },
  awayTeam: { name: "Brighton and Hove Albion" },
  score: { fullTime: { home: null, away: null } },
};

Deno.test("sync secret comparison accepts equal values and rejects differences", () => {
  assertEquals(constantTimeEqual("secret-token", "secret-token"), true);
  assertEquals(constantTimeEqual("secret-token", "secret-t0ken"), false);
  assertEquals(constantTimeEqual("short", "longer"), false);
  assertEquals(constantTimeEqual("", ""), true);
});

Deno.test("canonicalises known Premier League team aliases", () => {
  assertEquals(canonicalTeamName("Wolves"), "Wolverhampton Wanderers");
  assertEquals(canonicalTeamName("Spurs"), "Tottenham Hotspur");
  assertEquals(canonicalTeamName("Brighton and Hove Albion"), "Brighton & Hove Albion");
  assertEquals(canonicalTeamName("Manchester City FC"), "Manchester City");
});

Deno.test("converts fixture fields consistently and preserves zero scores", () => {
  const converted = convertMatch({
    ...validMatch,
    status: " finished ",
    score: { fullTime: { home: 0, away: 2 } },
  }, "2026-10-26T10:00:00.000Z");

  assertEquals(converted, {
    id: "123",
    round: 8,
    home_team: "Wolverhampton Wanderers",
    away_team: "Brighton & Hove Albion",
    kickoff: "2026-10-31T15:00:00.000Z",
    home_score: 0,
    away_score: 2,
    status: "FINISHED",
    updated_at: "2026-10-26T10:00:00.000Z",
  });
});

Deno.test("rejects incomplete or invalid fixture records", () => {
  assertEquals(convertMatch({ ...validMatch, matchday: null }), null);
  assertEquals(convertMatch({ ...validMatch, utcDate: "not-a-date" }), null);
  assertEquals(convertMatch({ ...validMatch, homeTeam: undefined }), null);
  assertEquals(convertMatch({ ...validMatch, status: " " }), null);
  assertNotEquals(convertMatch(validMatch), null);
});

Deno.test("scheduled statuses match football-data's pre-kickoff values", () => {
  assertEquals(scheduledStatuses.has("TIMED"), true);
  assertEquals(scheduledStatuses.has("SCHEDULED"), true);
  assertEquals(scheduledStatuses.has("NS"), true);
  assertEquals(scheduledStatuses.has("FINISHED"), false);
});
