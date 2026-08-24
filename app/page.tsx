import {
  getCompetition,
  getCurrentEntry,
  getPicks,
  getLeaderboard,
  getFixtures,
} from "@/lib/store"
import { teams } from "@/lib/teams"
import { JoinGame } from "@/components/join-game"
import { GameDashboard } from "@/components/game-dashboard"
import { SiteHeader } from "@/components/site-header"

export const dynamic = "force-dynamic"

type HomeProps = {
  searchParams?: Promise<{
    league?: string | string[]
  }>
}

export default async function Home({
  searchParams,
}: HomeProps) {
  const params = searchParams
    ? await searchParams
    : {}

  const rawLeague = params?.league

  const leagueCode =
    typeof rawLeague === "string"
      ? rawLeague.trim().toUpperCase()
      : Array.isArray(rawLeague)
        ? rawLeague[0]?.trim().toUpperCase()
        : undefined

  let competition

  try {
    competition = await getCompetition(
      leagueCode || undefined
    )
  } catch {
    return (
      <>
        <SiteHeader />

        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h1 className="font-display text-3xl uppercase">
              League not found
            </h1>

            <p className="mt-3 text-muted-foreground">
              That league link or join code is not valid.
            </p>
          </div>
        </main>
      </>
    )
  }

  const entry = await getCurrentEntry(
    competition.code
  )

  if (!entry) {
    return (
      <>
        <SiteHeader />

        <JoinGame
          gameName={competition.name}
          round={competition.round}
          defaultName=""
          competitionCode={
            leagueCode || undefined
          }
        />
      </>
    )
  }

  const [
    picks,
    leaderboard,
    fixtures,
  ] = await Promise.all([
    getPicks(entry.id),
    getLeaderboard(competition.code),
    getFixtures(competition.round),
  ])

  return (
    <>
      <SiteHeader />

      <GameDashboard
        competition={competition}
        entry={entry}
        teams={teams}
        picks={picks}
        leaderboard={leaderboard}
        fixtures={fixtures}
      />
    </>
  )
}
