export type FootballDataMatch = {
  id: number;
  matchday: number | null;
  utcDate: string;
  status: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: { fullTime?: { home: number | null; away: number | null } | null } | null;
};

export type FootballDataResponse = { matches?: FootballDataMatch[] };

export type FootballDataFixture = {
  id: string;
  round: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  updated_at: string;
};

export const scheduledStatuses = new Set(["TIMED", "SCHEDULED", "NS"]);

export function constantTimeEqual(left: string, right: string): boolean {
  // An empty bearer token must never authenticate, even if the configured value is empty.
  if (!left || !right) return false;
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export function canonicalTeamName(name: string): string {
  const cleaned = name.replace(/\\./g, "").replace(/\\bFC\\b/gi, "").replace(/\\bAFC\\b/gi, "").replace(/\\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    "brighton and hove albion": "Brighton & Hove Albion",
    "brighton hove albion": "Brighton & Hove Albion",
    "wolves": "Wolverhampton Wanderers",
    "wolverhampton wanderers": "Wolverhampton Wanderers",
    "spurs": "Tottenham Hotspur",
    "tottenham hotspur": "Tottenham Hotspur",
  };
  return aliases[cleaned.toLowerCase()] || cleaned;
}

export function convertMatch(match: FootballDataMatch, updatedAt = new Date().toISOString()): FootballDataFixture | null {
  if (!Number.isSafeInteger(match.id) || match.id <= 0) return null;
  if (!Number.isSafeInteger(match.matchday) || match.matchday === null || match.matchday <= 0) return null;

  const homeName = match.homeTeam?.name?.trim() ?? "";
  const awayName = match.awayTeam?.name?.trim() ?? "";
  if (!homeName || !awayName) return null;

  const homeTeam = canonicalTeamName(homeName);
  const awayTeam = canonicalTeamName(awayName);
  if (!homeTeam || !awayTeam || homeTeam === awayTeam) return null;

  const kickoff = new Date(match.utcDate);
  if (!Number.isFinite(kickoff.getTime())) return null;
  const status = typeof match.status === "string" ? match.status.trim().toUpperCase() : "";
  if (!status) return null;

  const homeScore = match.score?.fullTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? null;
  const isValidScore = (score: number | null) => score === null || (Number.isSafeInteger(score) && score >= 0);
  if (!isValidScore(homeScore) || !isValidScore(awayScore)) return null;

  return {
    id: String(match.id),
    round: match.matchday,
    home_team: homeTeam,
    away_team: awayTeam,
    kickoff: kickoff.toISOString(),
    home_score: homeScore,
    away_score: awayScore,
    status,
    updated_at: updatedAt,
  };
}
