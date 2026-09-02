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

const PLAYER_ENTRIES_COOKIE =
  "lms_player_entries"

const DEFAULT_CODE = "LMS-PL"

/*
 * ------------------------------------------------------------
 * API CACHE
 * ------------------------------------------------------------
 */

let footballMatchesCache:
  | {
      matches: FootballDataMatch[]
      expiresAt: number
    }
  | null = null

const FOOTBALL_CACHE_MS = 30_000

const competitionCache =
  new Map<
    string,
    {
      competition: Competition
      expiresAt: number
    }
  >()

const COMPETITION_CACHE_MS = 10_000

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
 * FOOTBALL DATA API TYPES
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

/*
 * ------------------------------------------------------------
 * FOOTBALL DATA API
 * ------------------------------------------------------------
 */

async function getLivePremierLeagueMatches(): Promise<
  FootballDataMatch[]
> {
  const now = Date.now()

  if (
    footballMatchesCache &&
    footballMatchesCache.expiresAt > now
  ) {
    return footballMatchesCache.matches
  }

  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers:
          footballDataHeaders(),
        cache: "no-store",
      }
    )

    if (res.status === 429) {
      if (footballMatchesCache) {
        return footballMatchesCache.matches
      }

      throw new Error(
        `Football data API error 429: ${await res.text()}`
      )
    }

    if (!res.ok) {
      throw new Error(
        `Football data API error ${res.status}: ${await res.text()}`
      )
    }

    const data =
      (await res.json()) as FootballDataResponse

    const matches =
      data.matches || []

    footballMatchesCache = {
      matches,
      expiresAt:
        Date.now() +
        FOOTBALL_CACHE_MS,
    }

    return matches
  } catch (error) {
    if (footballMatchesCache) {
      return footballMatchesCache.matches
    }

    throw error
  }
}

/*
 * ------------------------------------------------------------
 * TEAM NAME NORMALISATION
 * ------------------------------------------------------------
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
    "Manchester City":
      "Manchester City",
    "Manchester United":
      "Manchester United",
    "Newcastle United":
      "Newcastle United",
    "Nottingham Forest":
      "Nottingham Forest",
    "West Ham United":
      "West Ham United",
    "Wolverhampton Wanderers":
      "Wolverhampton Wanderers",
    "Wolves":
      "Wolverhampton Wanderers",
    "Tottenham Hotspur":
      "Tottenham Hotspur",
    "Spurs":
      "Tottenham Hotspur",
  }

  return aliases[cleaned] || cleaned
}

/*
 * ------------------------------------------------------------
 * FIXTURE STATUS
 * ------------------------------------------------------------
 */

function fixtureStatus(
  status: string
) {
  return status
    .trim()
    .toUpperCase()
}

/*
 * ------------------------------------------------------------
 * CONVERT FOOTBALL DATA MATCH
 * ------------------------------------------------------------
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
      fixtureStatus(
        match.status
      ),
  }
}

/*
 * ------------------------------------------------------------
 * FIXTURE STATUS HELPERS
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
    "AWARDED",
  ].includes(
    fixtureStatus(status)
  )
}

function isSettledFixture(
  fixture: Fixture
) {
  return (
    isFinishedFixtureStatus(
      fixture.status
    ) &&
    fixture.home_score !== null &&
    fixture.away_score !== null
  )
}

function isOpenFixture(
  fixture: Fixture
) {
  const status =
    fixtureStatus(
      fixture.status
    )

  if (
    isLiveFixtureStatus(status)
  ) {
    return false
  }

  if (
    isFinishedFixtureStatus(status)
  ) {
    return false
  }

  return (
    new Date(
      fixture.kickoff
    ).getTime() > Date.now()
  )
}

/*
 * ------------------------------------------------------------
 * AUTOMATIC ROUND DETECTION
 * ------------------------------------------------------------
 */

function getAutomaticRoundFromMatches(
  matches: FootballDataMatch[],
  fallbackRound: number
): number {
  const fixtures = matches
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null
    )

  if (!fixtures.length) {
    return fallbackRound
  }

  /*
   * A competition advances based on completion of its
   * CURRENT round, not simply because there are no open
   * fixtures left.
   */
  const currentRoundFixtures =
    fixtures.filter(
      (fixture) =>
        fixture.round ===
        fallbackRound
    )

  /*
   * Do not guess if the API does not contain the current
   * round's fixtures.
   */
  if (!currentRoundFixtures.length) {
    return fallbackRound
  }

  /*
   * The round is complete only when every fixture has
   * finished and has a final score.
   */
  const roundComplete =
    currentRoundFixtures.every(
      isSettledFixture
    )

  if (!roundComplete) {
    return fallbackRound
  }

  /*
   * Find the earliest round after the completed round.
   */
  const nextRounds = fixtures
    .map(
      (fixture) =>
        fixture.round
    )
    .filter(
      (round) =>
        round > fallbackRound
    )

  if (!nextRounds.length) {
    return fallbackRound
  }

  return Math.min(
    ...nextRounds
  )
}

/*
 * ------------------------------------------------------------
 * ROUND DEADLINE
 * ------------------------------------------------------------
 */

function getRoundDeadline(
  fixtures: Fixture[]
): number | null {
  const kickoffTimes =
    fixtures
      .map(
        (fixture) =>
          new Date(
            fixture.kickoff
          ).getTime()
      )
      .filter(
        (time) =>
          Number.isFinite(time)
      )

  if (!kickoffTimes.length) {
    return null
  }

  return Math.min(
    ...kickoffTimes
  )
}

/*
 * ------------------------------------------------------------
 * MARK PLAYERS WITHOUT A PICK AS OUT
 * ------------------------------------------------------------
 */

async function eliminateMissedPicks(
  competition: Competition,
  matches: FootballDataMatch[]
) {
  const fixtures = matches
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null &&
        fixture.round ===
          competition.round
    )

  if (!fixtures.length) {
    return
  }

  const deadline =
    getRoundDeadline(
      fixtures
    )

  if (
    deadline === null ||
    Date.now() <
      deadline
  ) {
    return
  }

  /*
   * The first fixture of the round has kicked off.
   *
   * Anyone who was alive but did not submit a pick
   * for this round is automatically eliminated.
   */

  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        competition.id
      )}&alive=eq.true&select=id,alive`
    )

  if (!entries.length) {
    return
  }

  const entryIds =
    entries
      .map(
        (entry) =>
          `"${entry.id}"`
      )
      .join(",")

  const picks =
    await rest<Pick[]>(
      `picks?entry_id=in.(${encodeURIComponent(
        entryIds
      )})&round=eq.${encodeURIComponent(
        String(competition.round)
      )}&select=entry_id`
    )

  const pickedEntryIds =
    new Set(
      picks.map(
        (pick) =>
          pick.entry_id
      )
    )

  const missedEntries =
    entries.filter(
      (entry) =>
        !pickedEntryIds.has(
          entry.id
        )
    )

  for (
    const entry of missedEntries
  ) {
    await rest(
      `entries?id=eq.${encodeURIComponent(
        entry.id
      )}`,
      {
        method: "PATCH",
        headers: {
          Prefer:
            "return=minimal",
        },
        body:
          JSON.stringify({
            alive: false,
          }),
      }
    )

    console.log(
      `[LMS SYNC] ${competition.code}: ${entry.id} eliminated for missing Round ${competition.round} deadline.`
    )
  }
}

/*
 * ------------------------------------------------------------
 * SETTLE COMPLETED PICKS
 * ------------------------------------------------------------
 */

async function syncFinishedPicks(
  competition: Competition,
  matches: FootballDataMatch[]
) {
  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        competition.id
      )}&select=id,alive`
    )

  if (!entries.length) {
    return
  }

  const entryIds =
    entries
      .map(
        (entry) =>
          `"${entry.id}"`
      )
      .join(",")

  const picks =
    await rest<Pick[]>(
      `picks?entry_id=in.(${encodeURIComponent(
        entryIds
      )})&result=is.null&select=*`
    )

  if (!picks.length) {
    return
  }

  const fixturesById =
    new Map<string, Fixture>()

  for (const match of matches) {
    const fixture =
      convertMatch(match)

    if (fixture) {
      fixturesById.set(
        fixture.id,
        fixture
      )
    }
  }

  for (const pick of picks) {
    if (!pick.fixture_id) {
      continue
    }

    const fixture =
      fixturesById.get(
        String(pick.fixture_id)
      )

    if (
      !fixture ||
      !isSettledFixture(fixture)
    ) {
      continue
    }

    const homeScore =
      fixture.home_score as number

    const awayScore =
      fixture.away_score as number

    const selectedTeam =
      canonicalTeamName(
        pick.team
      )

    const homeTeam =
      canonicalTeamName(
        fixture.home_team
      )

    const awayTeam =
      canonicalTeamName(
        fixture.away_team
      )

    let result:
      | "win"
      | "draw"
      | "loss"

    if (
      homeScore ===
      awayScore
    ) {
      result = "draw"
    } else if (
      (
        selectedTeam ===
          homeTeam &&
        homeScore >
          awayScore
      ) ||
      (
        selectedTeam ===
          awayTeam &&
        awayScore >
          homeScore
      )
    ) {
      result = "win"
    } else {
      result = "loss"
    }

    await rest(
      `picks?id=eq.${encodeURIComponent(
        pick.id
      )}`,
      {
        method: "PATCH",
        headers: {
          Prefer:
            "return=minimal",
        },
        body:
          JSON.stringify({
            result,
          }),
      }
    )

    if (result !== "win") {
      await rest(
        `entries?id=eq.${encodeURIComponent(
          pick.entry_id
        )}`,
        {
          method: "PATCH",
          headers: {
            Prefer:
              "return=minimal",
          },
          body:
            JSON.stringify({
              alive: false,
            }),
        }
      )
    }
  }
}

/*
 * ------------------------------------------------------------
 * SYNCHRONISE COMPETITION
 * ------------------------------------------------------------
 */

async function syncCompetitionRound(
  competition: Competition
): Promise<Competition> {
  let matches: FootballDataMatch[]

  try {
    matches =
      await getLivePremierLeagueMatches()
  } catch {
    return competition
  }

  const fixtures = matches
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null
    )

  /*
   * Only inspect fixtures belonging to the competition's
   * current round.
   */
  const currentRoundFixtures =
    fixtures.filter(
      (fixture) =>
        fixture.round ===
        competition.round
    )

  /*
   * Never advance if the current round cannot be verified.
   */
  if (!currentRoundFixtures.length) {
    console.log(
      `[LMS SYNC] ${competition.code}: no fixtures found for Round ${competition.round}; holding current round.`
    )

    return competition
  }

  /*
   * A round is complete only when EVERY fixture in that
   * round has finished and has a final score.
   */
  const roundComplete =
    currentRoundFixtures.every(
      isSettledFixture
    )

  if (!roundComplete) {
    return competition
  }

  console.log(
    `[LMS SYNC] ${competition.code}: Round ${competition.round} is complete.`
  )

  /*
   * Find the next round that exists in the Football Data
   * response.
   */
  const nextRounds = fixtures
    .map(
      (fixture) =>
        fixture.round
    )
    .filter(
      (round) =>
        round > competition.round
    )

  /*
   * If a later round is not available yet, do not guess.
   */
  if (!nextRounds.length) {
    console.log(
      `[LMS SYNC] ${competition.code}: Round ${competition.round} complete, but no later round is available yet.`
    )

    return competition
  }

  const nextRound =
    Math.min(
      ...nextRounds
    )

  if (
    nextRound ===
    competition.round
  ) {
    return competition
  }

  console.log(
    `[LMS SYNC] ${competition.code}: advancing Round ${competition.round} → Round ${nextRound}.`
  )

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
          body:
            JSON.stringify({
              round:
                nextRound,
              status:
                "active",
            }),
        }
      )

    const updated =
      rows[0] ?? {
        ...competition,
        round:
          nextRound,
        status:
          "active",
      }

    competitionCache.set(
      competition.code,
      {
        competition:
          updated,
        expiresAt:
          Date.now() +
          COMPETITION_CACHE_MS,
      }
    )

    console.log(
      `[LMS SYNC] ${competition.code}: Round ${nextRound} is now active.`
    )

    return updated
  } catch (error) {
    console.error(
      `[LMS SYNC] ${competition.code}: failed to advance to Round ${nextRound}:`,
      error
    )

    return competition
  }
}

/*
 * ------------------------------------------------------------
 * BACKGROUND GAME SYNC
 * ------------------------------------------------------------
 */

export async function runBackgroundSync() {
  console.log(
    "[LMS SYNC] Fetching latest Premier League data..."
  )

  const matches =
    await getLivePremierLeagueMatches()

  console.log(
    `[LMS SYNC] Received ${matches.length} Premier League fixtures.`
  )

  const competitions =
    await rest<Competition[]>(
      "competitions?status=eq.active&select=*"
    )

  console.log(
    `[LMS SYNC] Found ${competitions.length} active competitions.`
  )

  let competitionsSynced =
    0

  let winnersDetected =
    0

  for (
    const competition of competitions
  ) {
    try {
      console.log(
        `[LMS SYNC] Processing ${competition.code}...`
      )

      /*
       * First settle completed picks.
       */

      await syncFinishedPicks(
        competition,
        matches
      )

      /*
       * Then enforce the round deadline.
       */

      await eliminateMissedPicks(
        competition,
        matches
      )

      /*
       * Then update the competition round.
       */

      const updatedCompetition =
        await syncCompetitionRound(
          competition
        )

      /*
       * Finally check whether only one
       * player remains alive.
       */

      const entries =
        await rest<Entry[]>(
          `entries?competition_id=eq.${encodeURIComponent(
            competition.id
          )}&select=id,name,alive`
        )

      const aliveEntries =
        entries.filter(
          (entry) =>
            entry.alive
        )

      if (
        aliveEntries.length === 1
      ) {
        const winner =
          aliveEntries[0]

        await rest(
          `competitions?id=eq.${encodeURIComponent(
            competition.id
          )}`,
          {
            method: "PATCH",
            headers: {
              Prefer:
                "return=minimal",
            },
            body:
              JSON.stringify({
                status:
                  "finished",
                owner_entry_id:
                  winner.id,
              }),
          }
        )

        competitionCache.set(
          competition.code,
          {
            competition: {
              ...updatedCompetition,
              status:
                "finished",
              owner_entry_id:
                winner.id,
            } as Competition,
            expiresAt:
              Date.now() +
              COMPETITION_CACHE_MS,
          }
        )

        winnersDetected += 1

        console.log(
          `[LMS SYNC] Winner detected in ${competition.code}: ${winner.name}`
        )
      } else if (
        aliveEntries.length === 0
      ) {
        console.log(
          `[LMS SYNC] ${competition.code}: no players remain alive.`
        )
      }

      competitionsSynced += 1

      console.log(
        `[LMS SYNC] ${competition.code} synced successfully.`
      )
    } catch (error) {
      console.error(
        `[LMS SYNC] Failed for ${competition.code}:`,
        error
      )
    }
  }

  const result = {
    competitionsFound:
      competitions.length,

    competitionsSynced,

    winnersDetected,
  }

  console.log(
    "[LMS SYNC] Complete:",
    result
  )

  return result
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
      "")
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

/*
 * ------------------------------------------------------------
 * MULTI-LEAGUE PLAYER MEMORY
 * ------------------------------------------------------------
 */

async function getStoredEntryIds(): Promise<string[]> {
  const jar = await cookies()

  const raw =
    jar.get(
      PLAYER_ENTRIES_COOKIE
    )?.value

  if (!raw) {
    return []
  }

  try {
    const parsed =
      JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (id): id is string =>
        typeof id ===
        "string"
    )
  } catch {
    return []
  }
}

async function rememberEntry(
  entryId: string
) {
  const existing =
    await getStoredEntryIds()

  const ids = [
    entryId,
    ...existing.filter(
      (id) =>
        id !== entryId
    ),
  ]

  const limited =
    ids.slice(0, 50)

  const jar = await cookies()

  jar.set(
    PLAYER_ENTRIES_COOKIE,
    JSON.stringify(
      limited
    ),
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

/*
 * ------------------------------------------------------------
 * CREATE LEAGUE CODE
 * ------------------------------------------------------------
 */

function newLeagueCode() {
  return crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()
}

/*
 * ------------------------------------------------------------
 * GET COMPETITION
 * ------------------------------------------------------------
 */

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

  const cached =
    competitionCache.get(
      code
    )

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.competition
  }

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

  const competition =
    rows[0]

  competitionCache.set(
    code,
    {
      competition,
      expiresAt:
        Date.now() +
        COMPETITION_CACHE_MS,
    }
  )

  return competition
}

/*
 * ------------------------------------------------------------
 * FAST COMPETITION LOOKUP
 * ------------------------------------------------------------
 */

async function getCompetitionById(
  competitionId: string
): Promise<Competition> {
  const rows =
    await rest<Competition[]>(
      `competitions?id=eq.${encodeURIComponent(
        competitionId
      )}&select=*&limit=1`
    )

  if (!rows[0]) {
    throw new Error(
      "That league could not be found."
    )
  }

  return rows[0]
}

async function getCompetitionByCodeFast(
  competitionCode?: string
): Promise<Competition> {
  const code =
    cleanCode(
      competitionCode
    )

  if (!code) {
    throw new Error(
      "That league could not be found."
    )
  }

  const cached =
    competitionCache.get(
      code
    )

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.competition
  }

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

  const competition =
    rows[0]

  competitionCache.set(
    code,
    {
      competition,
      expiresAt:
        Date.now() +
        COMPETITION_CACHE_MS,
    }
  )

  return competition
}

/*
 * ------------------------------------------------------------
 * CREATE COMPETITION
 * ------------------------------------------------------------
 */

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
                id:
                  crypto.randomUUID(),

                code,

                name,

                status:
                  "active",

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

      competitionCache.set(
        rows[0].code,
        {
          competition:
            rows[0],
          expiresAt:
            Date.now() +
            COMPETITION_CACHE_MS,
        }
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
 * GET PLAYER'S JOINED LEAGUES
 * ------------------------------------------------------------
 */

export type PlayerLeague = {
  competition: Competition
  entry: Entry
}

/* Player league lookup */

export async function getPlayerLeagues(): Promise<
  PlayerLeague[]
> {
  const entryIds =
    await getStoredEntryIds()

  const jar = await cookies()

  const currentEntryId =
    jar.get(
      ENTRY_COOKIE
    )?.value

  const allIds = [
    ...(currentEntryId
      ? [currentEntryId]
      : []),
    ...entryIds,
  ].filter(
    (id, index, array) =>
      array.indexOf(id) ===
      index
  )

  if (!allIds.length) {
    return []
  }

  const quotedIds =
    allIds
      .map(
        (id) =>
          `"${id}"`
      )
      .join(",")

  const entries =
    await rest<Entry[]>(
      `entries?id=in.(${encodeURIComponent(
        quotedIds
      )})&select=*`
    )

  if (!entries.length) {
    return []
  }

  const competitionIds =
    entries
      .map(
        (entry) =>
          entry.competition_id
      )
      .filter(
        (id, index, array) =>
          array.indexOf(id) ===
          index
      )

  if (!competitionIds.length) {
    return []
  }

  const quotedCompetitionIds =
    competitionIds
      .map(
        (id) =>
          `"${id}"`
      )
      .join(",")

  const competitions =
    await rest<Competition[]>(
      `competitions?id=in.(${encodeURIComponent(
        quotedCompetitionIds
      )})&select=*`
    )

  const competitionMap =
    new Map(
      competitions.map(
        (competition) => [
          competition.id,
          competition,
        ]
      )
    )

  return entries
    .map((entry) => {
      const competition =
        competitionMap.get(
          entry.competition_id
        )

      if (!competition) {
        return null
      }

      return {
        competition,
        entry,
      }
    })
    .filter(
      (
        item
      ): item is PlayerLeague =>
        item !== null
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
  if (
    ignoreExistingEntry
  ) {
    return null
  }

  const jar =
    await cookies()

  const currentEntryId =
    jar.get(
      ENTRY_COOKIE
    )?.value

  if (currentEntryId) {
    const rows =
      await rest<Entry[]>(
        `entries?id=eq.${encodeURIComponent(
          currentEntryId
        )}&select=*&limit=1`
      )

    if (rows[0]) {
      if (!competitionCode) {
        return rows[0]
      }

      const code =
        cleanCode(
          competitionCode
        )

      const competition =
        await getCompetitionByCodeFast(
          code
        )

      if (
        rows[0].competition_id ===
        competition.id
      ) {
        return rows[0]
      }
    }
  }

  const storedEntryIds =
    await getStoredEntryIds()

  if (!storedEntryIds.length) {
    return null
  }

  const code =
    cleanCode(
      competitionCode
    )

  if (!code) {
    return null
  }

  const competition =
    await getCompetitionByCodeFast(
      code
    )

  const quotedIds =
    storedEntryIds
      .map(
        (id) =>
          `"${id}"`
      )
      .join(",")

  const rememberedEntries =
    await rest<Entry[]>(
      `entries?id=in.(${encodeURIComponent(
        quotedIds
      )})&competition_id=eq.${encodeURIComponent(
        competition.id
      )}&select=*&order=created_at.asc`
    )

  if (!rememberedEntries.length) {
    return null
  }

  return rememberedEntries[0]
}

/*
 * ------------------------------------------------------------
 * JOIN COMPETITION
 * ------------------------------------------------------------
 */

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

    await rememberEntry(
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

              name:
                cleanName,

              alive:
                true,
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

    await rememberEntry(id)

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

        await rememberEntry(
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
    await getCompetitionByCodeFast(
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
        (entry) =>
          `"${entry.id}"`
      )
      .join(",")

  return rest<Pick[]>(
    `picks?round=eq.${encodeURIComponent(
      String(round)
    )}&entry_id=in.(${encodeURIComponent(
      entryIds
    )})&select=*`
  )
}

/*
 * ------------------------------------------------------------
 * ROUND HISTORY
 * ------------------------------------------------------------
 */

export type RoundHistoryPlayer = {
  entry: Entry
  pick: Pick | null
  status: "ALIVE" | "OUT"
}

export async function getRoundHistory(
  round: number,
  competitionCode?: string
): Promise<RoundHistoryPlayer[]> {
  const c =
    await getCompetitionByCodeFast(
      competitionCode
    )

  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        c.id
      )}&select=*&order=created_at.asc`
    )

  if (!entries.length) {
    return []
  }

  const entryIds =
    entries
      .map(
        (entry) =>
          `"${entry.id}"`
      )
      .join(",")

  const picks =
    await rest<Pick[]>(
      `picks?entry_id=in.(${encodeURIComponent(
        entryIds
      )})&select=*&order=round.asc`
    )

  return entries.map(
    (entry) => {
      const playerPicks =
        picks.filter(
          (pick) =>
            pick.entry_id ===
            entry.id
        )

      const eliminationPick =
        playerPicks
          .filter(
            (pick) =>
              pick.result !==
                "win" &&
              pick.result !==
                null
          )
          .sort(
            (a, b) =>
              a.round -
              b.round
          )[0]

      const eliminationRound =
        eliminationPick?.round ??
        null

      if (
        eliminationRound !==
          null &&
        eliminationRound <
          round
      ) {
        return {
          entry,
          pick: null,
          status: "OUT",
        }
      }

      const pick =
        playerPicks.find(
          (playerPick) =>
            playerPick.round ===
            round
        ) ?? null

      if (pick) {
        return {
          entry,
          pick,
          status:
            pick.result ===
            "win"
              ? "ALIVE"
              : "OUT",
        }
      }

      return {
        entry,
        pick: null,
        status:
          eliminationRound !==
            null
            ? "OUT"
            : "ALIVE",
      }
    }
  )
}

/*
 * ------------------------------------------------------------
 * FIXTURES
 * ------------------------------------------------------------
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
    await getCompetitionById(
      entry.competition_id
    )

  if (
    competitionCode &&
    cleanCode(
      competitionCode
    ) !==
      cleanCode(c.code)
  ) {
    throw new Error(
      "Your player session could not be verified."
    )
  }

  const fixtures =
    await getFixtures(
      c.round
    )

  if (!fixtures.length) {
    throw new Error(
      "There are no fixtures available for the current round."
    )
  }

  /*
   * ----------------------------------------------------------
   * HARD ROUND DEADLINE
   * ----------------------------------------------------------
   *
   * The first fixture of the round is the deadline
   * for EVERY player and EVERY team.
   *
   * This is intentionally checked on the server.
   * A player cannot bypass it by changing their device
   * clock or selecting a later fixture.
   */

  const deadline =
    getRoundDeadline(
      fixtures
    )

  if (
    deadline !== null &&
    Date.now() >=
      deadline
  ) {
    throw new Error(
      "The pick deadline has passed. Picks are locked for this round."
    )
  }

  const selectedTeam =
    canonicalTeamName(
      team.name
    )

  /*
   * One database read for all existing picks.
   */

  const existingPicks =
    await rest<Pick[]>(
      `picks?entry_id=eq.${encodeURIComponent(
        entry.id
      )}&select=id,round,team`
    )

  const previous =
    existingPicks.find(
      (pick) =>
        canonicalTeamName(
          pick.team
        ) === selectedTeam
    )

  if (previous) {
    throw new Error(
      "You have already used that team."
    )
  }

  const existing =
    existingPicks.find(
      (pick) =>
        pick.round ===
        c.round
    )

  if (existing) {
    throw new Error(
      "Your pick is already locked for this round."
    )
  }

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

  /*
   * Also check the individual fixture.
   *
   * This is an additional safety check in case a fixture
   * has an unusual status.
   */

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
   * SAVE PICK
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

        fixture_id:
          fixture.id,

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
    await getCompetitionByCodeFast(
      competitionCode
    )

  const entries =
    await rest<Entry[]>(
      `entries?competition_id=eq.${encodeURIComponent(
        c.id
      )}&select=*&order=created_at.asc`
    )

  const entryIds =
    entries.map(
      (entry) =>
        `"${entry.id}"`
    )

  let picks: Pick[] = []

  if (entryIds.length) {
    picks =
      await rest<Pick[]>(
        `picks?entry_id=in.(${encodeURIComponent(
          entryIds.join(",")
        )})&select=*`
      )
  }

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
