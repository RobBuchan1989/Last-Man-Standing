import { cookies } from "next/headers"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgjpsaruueqxrtvecnph.supabase.co"

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_-guOZ0scebhQqlluOl8Tmw_QiOrK32c"

const COOKIE = "lms_entry_id"
const CODE = "LMS-PL"

function authHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  }
}

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(
      `Database error ${res.status}: ${await res.text()}`
    )
  }

  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

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

export async function getCompetition(): Promise<Competition> {
  const rows = await rest<Competition[]>(
    `competitions?code=eq.${encodeURIComponent(
      CODE
    )}&select=*&limit=1`
  )

  if (!rows[0]) {
    throw new Error("Competition has not been created")
  }

  return rows[0]
}

export async function getCurrentEntry(): Promise<Entry | null> {
  const c = await getCompetition()

  const jar = await cookies()
  const id = jar.get(COOKIE)?.value

  if (!id) return null

  const rows = await rest<Entry[]>(
    `entries?id=eq.${encodeURIComponent(
      id
    )}&competition_id=eq.${encodeURIComponent(
      c.id
    )}&select=*&limit=1`
  )

  return rows[0] ?? null
}

export async function joinCompetition(
  name: string
): Promise<Entry> {
  const c = await getCompetition()

  const cleanName = name.trim()

  if (!cleanName) {
    throw new Error("Please enter your name.")
  }

  /*
   * First check whether this manager already exists
   * in the current competition.
   *
   * This prevents the database 409 duplicate-name error
   * when a returning player enters their name again.
   */
  const existing = await rest<Entry[]>(
    `entries?competition_id=eq.${encodeURIComponent(
      c.id
    )}&name=eq.${encodeURIComponent(
      cleanName
    )}&select=*&limit=1`
  )

  if (existing[0]) {
    const entry = existing[0]

    const jar = await cookies()

    jar.set(COOKIE, entry.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    })

    return entry
  }

  /*
   * No existing manager found, so create a new entry.
   */
  const id = crypto.randomUUID()

  try {
    const rows = await rest<Entry[]>(
      `entries?select=*`,
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id,
          competition_id: c.id,
          name: cleanName,
          alive: true,
        }),
      }
    )

    const jar = await cookies()

    jar.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    })

    return rows[0]
  } catch (error) {
    /*
     * Safety net for two join requests happening at almost
     * exactly the same time.
     *
     * If Supabase returns the duplicate-name constraint error,
     * find the entry that already exists and use it.
     */
    if (
      error instanceof Error &&
      error.message.includes(
        "entries_competition_id_name_key"
      )
    ) {
      const duplicate = await rest<Entry[]>(
        `entries?competition_id=eq.${encodeURIComponent(
          c.id
        )}&name=eq.${encodeURIComponent(
          cleanName
        )}&select=*&limit=1`
      )

      if (duplicate[0]) {
        const jar = await cookies()

        jar.set(COOKIE, duplicate[0].id, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 365,
        })

        return duplicate[0]
      }
    }

    throw error
  }
}

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
  round: number
): Promise<Pick[]> {
  const c = await getCompetition()

  return rest<Pick[]>(
    `picks?round=eq.${round}&select=*`
  )
}

/*
 * football-data.org uses slightly different team names
 * from the names displayed in our app.
 *
 * Examples:
 * Arsenal FC -> Arsenal
 * Manchester United FC -> Manchester United
 * AFC Bournemouth -> Bournemouth
 * Brighton & Hove Albion FC -> Brighton & Hove Albion
 */

function canonicalTeamName(name: string): string {
  const cleaned = name
    .replace(/\./g, "")
    .replace(/\bFC\b/gi, "")
    .replace(/\bAFC\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const aliases: Record<string, string> = {
    "Brighton and Hove Albion":
      "Brighton & Hove Albion",
  }

  return aliases[cleaned] ?? cleaned
}

export async function getFixtures(
  round: number
): Promise<Fixture[]> {
  const rows = await rest<Fixture[]>(
    `fixtures?round=eq.${round}&select=*&order=kickoff.asc`
  )

  return rows.map((f) => ({
    ...f,
    home_team: canonicalTeamName(f.home_team),
    away_team: canonicalTeamName(f.away_team),
  }))
}

export async function makePick(
  entry: Entry,
  team: { name: string }
) {
  if (!entry.alive) {
    throw new Error("You have been eliminated.")
  }

  const c = await getCompetition()

  if (c.status !== "active") {
    throw new Error("The competition has finished.")
  }

  const previous = await rest<Pick[]>(
    `picks?entry_id=eq.${encodeURIComponent(
      entry.id
    )}&team=eq.${encodeURIComponent(
      team.name
    )}&select=id&limit=1`
  )

  if (previous.length) {
    throw new Error("You have already used that team.")
  }

  const existing = await rest<Pick[]>(
    `picks?entry_id=eq.${encodeURIComponent(
      entry.id
    )}&round=eq.${c.round}&select=id&limit=1`
  )

  if (existing.length) {
    throw new Error(
      "Your pick is already locked for this round."
    )
  }

  const fixtures = await getFixtures(c.round)

  const fixture = fixtures.find(
    (f) =>
      f.home_team === team.name ||
      f.away_team === team.name
  )

  if (!fixture) {
    throw new Error(
      "That team does not have a fixture in the current round yet. Try again shortly."
    )
  }

  if (
    new Date(fixture.kickoff).getTime() <= Date.now() ||
    ["FINISHED", "IN_PLAY", "PAUSED"].includes(
      fixture.status
    )
  ) {
    throw new Error(
      "That fixture has already kicked off, so picks are locked."
    )
  }

  await rest(`picks`, {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      entry_id: entry.id,
      round: c.round,
      team: team.name,
      fixture_id: fixture.id,
      locked_at: new Date().toISOString(),
      result: null,
    }),
  })
}

export async function getLeaderboard() {
  const c = await getCompetition()

  const entries = await rest<Entry[]>(
    `entries?competition_id=eq.${encodeURIComponent(
      c.id
    )}&select=*&order=created_at.asc`
  )

  const picks = await rest<Pick[]>(
    `picks?select=*`
  )

  return entries.map((e) => ({
    ...e,
    wins: picks.filter(
      (p) =>
        p.entry_id === e.id &&
        p.result === "win"
    ).length,
    picks: picks
      .filter((p) => p.entry_id === e.id)
      .sort(
        (a, b) => a.round - b.round
      ),
  }))
}
