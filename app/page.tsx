import { getCompetition, getCurrentEntry, getFixtures, getLeaderboard, getPicks } from "@/lib/store"
import { teams } from "@/lib/teams"

import JoinGame from "@/components/JoinGame"
import GameDashboard from "@/components/GameDashboard"
import SiteHeader from "@/components/SiteHeader"

export const dynamic = "force-dynamic"
export const revalidate = 0

type HomeProps = {
  searchParams?: Promise<{
    league?: string | string[]
  }>
}

export default async function Home({
  searchParams,
}: HomeProps) {
  /*
   * ------------------------------------------------------------
   * LEAGUE CODE
   * ------------------------------------------------------------
   *
   * Normal URL:
   *
   * https://your-site.com
   *
   * Uses the player's existing league cookie.
   *
   * Shared league URL:
   *
   * https://your-site.com/?league=F34BD5
   *
   * Explicitly loads that league and shows the join screen.
   *
   * This is important because another person may already
   * have an entry cookie in their browser.
   */

  const params = searchParams
    ? await searchParams
    : {}

  let leagueCode: string | undefined

  const rawLeague =
    params?.league

  if (
    typeof rawLeague === "string"
  ) {
    leagueCode =
      rawLeague
        .trim()
        .toUpperCase()
  } else if (
    Array.isArray(rawLeague) &&
    rawLeague.length > 0
  ) {
    leagueCode =
      rawLeague[0]
        ?.trim()
        .toUpperCase()
  }

  /*
   * ------------------------------------------------------------
   * GET COMPETITION
   * ------------------------------------------------------------
   */

  let competition

  try {
    competition =
      await getCompetition(
        leagueCode
      )
  } catch {
    return (
      <main>
        <SiteHeader />

        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h1 className="text-2xl font-bold text-white">
              League not found
            </h1>

            <p className="mt-3 text-slate-300">
              The league code you entered could not
              be found. Please check the league link
              and try again.
            </p>
          </div>
        </div>
      </main>
    )
  }

  /*
   * ------------------------------------------------------------
   * CURRENT PLAYER
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * If leagueCode exists in the URL, this is a
   * shared league/join link.
   *
   * We deliberately IGNORE any existing browser
   * entry cookie so that:
   *
   * Test Manager 4
   * Test Manager 5
   * Test Manager 6
   *
   * can all use the same league link.
   *
   * Without this, the browser could automatically
   * log the next person into the previous player's
   * account.
   */

  const entry =
    await getCurrentEntry(
      competition.code,
      Boolean(leagueCode)
    )

  /*
   * ------------------------------------------------------------
   * JOIN SCREEN
   * ------------------------------------------------------------
   *
   * If there is no current entry, show the join screen.
   *
   * This will happen:
   *
   * - for a brand-new player
   * - when using a shared ?league=CODE link
   * - when the browser has no entry cookie
   */

  if (!entry) {
    return (
      <main>
        <SiteHeader />

        <JoinGame
          gameName={
            competition.name
          }
          round={
            competition.round
          }
          defaultName=""
          competitionCode={
            competition.code
          }
        />
      </main>
    )
  }

  /*
   * ------------------------------------------------------------
   * LOAD PLAYER DATA
   * ------------------------------------------------------------
   */

  const [
    picks,
    leaderboard,
    fixtures,
  ] =
    await Promise.all([
      getPicks(entry.id),

      getLeaderboard(
        competition.code
      ),

      getFixtures(
        competition.round
      ),
    ])

  /*
   * ------------------------------------------------------------
   * MAIN GAME
   * ------------------------------------------------------------
   */

  return (
    <main>
      <SiteHeader />

      <GameDashboard
        competition={
          competition
        }
        entry={entry}
        teams={teams}
        picks={picks}
        leaderboard={
          leaderboard
        }
        fixtures={fixtures}
      />
    </main>
  )
}
