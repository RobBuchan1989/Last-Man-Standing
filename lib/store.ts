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

  const activeRounds = fixtures
    .filter(isOpenFixture)
    .map(
      (fixture) =>
        fixture.round
    )

  if (!activeRounds.length) {
    return fallbackRound
  }

  return Math.min(
    ...activeRounds
  )
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

  const automaticRound =
    getAutomaticRoundFromMatches(
      matches,
      competition.round
    )

  const fixtures = matches
    .map(convertMatch)
    .filter(
      (fixture): fixture is Fixture =>
        fixture !== null
    )

  const hasOpenFixtures =
    fixtures.some(
      isOpenFixture
    )

  const nextStatus =
    hasOpenFixtures
      ? "active"
      : competition.status

  const needsUpdate =
    automaticRound !==
      competition.round ||
    competition.status !==
      nextStatus

  if (!needsUpdate) {
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
          body:
            JSON.stringify({
              round:
                automaticRound,
              status:
                nextStatus,
            }),
        }
      )

    return rows[0] ?? {
      ...competition,
      round:
        automaticRound,
      status:
        nextStatus,
    }
  } catch {
    return {
      ...competition,
      round:
        automaticRound,
      status:
        nextStatus,
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

  try {
    const matches =
      await getLivePremierLeagueMatches()

    await syncFinishedPicks(
      competition,
      matches
    )

    return syncCompetitionRound(
      competition
    )
  } catch {
    return competition
  }
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

  return rows[0]
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

      const competitionRows =
        await rest<Competition[]>(
          `competitions?code=eq.${encodeURIComponent(
            code
          )}&select=id&limit=1`
        )

      if (
        competitionRows[0] &&
        rows[0].competition_id ===
          competitionRows[0].id
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

  const competitionRows =
    await rest<Competition[]>(
      `competitions?code=eq.${encodeURIComponent(
        code
      )}&select=id&limit=1`
    )

  if (!competitionRows[0]) {
    return null
  }

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
        competitionRows[0].id
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
  /*
   * PERFORMANCE:
   *
   * Use a lightweight competition lookup.
   * Do NOT run Football Data synchronisation here.
   */

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
  /*
   * PERFORMANCE:
   *
   * Use a lightweight competition lookup.
   */

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

  /*
   * IMPORTANT:
   *
   * Lightweight competition lookup only.
   * No full Football Data synchronisation.
   */

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
  /*
   * PERFORMANCE:
   *
   * Use a lightweight competition lookup.
   * The league page has already loaded the competition and
   * synchronised the football data once.
   */

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
