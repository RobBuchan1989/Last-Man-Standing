import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAYER_COOKIE = "lms_player_id"
const COMPETITION_COOKIE = "lms_competition_id"

async function getCompetitionId() {
  const cookieStore = await cookies()
  return cookieStore.get(COMPETITION_COOKIE)?.value || null
}

async function getPlayerId() {
  const cookieStore = await cookies()
  return cookieStore.get(PLAYER_COOKIE)?.value || null
}

async function setPlayerCookie(playerId: string) {
  const cookieStore = await cookies()

  cookieStore.set(PLAYER_COOKIE, playerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
}

export async function getCurrentEntry() {
  const competitionId = await getCompetitionId()
  const playerId = await getPlayerId()

  if (!competitionId || !playerId) return null

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("id", playerId)
    .maybeSingle()

  if (error) {
    console.error("getCurrentEntry:", error)
    return null
  }

  return data
}

export async function joinCompetition(name: string) {
  const competitionId = await getCompetitionId()

  if (!competitionId) {
    throw new Error("Competition not found.")
  }

  const cleanName = name.trim().slice(0, 40)

  if (!cleanName) {
    throw new Error("Please enter your name.")
  }

  // First look for an existing player with this name in this competition.
  const { data: existing, error: lookupError } = await supabase
    .from("entries")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("name", cleanName)
    .maybeSingle()

  if (lookupError) {
    console.error("joinCompetition lookup:", lookupError)
    throw new Error("Could not check your existing entry.")
  }

  if (existing) {
    await setPlayerCookie(existing.id)
    return existing
  }

  // No existing player — create a new entry.
  const { data, error } = await supabase
    .from("entries")
    .insert({
      competition_id: competitionId,
      name: cleanName,
      status: "alive",
    })
    .select("*")
    .single()

  if (error) {
    // A second request could have created the same name between
    // the lookup above and this insert. Re-fetch it rather than
    // showing the player a database 409.
    if (error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("entries")
        .select("*")
        .eq("competition_id", competitionId)
        .eq("name", cleanName)
        .maybeSingle()

      if (duplicate) {
        await setPlayerCookie(duplicate.id)
        return duplicate
      }
    }

    console.error("joinCompetition insert:", error)
    throw new Error("Could not join the competition. Please try again.")
  }

  await setPlayerCookie(data.id)

  return data
}

export async function makePick(
  entry: any,
  team: { name: string }
) {
  const competitionId = await getCompetitionId()

  if (!competitionId) {
    throw new Error("Competition not found.")
  }

  const { error } = await supabase
    .from("picks")
    .insert({
      competition_id: competitionId,
      entry_id: entry.id,
      team_name: team.name,
    })

  if (error) {
    console.error("makePick:", error)
    throw new Error("Could not save your pick.")
  }
}
