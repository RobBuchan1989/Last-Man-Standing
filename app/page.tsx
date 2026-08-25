import {
  getCompetition,
  getCurrentEntry,
  getFixtures,
  getLeaderboard,
  getPicks,
  joinCompetition,
  makePick,
} from "@/lib/store"

import { teams } from "@/lib/teams"

import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"
export const revalidate = 0

type HomeProps = {
  searchParams?: Promise<{
    league?: string | string[]
  }>
}

function getLeagueCode(
  value?: string | string[]
) {
  if (typeof value === "string") {
    return value.trim().toUpperCase()
  }

  if (Array.isArray(value) && value.length) {
    return value[0]?.trim().toUpperCase()
  }

  return undefined
}

async function joinAction(
  formData: FormData
) {
  "use server"

  const name =
    String(
      formData.get("name") || ""
    ).trim()

  const league =
    String(
      formData.get("league") || ""
    ).trim()

  if (!name) {
    throw new Error(
      "Please enter your name."
    )
  }

  await joinCompetition(
    name,
    league || undefined
  )

  revalidatePath("/")
}

async function pickAction(
  formData: FormData
) {
  "use server"

  const entryId =
    String(
      formData.get("entryId") || ""
    )

  const teamName =
    String(
      formData.get("team") || ""
    )

  const league =
    String(
      formData.get("league") || ""
    ).trim()

  if (!entryId || !teamName) {
    throw new Error(
      "Invalid pick."
    )
  }

  const competition =
    await getCompetition(
      league || undefined
    )

  const entry =
    await getCurrentEntry(
      competition.code,
      false
    )

  if (!entry || entry.id !== entryId) {
    throw new Error(
      "Your player session could not be verified."
    )
  }

  await makePick(
    entry,
    { name: teamName },
    competition.code
  )

  revalidatePath("/")
}

export default async function Home({
  searchParams,
}: HomeProps) {
  const params =
    searchParams
      ? await searchParams
      : {}

  const leagueCode =
    getLeagueCode(
      params?.league
    )

  let competition

  try {
    competition =
      await getCompetition(
        leagueCode
      )
  } catch {
    return (
      <main className="min-h-screen bg-[#0b1018] text-white">
        <header className="border-b border-white/10 bg-[#111722] px-6 py-7">
          <div className="mx-auto max-w-7xl">
            <div className="text-sm font-bold tracking-[0.35em] text-green-400">
              PREMIER LEAGUE
            </div>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              LAST MAN STANDING
            </h1>
          </div>
        </header>

        <div className="mx-auto max-w-xl px-6 py-16">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <h2 className="text-2xl font-bold">
              League not found
            </h2>

            <p className="mt-3 text-slate-300">
              The league code could not be
              found. Please check the league
              link and try again.
            </p>
          </div>
        </div>
      </main>
    )
  }

  /*
   * IMPORTANT:
   *
   * A URL containing ?league=CODE is ALWAYS
   * treated as a join link.
   *
   * This deliberately ignores the browser's
   * existing player cookie.
   *
   * Therefore:
   *
   * Test Manager 4
   * Test Manager 5
   * Test Manager 6
   *
   * can all use the same URL.
   */

  const entry =
    await getCurrentEntry(
      competition.code,
      Boolean(leagueCode)
    )

  /*
   * ----------------------------------------------------------
   * JOIN SCREEN
   * ----------------------------------------------------------
   */

  if (!entry) {
    return (
      <main className="min-h-screen bg-[#0b1018] text-white">
        <header className="border-b border-white/10 bg-[#111722] px-6 py-7">
          <div className="mx-auto max-w-7xl">
            <div className="text-sm font-bold tracking-[0.35em] text-green-400">
              PREMIER LEAGUE
            </div>

            <h1 className="mt-1 text-3xl font-black tracking-tight">
              LAST MAN STANDING
            </h1>
          </div>
        </header>

        <div className="mx-auto max-w-xl px-6 py-16">
          <div className="rounded-2xl border border-white/10 bg-[#151b25] p-8 shadow-2xl">
            <div className="text-sm font-bold tracking-[0.3em] text-green-400">
              JOIN LEAGUE
            </div>

            <h2 className="mt-2 text-4xl font-black">
              {competition.name}
            </h2>

            <p className="mt-4 text-slate-400">
              Round {competition.round}
            </p>

            <p className="mt-6 text-slate-300">
              Enter your name to join this
              Last Man Standing competition.
            </p>

            <form
              action={joinAction}
              className="mt-8"
            >
              <input
                type="hidden"
                name="league"
                value={competition.code}
              />

              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Your name
              </label>

              <input
                name="name"
                required
                maxLength={40}
                placeholder="e.g. Test Manager 5"
                className="w-full rounded-xl border border-white/10 bg-[#0e141d] px-4 py-4 text-white outline-none focus:border-green-400"
              />

              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-green-400 px-5 py-4 font-black text-[#07110b] transition hover:bg-green-300"
              >
                JOIN LEAGUE
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-[#0e141d] p-4 text-sm text-slate-400">
              League code:
              <strong className="ml-2 text-white">
                {competition.code}
              </strong>
            </div>
          </div>
        </div>
      </main>
    )
  }

  /*
   * ----------------------------------------------------------
   * LOAD GAME DATA
   * ----------------------------------------------------------
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

  const usedTeams =
    picks.map(
      (pick) => pick.team
    )

  const currentPick =
    picks.find(
      (pick) =>
        pick.round ===
        competition.round
    )

  /*
   * ----------------------------------------------------------
   * GAME
   * ----------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#0b1018] text-white">
      <header className="border-b border-white/10 bg-[#111722] px-6 py-7">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-bold tracking-[0.35em] text-green-400">
              PREMIER LEAGUE
            </div>

            <h1 className="mt-1 text-3xl font-black">
              LAST MAN STANDING
            </h1>
          </div>

          <div className="text-right text-slate-400">
            <div className="text-sm">
              League
            </div>

            <div className="font-bold text-white">
              {competition.name}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* GAME */}
          <section>
            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-sm font-bold tracking-[0.3em] text-green-400">
                    ROUND {competition.round}
                  </div>

                  <h2 className="mt-2 text-4xl font-black">
                    CHOOSE YOUR WINNER
                  </h2>

                  <p className="mt-3 text-lg text-slate-400">
                    Welcome, {entry.name}.
                    A win keeps you alive.
                    Draw or loss = OUT.
                  </p>
                </div>

                <div className="rounded-xl bg-[#202733] px-4 py-3 text-center">
                  <div className="text-xs text-slate-400">
                    LEAGUE CODE
                  </div>

                  <div className="font-black">
                    {competition.code}
                  </div>
                </div>
              </div>

              {currentPick ? (
                <div className="mt-8 rounded-xl border border-green-400/40 bg-green-400/10 p-5">
                  <div className="text-sm font-bold text-green-400">
                    PICK LOCKED
                  </div>

                  <div className="mt-1 text-2xl font-black">
                    {currentPick.team}
                  </div>

                  <div className="mt-1 text-slate-400">
                    Your Round {competition.round}
                    pick has been saved.
                  </div>
                </div>
              ) : !entry.alive ? (
                <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/10 p-5">
                  <div className="text-2xl font-black text-red-400">
                    YOU ARE OUT
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {fixtures.map(
                    (fixture) => {
                      const homeTeam =
                        fixture.home_team

                      const awayTeam =
                        fixture.away_team

                      const fixtureTeams =
                        [
                          homeTeam,
                          awayTeam,
                        ]

                      return fixtureTeams.map(
                        (teamName) => {
                          const used =
                            usedTeams.includes(
                              teamName
                            )

                          return (
                            <form
                              key={`${fixture.id}-${teamName}`}
                              action={
                                pickAction
                              }
                            >
                              <input
                                type="hidden"
                                name="entryId"
                                value={
                                  entry.id
                                }
                              />

                              <input
                                type="hidden"
                                name="team"
                                value={
                                  teamName
                                }
                              />

                              <input
                                type="hidden"
                                name="league"
                                value={
                                  competition.code
                                }
                              />

                              <button
                                type="submit"
                                disabled={
                                  used
                                }
                                className={`w-full rounded-2xl border p-5 text-left transition ${
                                  used
                                    ? "cursor-not-allowed border-white/5 bg-[#10151d] opacity-40"
                                    : "border-white/10 bg-[#151b25] hover:border-green-400 hover:bg-[#202733]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <div className="text-xl font-black">
                                      {
                                        teamName
                                      }
                                    </div>

                                    <div className="mt-1 text-sm text-slate-400">
                                      {
                                        homeTeam
                                      }{" "}
                                      v{" "}
                                      {
                                        awayTeam
                                      }
                                    </div>
                                  </div>

                                  <span className="text-sm font-bold text-slate-400">
                                    {used
                                      ? "USED"
                                      : "PICK"}
                                  </span>
                                </div>
                              </button>
                            </form>
                          )
                        }
                      )
                    }
                  )}
                </div>
              )}

              {!fixtures.length && (
                <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
                  No fixtures are currently
                  available for Round{" "}
                  {competition.round}.
                </div>
              )}
            </div>
          </section>

          {/* SIDEBAR */}
          <aside>
            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">
                  LEADERBOARD
                </h2>

                <span className="rounded-full bg-[#202733] px-3 py-1 text-sm">
                  {
                    leaderboard.filter(
                      (player) =>
                        player.alive
                    ).length
                  }{" "}
                  alive
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {leaderboard.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="rounded-xl bg-[#1c222d] p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-slate-500">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold">
                            {
                              player.name
                            }
                          </div>

                          <div className="text-sm text-slate-400">
                            {
                              player.picks
                                .length
                            }{" "}
                            picks
                          </div>
                        </div>

                        <div
                          className={
                            player.alive
                              ? "font-bold text-green-400"
                              : "font-bold text-red-400"
                          }
                        >
                          {player.alive
                            ? "ALIVE"
                            : "OUT"}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#151b25] p-6">
              <h2 className="text-2xl font-black">
                RULES
              </h2>

              <ul className="mt-4 space-y-3 text-slate-400">
                <li>
                  • Pick one Premier League
                  team each round.
                </li>

                <li>
                  • A win keeps you alive.
                </li>

                <li>
                  • A draw or loss knocks
                  you out.
                </li>

                <li>
                  • You cannot use the same
                  team twice.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
