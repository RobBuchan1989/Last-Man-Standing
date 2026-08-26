import { createClient } from "./server"

export type AdminCompetition = {
  id: string
  name: string
  code: string
  status: string
  round: number
  created_at: string
  total_players: number
  players_alive: number
  players_out: number
}

export async function getAdminCompetitions(): Promise<AdminCompetition[]> {
  const supabase = await createClient()

  // Check the currently signed-in user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error("Not authenticated")
  }

  // Confirm the user is an active administrator
  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("id, email, active")
    .eq("email", user.email)
    .eq("active", true)
    .maybeSingle()

  if (adminError) {
    throw new Error("Unable to verify administrator access")
  }

  if (!adminUser) {
    throw new Error("Administrator access denied")
  }

  // Get all competitions
  const { data: competitions, error: competitionsError } = await supabase
    .from("competitions")
    .select("id, name, code, status, round, created_at")
    .order("created_at", { ascending: false })

  if (competitionsError) {
    throw new Error("Unable to load competitions")
  }

  if (!competitions || competitions.length === 0) {
    return []
  }

  // Get entry counts for all competitions
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, competition_id, alive")

  if (entriesError) {
    throw new Error("Unable to load competition players")
  }

  return competitions.map((competition) => {
    const competitionEntries =
      entries?.filter(
        (entry) => entry.competition_id === competition.id
      ) ?? []

    const totalPlayers = competitionEntries.length

    const playersAlive = competitionEntries.filter(
      (entry) => entry.alive === true
    ).length

    const playersOut = competitionEntries.filter(
      (entry) => entry.alive === false
    ).length

    return {
      id: competition.id,
      name: competition.name,
      code: competition.code,
      status: competition.status,
      round: competition.round,
      created_at: competition.created_at,
      total_players: totalPlayers,
      players_alive: playersAlive,
      players_out: playersOut,
    }
  })
}
