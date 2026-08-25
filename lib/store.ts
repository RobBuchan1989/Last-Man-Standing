import { cookies } from "next/headers"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgjpsaruueqxrtvecnph.supabase.co"

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_-guOZ0scebhQqlluOl8Tmw_QiOrK32c"

const FOOTBALL_DATA_API_TOKEN =
  process.env.FOOTBALL_DATA_API_TOKEN

const ENTRY_COOKIE = "lms_entry_id"
const COMPETITION_COOKIE = "lms_competition_code"
const DEFAULT_CODE = "LMS-PL"

function authHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  }
}

async function rest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init?.headers || {}),
      },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error(
      `Database error ${res.status}: ${await res.text()}`
    )
  }

  const text = await res.text()

  return (text
    ? JSON.parse(text)
    : null) as T
}

/*
 * ------------------------------------------------------------
 * TYPES
 * ------------------------------------------------------------
 */

export type Competition = {
  id: string
  code: string
  name: string
  status: string
  round: number
}

export type Entry = {
  id: string
  competition_id: string
  name: string
  alive: boolean
  created_at: string
}

export type Pick = {
  id: string
  entry_id: string
  round: number
  team: string
  result: string | null
  fixture_id: string | null
  locked_at: string | null
}

export type Fixture = {
  id: string
  round: number
  home_team: string
  away_team: string
  kickoff: string
  home_score: number | null
  away_score: number | null
  status: string
}

/*
 * ------------------------------------------------------------
 * FOOTBALL DATA API
 * ------------------------------------------------------------
 */

type FootballDataMatch = {
  id: number
  matchday: number | null
  utcDate: string
  status: string
  homeTeam: {
    name: string
    shortName?: string
  }
  awayTeam: {
    name: string
    shortName?: string
  }
  score?: {
    fullTime?: {
      home: number | null
      away: number | null
    }
  }
}

type FootballDataResponse = {
  matches: FootballDataMatch[]
}

function footballDataHeaders() {
  if (!FOOTBALL_DATA_API_TOKEN) {
    throw new Error(
      "FOOTBALL_DATA_API_TOKEN is not configured."
    )
  }

  return {
    "X-Auth-Token":
      FOOTBALL_DATA_API_TOKEN,
  }
}

async function getLivePremierLeagueMatches(): Promise<
  FootballDataMatch[]
> {
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/PL/matches?season=2026",
    {
      headers:
        footballDataHeaders(),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error(
      `Football data API error ${res.status}: ${await res.text()}`
    )
  }

  const data =
    (await res.json()) as FootballDataResponse

  return data.matches || []
}

/*
 * Football-data.org and our UI use slightly
 * different spellings for some club names.
 */

function canonicalTeamName(
  name: string
): string {
  const cleaned = name
    .replace(/\./g, "")
    .replace(/\bFC\b/gi, "")
    .replace(/\bAFC\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const aliases: Record<
    string,
    string
  > = {
    "Brighton Hove Albion":
      "Brighton & Hove Albion",

    "Brighton and Hove Albion":
      "Brighton & Hove Albion",

    "Manchester City FC":
      "Manchester City",

    "Manchester United FC":
      "Manchester United",

    "Liverpool FC":
      "Liverpool",

    "Chelsea FC":
      "Chelsea",

    "Arsenal FC":
      "Arsenal",

    "Everton FC":
      "Everton",

    "Tottenham Hotspur FC":
      "Tottenham Hotspur",

    "Newcastle United FC":
      "Newcastle United",

    "West Ham United FC":
      "West Ham United",

    "Aston Villa FC":
      "Aston Villa",

    "Crystal Palace FC":
      "Crystal Palace",

    "Fulham FC":
      "Fulham",

    "Brentford FC":
      "Brentford",

    "Bournemouth FC":
      "Bournemouth",

    "Leeds United FC":
      "Leeds United",

    "Nottingham Forest FC":
      "Nottingham Forest",

    "Wolverhampton Wanderers FC":
      "Wolverhampton Wanderers",

    "Burnley FC":
      "Burnley",

    "Sunderland AFC":
      "Sunderland",
  }

  return aliases[cleaned] ?? cleaned
}

function fixtureStatus(
  status: string
): string {
  return status
    .trim()
    .toUpperCase()
}

/*
 * Convert football-data.org matches into
 * the Fixture shape used throughout the app.
 */

function convertMatch(
  match: FootballDataMatch
): Fixture | null {
  if (!match.matchday) {
    return null
  }

  return {
    id: String(match.id),

    round: match.matchday,

    home_team:
      canonicalTeamName(
        match.homeTeam.name
      ),

    away_team:
      canonicalTeamName(
        match.awayTeam.name
      ),

    kickoff: match.utcDate,

    home_score:
      match.score?.fullTime?.home ??
      null,

    away_score:
      match.score?.fullTime?.away ??
      null,

    status:
      fixtureStatus(match.status),
  }
}

/*
 * ------------------------------------------------------------
 * AUTOMATIC ROUND DETECTION
 * ------------------------------------------------------------
 */

function isLiveFixtureStatus(
  status: string
) {
  return [
    "IN_PLAY",
    "LIVE",
    "PAUSED",
    "HALFTIME",
    "1H",
    "2H",
    "EXTRA_TIME",
  ].includes(
    fixtureStatus(status)
  )
}

function isFinishedFixtureStatus(
  status: string
) {
  return [
    "FINISHED",
    "FT",
    "COMPLETED",
    "CANCELLED",
    "ABANDONED",
  ].includes(
    fixtureStatus(status)
  )
}

async function getAutomaticRound(
  fallbackRound: number
): Promise<number> {
  const matches =
    await getLivePremierLeagueMatches()

  const fixtures = matches
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null
    )

  if (!fixtures.length) {
    return fallbackRound
  }

  const now = Date.now()

  /*
   * Find the first matchweek which contains:
   *
   * - an upcoming fixture, OR
   * - a live fixture.
   *
   * Finished matchweeks are skipped.
   */

  const activeRounds = fixtures
    .filter((fixture) => {
      if (
        isFinishedFixtureStatus(
          fixture.status
        )
      ) {
        return false
      }

      if (
        isLiveFixtureStatus(
          fixture.status
        )
      ) {
        return true
      }

      return (
        new Date(
          fixture.kickoff
        ).getTime() > now
      )
    })
    .map(
      (fixture) => fixture.round
    )

  if (!activeRounds.length) {
    return Math.max(
      ...fixtures.map(
        (fixture) => fixture.round
      )
    )
  }

  return Math.min(
    ...activeRounds
  )
}

async function syncCompetitionRound(
  competition: Competition
): Promise<Competition> {
  let automaticRound: number

  try {
    automaticRound =
      await getAutomaticRound(
        competition.round
      )
  } catch {
    /*
     * If the football API is temporarily
     * unavailable, keep the last known round.
     */
    return competition
  }

  if (
    automaticRound === competition.round
  ) {
    return competition
  }

  try {
    const rows =
      await rest<Competition[]>(
        `competitions?id=eq.${encodeURIComponent(
          competition.id
        )}&select=*`,
        {
          method: "PATCH",
          headers: {
            Prefer:
              "return=representation",
          },
          body: JSON.stringify({
            round: automaticRound,
          }),
        }
      )

    return rows[0] ?? {
      ...competition,
      round: automaticRound,
    }
  } catch {
    return {
      ...competition,
      round: automaticRound,
    }
  }
}

/*
 * ------------------------------------------------------------
 * COMPETITION
 * ------------------------------------------------------------
 */

function cleanCode(
  code?: string | null
) {
  return (code || "")
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9-]/g,
      ""
    )
}

async function setCompetitionCookie(
  code: string
) {
  const jar = await cookies()

  jar.set(
    COMPETITION_COOKIE,
    code,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      maxAge:
        60 * 60 * 24 * 365,
      path: "/",
    }
  )
}

async function setEntryCookie(
  id: string
) {
  const jar = await cookies()

  jar.set(
    ENTRY_COOKIE,
    id,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      maxAge:
        60 * 60 * 24 * 365,
      path: "/",
    }
  )
}

function newLeagueCode() {
  return crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()
}

export async function getCompetition(
  requestedCode?: string
): Promise<Competition> {
  const jar = await cookies()

  const cookieCode =
    jar.get(
      COMPETITION_COOKIE
    )?.value

  const code = cleanCode(
    requestedCode ||
      cookieCode ||
      DEFAULT_CODE
  )

  const rows =
    await rest<Competition[]>(
      `competitions?code=eq.${encodeURIComponent(
        code
      )}&select=*&limit=1`
    )

  if (!rows[0]) {
    throw new Error(
      "That league could not be found."
    )
  }

  return syncCompetitionRound(
    rows[0]
  )
}

export async function createCompetition(
  leagueName: string
): Promise<Competition> {
  const name =
    leagueName
      .trim()
      .slice(0, 60)

  if (!name) {
    throw new Error(
      "Please enter a league name."
    )
  }

  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const code =
      newLeagueCode()

    try {
      const rows =
        await rest<Competition[]>(
          "competitions?select=*",
          {
            method: "POST",
            headers: {
              Prefer:
                "return=representation",
            },
            body:
              JSON.stringify({
                id: crypto.randomUUID(),
                code,
                name,
                status: "active",
                round: 1,
              }),
          }
        )

      if (!rows[0]) {
        throw new Error(
          "The league was not created."
        )
      }

      await setCompetitionCookie(
        rows[0].code
      )

      return syncCompetitionRound(
        rows[0]
      )
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message.includes(
            "409"
          ) ||
          error.message.includes(
            "duplicate"
          ) ||
          error.message.includes(
            "unique"
          )
        )
      ) {
        continue
      }

      throw error
    }
  }

  throw new Error(
    "Could not create a unique league code. Please try again."
  )
}

/*
 * ------------------------------------------------------------
 * ENTRIES
 * ------------------------------------------------------------
 */

export async function getCurrentEntry(
  competitionCode?: string,
  ignoreExistingEntry = false
): Promise<Entry | null> {
  const c =
    await getCompetition(
      competitionCode
    )

  if (
    ignoreExistingEntry
  ) {
    return null
  }

  const jar =
    await cookies()

  const id =
    jar.get(
      ENTRY_COOKIE
    )?.value

  if (!id) {
    return null
  }

  const rows =
    await rest<Entry[]>(
      `entries?id=eq.${encodeURIComponent(
        id
      )}&competition_id=eq.${encodeURIComponent(
        c.id
      )}&select=*&limit=1`
    )

  return rows[0] ?? null
}

export async function joinCompetition(
  name: string,
  competitionCode?: string
): Promise<Entry> {
  const c =
    await getCompetition(
      competitionCode
    )

  const cleanName =
    name
      .trim()
      .slice(0, 40)

  if (!cleanName) {
    throw new Error(
      "Please enter your name."
    )
  }

  const existing =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        c.id
      )}&name=ilike.${encodeURIComponent(
        cleanName
      )}&select=*&order=created_at.asc&limit=1`
    )

  if (existing[0]) {
    await setCompetitionCookie(
      c.code
    )

    await setEntryCookie(
      existing[0].id
    )

    return existing[0]
  }

  const id =
    crypto.randomUUID()

  try {
    const rows =
      await rest<Entry[]>(
        "entries?select=*",
        {
          method: "POST",
          headers: {
            Prefer:
              "return=representation",
          },
          body:
            JSON.stringify({
              id,
              competition_id:
                c.id,
              name: cleanName,
              alive: true,
            }),
        }
      )

    if (!rows[0]) {
      throw new Error(
        "Your league entry could not be created."
      )
    }

    await setCompetitionCookie(
      c.code
    )

    await setEntryCookie(
      id
    )

    return rows[0]
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "entries_competition_id_name_key"
      )
    ) {
      const duplicate =
        await rest<Entry[]>(
          `entries?competition_id=eq.${encodeURIComponent(
            c.id
          )}&name=ilike.${encodeURIComponent(
            cleanName
          )}&select=*&order=created_at.asc&limit=1`
        )

      if (duplicate[0]) {
        await setCompetitionCookie(
          c.code
        )

        await setEntryCookie(
          duplicate[0].id
        )

        return duplicate[0]
      }
    }

    throw error
  }
}

/*
 * ------------------------------------------------------------
 * PICKS
 * ------------------------------------------------------------
 */

export async function getPicks(
  entryId: string
): Promise<Pick[]> {
  return rest<Pick[]>(
    `picks?entry_id=eq.${encodeURIComponent(
      entryId
    )}&select=*&order=round.asc`
  )
}

export async function getRoundPicks(
  round: number,
  competitionCode?: string
): Promise<Pick[]> {
  const c =
    await getCompetition(
      competitionCode
    )

  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        c.id
      )}&select=id`
    )

  if (!entries.length) {
    return []
  }

  const entryIds =
    entries
      .map(
        (entry) => entry.id
      )
      .join(",")

  return rest<Pick[]>(
    `picks?round=eq.${round}&entry_id=in.(${entryIds})&select=*`
  )
}

/*
 * ------------------------------------------------------------
 * FIXTURES
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Fixtures now come directly from
 * football-data.org.
 *
 * The old Supabase fixture table is
 * no longer used for the schedule.
 */

export async function getFixtures(
  round: number
): Promise<Fixture[]> {
  const matches =
    await getLivePremierLeagueMatches()

  return matches
    .filter(
      (match) =>
        match.matchday ===
        round
    )
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null
    )
    .sort(
      (a, b) =>
        new Date(
          a.kickoff
        ).getTime() -
        new Date(
          b.kickoff
        ).getTime()
    )
}

/*
 * ------------------------------------------------------------
 * MAKE PICK
 * ------------------------------------------------------------
 */

export async function makePick(
  entry: Entry,
  team: { name: string },
  competitionCode?: string
) {
  if (!entry.alive) {
    throw new Error(
      "You have been eliminated."
    )
  }

  const c =
    await getCompetition(
      competitionCode
    )

  if (
    c.status !== "active"
  ) {
    throw new Error(
      "The competition has finished."
    )
  }

  const previous =
    await rest<Pick[]>(
      `picks?entry_id=${encodeURIComponent(
        entry.id
      )}&team=eq.${encodeURIComponent(
        canonicalTeamName(
          team.name
        )
      )}&select=id&limit=1`
    )

  if (previous.length) {
    throw new Error(
      "You have already used that team."
    )
  }

  const existing =
    await rest<Pick[]>(
      `picks?entry_id=${encodeURIComponent(
        entry.id
      )}&round=eq.${c.round}&select=id&limit=1`
    )

  if (existing.length) {
    throw new Error(
      "Your pick is already locked for this round."
    )
  }

  const fixtures =
    await getFixtures(
      c.round
    )

  const selectedTeam =
    canonicalTeamName(
      team.name
    )

  const fixture =
    fixtures.find(
      (f) =>
        f.home_team ===
          selectedTeam ||
        f.away_team ===
          selectedTeam
    )

  if (!fixture) {
    throw new Error(
      "That team does not have a fixture in the current round."
    )
  }

  const status =
    fixtureStatus(
      fixture.status
    )

  if (
    new Date(
      fixture.kickoff
    ).getTime() <=
      Date.now() ||
    [
      "FINISHED",
      "IN_PLAY",
      "LIVE",
      "PAUSED",
      "HALFTIME",
      "1H",
      "2H",
      "EXTRA_TIME",
    ].includes(status)
  ) {
    throw new Error(
      "That fixture has already kicked off, so picks are locked."
    )
  }

  /*
   * We deliberately do not write the API's
   * numeric fixture ID into fixture_id here.
   *
   * Your existing Supabase fixture_id column
   * may be UUID-based. The team + round already
   * uniquely identifies the pick for our game.
   */

  await rest("picks", {
    method: "POST",
    headers: {
      Prefer:
        "return=minimal",
    },
    body:
      JSON.stringify({
        id:
          crypto.randomUUID(),

        entry_id:
          entry.id,

        round:
          c.round,

        team:
          selectedTeam,

        locked_at:
          new Date().toISOString(),

        result:
          null,
      }),
  })
}

/*
 * ------------------------------------------------------------
 * LEADERBOARD
 * ------------------------------------------------------------
 */

export async function getLeaderboard(
  competitionCode?: string
) {
  const c =
    await getCompetition(
      competitionCode
    )

  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        c.id
      )}&select=*&order=created_at.asc`
    )

  const picks =
    await rest<Pick[]>(
      "picks?select=*"
    )

  return entries.map(
    (e) => ({
      ...e,

      wins:
        picks.filter(
          (p) =>
            p.entry_id ===
              e.id &&
            p.result ===
              "win"
        ).length,

      picks:
        picks
          .filter(
            (p) =>
              p.entry_id ===
              e.id
          )
          .sort(
            (a, b) =>
              a.round -
              b.round
          ),
    })
  )
}
