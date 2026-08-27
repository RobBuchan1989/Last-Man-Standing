import Link from "next/link"
import ShareLeague from "@/app/components/ShareLeague"
import FastPickButton from "@/app/components/FastPickButton"

import {
  getCompetition,
  getCurrentEntry,
  getFixtures,
  getLeaderboard,
  getPicks,
  getRoundPicks,
  getPlayerLeagues,
  joinCompetition,
  createCompetition,
} from "@/lib/store"

export const dynamic = "force-dynamic"
export const revalidate = 0

type HomeProps = {
  searchParams?: Promise<{
    league?: string | string[]
    home?: string | string[]
    round?: string | string[]
  }>
}

/*
 * ------------------------------------------------------------
 * URL HELPERS
 * ------------------------------------------------------------
 */

function getLeagueCode(
  value?: string | string[]
) {
  if (typeof value === "string") {
    return value.trim().toUpperCase()
  }

  if (
    Array.isArray(value) &&
    value.length > 0
  ) {
    return value[0]?.trim().toUpperCase()
  }

  return undefined
}

function isHomePage(
  value?: string | string[]
) {
  if (typeof value === "string") {
    return value === "true"
  }

  if (
    Array.isArray(value) &&
    value.length > 0
  ) {
    return value[0] === "true"
  }

  return false
}

function getRequestedRound(
  value?: string | string[]
) {
  const raw =
    typeof value === "string"
      ? value
      : Array.isArray(value) &&
          value.length > 0
        ? value[0]
        : undefined

  if (!raw) {
    return undefined
  }

  const round =
    Number.parseInt(raw, 10)

  if (
    !Number.isFinite(round) ||
    round < 1
  ) {
    return undefined
  }

  return round
}

/*
 * ------------------------------------------------------------
 * JOIN LEAGUE
 * ------------------------------------------------------------
 */

async function joinAction(
  formData: FormData
) {
  "use server"

  const name = String(
    formData.get("name") || ""
  ).trim()

  const league = String(
    formData.get("league") || ""
  )
    .trim()
    .toUpperCase()

  if (!name) {
    throw new Error(
      "Please enter your name."
    )
  }

  if (!league) {
    throw new Error(
      "Please enter a league code."
    )
  }

  await joinCompetition(
    name,
    league
  )

  const { redirect } =
    await import("next/navigation")

  redirect(
    `/?league=${encodeURIComponent(
      league
    )}`
  )
}

/*
 * ------------------------------------------------------------
 * CREATE NEW LEAGUE
 * ------------------------------------------------------------
 */

async function createLeagueAction(
  formData: FormData
) {
  "use server"

  const leagueName = String(
    formData.get("leagueName") || ""
  ).trim()

  const playerName = String(
    formData.get("playerName") || ""
  ).trim()

  if (!leagueName) {
    throw new Error(
      "Please enter a league name."
    )
  }

  if (!playerName) {
    throw new Error(
      "Please enter your name."
    )
  }

  const competition =
    await createCompetition(
      leagueName
    )

  await joinCompetition(
    playerName,
    competition.code
  )

  const { redirect } =
    await import("next/navigation")

  redirect(
    `/?league=${encodeURIComponent(
      competition.code
    )}`
  )
}

/*
 * ------------------------------------------------------------
 * HOME ICON
 * ------------------------------------------------------------
 */

function HomeLink({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <Link
      href="/?home=true"
      prefetch={true}
      aria-label="Go to home"
      className={`group flex items-center gap-3 ${
        compact ? "" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#202733] text-white transition group-hover:border-green-400 group-hover:bg-[#29313e]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      </span>

      <div>
        <div className="text-sm font-bold tracking-[0.35em] text-green-400">
          PREMIER LEAGUE
        </div>

        <h1
          className={
            compact
              ? "mt-1 text-2xl font-black"
              : "mt-1 text-3xl font-black tracking-tight"
          }
        >
          LAST MAN STANDING
        </h1>
      </div>
    </Link>
  )
}

/*
 * ------------------------------------------------------------
 * PAGE
 * ------------------------------------------------------------
 */

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

  const explicitHomePage =
    isHomePage(
      params?.home
    )

  const requestedRound =
    getRequestedRound(
      params?.round
    )

  /*
   * The root URL "/" is ALWAYS the homepage.
   *
   * A league page is only loaded when a league
   * code is explicitly present in the URL.
   */

  const homePage =
    explicitHomePage ||
    !leagueCode

  /*
   * ----------------------------------------------------------
   * HOMEPAGE
   * ----------------------------------------------------------
   */

  if (homePage) {
    const playerLeagues =
      await getPlayerLeagues()

    return (
      <main className="min-h-screen bg-[#0b1018] text-white">

        <header className="border-b border-white/10 bg-[#111722] px-6 py-7">
          <div className="mx-auto max-w-7xl">
            <HomeLink />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-16">

          <div className="rounded-2xl border border-white/10 bg-[#151b25] p-8 shadow-2xl">

            <div className="text-sm font-bold tracking-[0.3em] text-green-400">
              LAST MAN STANDING
            </div>

            <h2 className="mt-3 text-5xl font-black">
              Welcome
            </h2>

            <p className="mt-5 max-w-2xl text-xl text-slate-400">
              Pick. Win. Survive.
            </p>

            {/* YOUR LEAGUES */}

            <div className="mt-10 rounded-2xl bg-[#0e141d] p-6">

              <div className="text-sm font-bold tracking-[0.25em] text-green-400">
                YOUR LEAGUES
              </div>

              {playerLeagues.length > 0 ? (

                <div className="mt-5 space-y-4">

                  {playerLeagues.map(
                    ({
                      competition,
                      entry,
                    }) => (

                      <div
                        key={entry.id}
                        className="rounded-2xl border border-white/10 bg-[#151b25] p-5"
                      >

                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                          <div>

                            <div className="text-2xl font-black">
                              {
                                competition.name
                              }
                            </div>

                            <div className="mt-2 text-slate-400">
                              Welcome back,{" "}
                              {
                                entry.name
                              }
                              .
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              League code:{" "}
                              <strong className="text-slate-300">
                                {
                                  competition.code
                                }
                              </strong>
                            </div>

                          </div>

                          <Link
                            href={`/?league=${encodeURIComponent(
                              competition.code
                            )}`}
                            /*
                             * IMPORTANT:
                             * Do not prefetch the league page.
                             *
                             * The league page must fetch the latest
                             * database state when the player returns.
                             */
                            prefetch={false}
                            className="w-full rounded-xl bg-green-400 px-7 py-4 text-center font-black text-[#07110b] hover:bg-green-300 md:w-auto"
                          >
                            RETURN TO LEAGUE
                          </Link>

                        </div>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="mt-5 rounded-xl border border-white/10 bg-[#151b25] p-5">

                  <div className="text-lg font-bold">
                    You haven't joined any leagues yet.
                  </div>

                  <p className="mt-2 text-slate-400">
                    Create a league or use a league
                    code to join one.
                  </p>

                </div>

              )}

            </div>

            {/* CREATE + JOIN */}

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              {/* CREATE */}

              <div className="rounded-2xl bg-[#0e141d] p-6">

                <div className="text-sm font-bold tracking-[0.25em] text-green-400">
                  CREATE A LEAGUE
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Start your own
                </h3>

                <p className="mt-2 text-slate-400">
                  Create a new competition and invite
                  your friends.
                </p>

                <form
                  action={
                    createLeagueAction
                  }
                  className="mt-6 space-y-4"
                >

                  <div>

                    <label className="mb-2 block font-semibold text-slate-300">
                      League name
                    </label>

                    <input
                      name="leagueName"
                      required
                      maxLength={60}
                      placeholder="e.g. Friday Night Football"
                      className="w-full rounded-xl border border-white/10 bg-[#151b25] px-4 py-4 text-white outline-none focus:border-green-400"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block font-semibold text-slate-300">
                      Your name
                    </label>

                    <input
                      name="playerName"
                      required
                      maxLength={40}
                      placeholder="e.g. Rob"
                      className="w-full rounded-xl border border-white/10 bg-[#151b25] px-4 py-4 text-white outline-none focus:border-green-400"
                    />

                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-green-400 px-5 py-4 font-black text-[#07110b] hover:bg-green-300"
                  >
                    CREATE LEAGUE
                  </button>

                </form>

              </div>

              {/* JOIN */}

              <div className="rounded-2xl bg-[#0e141d] p-6">

                <div className="text-sm font-bold tracking-[0.25em] text-green-400">
                  JOIN A LEAGUE
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Got an invite?
                </h3>

                <p className="mt-2 text-slate-400">
                  Enter the league code shared with
                  you.
                </p>

                <form
                  action={joinAction}
                  className="mt-6 space-y-4"
                >

                  <div>

                    <label className="mb-2 block font-semibold text-slate-300">
                      League code
                    </label>

                    <input
                      name="league"
                      required
                      maxLength={20}
                      placeholder="e.g. F34BD5"
                      className="w-full rounded-xl border border-white/10 bg-[#151b25] px-4 py-4 uppercase text-white outline-none focus:border-green-400"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block font-semibold text-slate-300">
                      Your name
                    </label>

                    <input
                      name="name"
                      required
                      maxLength={40}
                      placeholder="e.g. Rob"
                      className="w-full rounded-xl border border-white/10 bg-[#151b25] px-4 py-4 text-white outline-none focus:border-green-400"
                    />

                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-green-400 px-5 py-4 font-black text-[#07110b] hover:bg-green-300"
                  >
                    JOIN LEAGUE
                  </button>

                </form>

              </div>

            </div>

          </div>

        </div>

      </main>
    )
  }

  /*
   * ----------------------------------------------------------
   * LOAD COMPETITION
   * ----------------------------------------------------------
   */

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
            <HomeLink compact />
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
   * ----------------------------------------------------------
   * GET CURRENT PLAYER ENTRY
   * ----------------------------------------------------------
   */

  const entry =
    await getCurrentEntry(
      competition.code,
      false
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
            <HomeLink compact />
          </div>

        </header>

        <div className="mx-auto max-w-xl px-6 py-16">

          <div className="rounded-2xl border border-white/10 bg-[#151b25] p-8 shadow-2xl">

            <div className="text-sm font-bold tracking-[0.3em] text-green-400">
              JOIN LEAGUE
            </div>

            <h2 className="mt-2 text-5xl font-black">
              {
                competition.name
              }
            </h2>

            <p className="mt-5 text-2xl text-slate-400">
              Round{" "}
              {
                competition.round
              }
            </p>

            <p className="mt-8 text-xl text-slate-300">
              Enter your name to join this Last Man
              Standing competition.
            </p>

            <form
              action={joinAction}
              className="mt-10"
            >

              <input
                type="hidden"
                name="league"
                value={
                  competition.code
                }
              />

              <label className="mb-3 block text-xl font-semibold text-slate-300">
                Your name
              </label>

              <input
                name="name"
                required
                maxLength={40}
                placeholder="e.g. Test Manager 5"
                className="w-full rounded-2xl border border-white/10 bg-[#0e141d] px-5 py-5 text-xl text-white outline-none focus:border-green-400"
              />

              <button
                type="submit"
                className="mt-5 w-full rounded-2xl bg-green-400 px-5 py-6 text-2xl font-black text-[#07110b] hover:bg-green-300"
              >
                JOIN LEAGUE
              </button>

            </form>

            <div className="mt-8 rounded-2xl bg-[#0e141d] p-5 text-lg text-slate-400">

              League code:

              <strong className="ml-2 text-white">
                {
                  competition.code
                }
              </strong>

            </div>

          </div>

        </div>

      </main>
    )
  }

  /*
   * ----------------------------------------------------------
   * DETERMINE DISPLAY ROUND
   * ----------------------------------------------------------
   */

  const currentRound =
    competition.round

  const displayRound =
    requestedRound &&
    requestedRound <= currentRound
      ? requestedRound
      : currentRound

  const viewingCurrentRound =
    displayRound === currentRound

  /*
   * ----------------------------------------------------------
   * LOAD GAME DATA
   * ----------------------------------------------------------
   *
   * The current player's picks are loaded directly from
   * the database every time this page renders.
   */

  const [
    picks,
    leaderboard,
    fixtures,
    roundPicks,
  ] = await Promise.all([
    getPicks(entry.id),

    getLeaderboard(
      competition.code
    ),

    viewingCurrentRound
      ? getFixtures(
          currentRound
        )
      : Promise.resolve([]),

    getRoundPicks(
      displayRound,
      competition.code
    ),
  ])

  /*
   * ----------------------------------------------------------
   * CURRENT PLAYER PICK
   * ----------------------------------------------------------
   */

  const currentPick =
    picks.find(
      (pick) =>
        pick.round ===
        currentRound
    )

  /*
   * ----------------------------------------------------------
   * TEAMS ALREADY USED
   * ----------------------------------------------------------
   */

  const usedTeams =
    picks.map(
      (pick) =>
        pick.team
    )

  /*
   * ----------------------------------------------------------
   * HISTORICAL ROUND HELPERS
   * ----------------------------------------------------------
   */

  const roundPickMap =
    new Map(
      roundPicks.map(
        (pick) => [
          pick.entry_id,
          pick,
        ]
      )
    )

  /*
   * ----------------------------------------------------------
   * MAIN GAME
   * ----------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#0b1018] text-white">

      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#111722] px-6 py-7">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">

          <HomeLink />

          <div className="text-right text-slate-400">

            <div className="text-sm">
              League
            </div>

            <div className="font-bold text-white">
              {
                competition.name
              }
            </div>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ROUND NAVIGATION */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#151b25] p-4">

          <div>

            <div className="text-xs font-bold tracking-[0.25em] text-green-400">
              ROUND HISTORY
            </div>

            <div className="mt-1 text-lg font-bold">
              {viewingCurrentRound
                ? `Round ${currentRound} — Current`
                : `Round ${displayRound} — Completed`}
            </div>

          </div>

          <div className="flex items-center gap-3">

            {displayRound > 1 ? (

              <Link
                href={`/?league=${encodeURIComponent(
                  competition.code
                )}&round=${displayRound - 1}`}
                prefetch={false}
                className="rounded-xl border border-white/10 bg-[#202733] px-4 py-3 font-bold hover:border-green-400"
              >
                ← ROUND{" "}
                {displayRound - 1}
              </Link>

            ) : (

              <span className="rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 font-bold text-slate-600">
                ← PREVIOUS
              </span>

            )}

            {displayRound <
            currentRound ? (

              <Link
                href={`/?league=${encodeURIComponent(
                  competition.code
                )}&round=${displayRound + 1}`}
                prefetch={false}
                className="rounded-xl border border-white/10 bg-[#202733] px-4 py-3 font-bold hover:border-green-400"
              >
                ROUND{" "}
                {displayRound + 1} →
              </Link>

            ) : (

              <span className="rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 font-bold text-slate-600">
                CURRENT ROUND
              </span>

            )}

          </div>

        </div>

        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">

          {/* GAME */}

          <section>

            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-7">

              {viewingCurrentRound ? (

                <>

                  <div className="flex items-start justify-between gap-6">

                    <div>

                      <div className="text-sm font-bold tracking-[0.3em] text-green-400">
                        ROUND{" "}
                        {
                          currentRound
                        }{" "}
                        — CURRENT
                      </div>

                      <h2 className="mt-2 text-4xl font-black">
                        {currentPick
                          ? "YOUR PICK"
                          : "CHOOSE YOUR WINNER"}
                      </h2>

                      <p className="mt-3 text-lg text-slate-400">
                        Welcome,{" "}
                        {
                          entry.name
                        }
                        .
                        A win keeps you alive.
                        Draw or loss = OUT.
                      </p>

                    </div>

                    <div className="rounded-xl bg-[#202733] px-4 py-3 text-center">

                      <div className="text-xs text-slate-400">
                        LEAGUE CODE
                      </div>

                      <div className="font-black">
                        {
                          competition.code
                        }
                      </div>

                    </div>

                  </div>

                  {currentPick ? (

                    /*
                     * ------------------------------------------------
                     * SAVED + LOCKED PICK
                     * ------------------------------------------------
                     *
                     * This is rendered from the database, not from
                     * temporary client-side state.
                     */

                    <>
                      <div className="mt-8 rounded-2xl border-2 border-green-400/50 bg-green-400/10 p-6">

                        <div className="flex items-start gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-400 text-2xl font-black text-[#07110b]">
                            ✓
                          </div>

                          <div className="min-w-0">

                            <div className="text-sm font-black tracking-[0.25em] text-green-400">
                              YOUR PICK
                            </div>

                            <div className="mt-1 text-3xl font-black uppercase">
                              {
                                currentPick.team
                              }
                            </div>

                            <div className="mt-2 text-lg font-black text-white">
                              ROUND{" "}
                              {
                                currentRound
                              }{" "}
                              PICK SAVED & LOCKED IN
                            </div>

                            <div className="mt-1 text-slate-400">
                              Your pick is locked. Good luck!
                            </div>

                          </div>

                        </div>

                      </div>

                      <ShareLeague
                        leagueCode={
                          competition.code
                        }
                        leagueName={
                          competition.name
                        }
                      />
                    </>

                  ) : !entry.alive ? (

                    <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/10 p-5">

                      <div className="text-2xl font-black text-red-400">
                        YOU ARE OUT
                      </div>

                    </div>

                  ) : (

                    /*
                     * ------------------------------------------------
                     * AVAILABLE FIXTURES
                     * ------------------------------------------------
                     */

                    <div className="mt-8">

                      <div className="mb-4 text-sm font-bold tracking-[0.2em] text-slate-400">
                        AVAILABLE FIXTURES
                      </div>

                      {fixtures.length > 0 ? (

                        <div className="grid gap-4 sm:grid-cols-2">

                          {fixtures.map(
                            (fixture) => {

                              const homeTeam =
                                fixture.home_team

                              const awayTeam =
                                fixture.away_team

                              return [
                                homeTeam,
                                awayTeam,
                              ].map(
                                (
                                  teamName
                                ) => {

                                  const used =
                                    usedTeams.includes(
                                      teamName
                                    )

                                  return (
                                    <FastPickButton
                                      key={`${fixture.id}-${teamName}`}
                                      entryId={
                                        entry.id
                                      }
                                      teamName={
                                        teamName
                                      }
                                      league={
                                        competition.code
                                      }
                                      used={
                                        used
                                      }
                                    />
                                  )
                                }
                              )
                            }
                          )}

                        </div>

                      ) : (

                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
                          No fixtures are currently
                          available for Round{" "}
                          {
                            currentRound
                          }.
                        </div>

                      )}

                    </div>

                  )}

                </>

              ) : (

                /* PREVIOUS ROUND */

                <>

                  <div>

                    <div className="text-sm font-bold tracking-[0.3em] text-green-400">
                      ROUND{" "}
                      {
                        displayRound
                      }{" "}
                      — COMPLETED
                    </div>

                    <h2 className="mt-2 text-4xl font-black">
                      ROUND HISTORY
                    </h2>

                    <p className="mt-3 text-lg text-slate-400">
                      Everyone's picks are visible
                      because this round has finished.
                    </p>

                  </div>

                  <div className="mt-8 space-y-4">

                    {leaderboard.map(
                      (player) => {

                        const pick =
                          roundPickMap.get(
                            player.id
                          )

                        let statusLabel =
                          "NO PICK"

                        let statusClass =
                          "text-slate-400"

                        if (pick) {

                          if (
                            pick.result ===
                            "win"
                          ) {

                            statusLabel =
                              "ALIVE"

                            statusClass =
                              "text-green-400"

                          } else if (
                            pick.result ===
                              "loss" ||
                            pick.result ===
                              "draw"
                          ) {

                            statusLabel =
                              "OUT"

                            statusClass =
                              "text-red-400"

                          } else {

                            statusLabel =
                              "PENDING"

                            statusClass =
                              "text-yellow-400"

                          }

                        }

                        return (

                          <div
                            key={
                              player.id
                            }
                            className="rounded-2xl border border-white/10 bg-[#0e141d] p-5"
                          >

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                              <div>

                                <div className="text-xl font-black">
                                  {
                                    player.name
                                  }
                                </div>

                                <div className="mt-2 text-slate-400">

                                  {pick ? (

                                    <>
                                      Picked{" "}
                                      <strong className="text-white">
                                        {
                                          pick.team
                                        }
                                      </strong>
                                    </>

                                  ) : (

                                    "No pick recorded for this round."

                                  )}

                                </div>

                              </div>

                              <div
                                className={`font-black ${statusClass}`}
                              >
                                {
                                  statusLabel
                                }
                              </div>

                            </div>

                            {pick && (

                              <div className="mt-4 border-t border-white/10 pt-4">

                                <div className="flex flex-wrap gap-3 text-sm">

                                  <span className="rounded-full bg-[#202733] px-3 py-1 text-slate-300">
                                    Round{" "}
                                    {
                                      pick.round
                                    }
                                  </span>

                                  {pick.result && (

                                    <span className="rounded-full bg-[#202733] px-3 py-1 text-slate-300">
                                      Result:{" "}
                                      {
                                        pick.result
                                      }
                                    </span>

                                  )}

                                </div>

                              </div>

                            )}

                          </div>

                        )
                      }
                    )}

                  </div>

                </>

              )}

            </div>

          </section>

          {/* SIDEBAR */}

          <aside>

            {/* LEADERBOARD */}

            <div className="rounded-2xl border border-white/10 bg-[#151b25] p-6">

              <div className="flex items-center justify-between">

                <h2 className="text-2xl font-black">
                  LEADERBOARD
                </h2>

                <div className="rounded-full bg-[#202733] px-3 py-1 text-xs font-bold">
                  {
                    leaderboard.filter(
                      (player) =>
                        player.alive
                    ).length
                  }{" "}
                  alive
                </div>

              </div>

              <div className="mt-5 space-y-3">

                {leaderboard.map(
                  (
                    player,
                    index
                  ) => (

                    <div
                      key={
                        player.id
                      }
                      className="rounded-xl bg-[#1c222d] p-4"
                    >

                      <div className="flex items-center gap-4">

                        <div className="text-slate-500">
                          {
                            index + 1
                          }
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="font-bold">
                            {
                              player.name
                            }
                          </div>

                          <div className="text-sm text-slate-400">
                            {
                              player.picks.length
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

            {/* ROUND HISTORY */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#151b25] p-6">

              <div className="text-xs font-bold tracking-[0.25em] text-green-400">
                ROUND HISTORY
              </div>

              <h2 className="mt-2 text-2xl font-black">
                View previous rounds
              </h2>

              <p className="mt-3 text-slate-400">
                Previous round picks are visible.
                Current round picks remain private.
              </p>

              <div className="mt-5 space-y-2">

                {Array.from(
                  {
                    length:
                      currentRound,
                  },
                  (_, index) =>
                    currentRound -
                    index
                ).map(
                  (round) => {

                    const active =
                      round ===
                      displayRound

                    return (

                      <Link
                        key={round}
                        href={`/?league=${encodeURIComponent(
                          competition.code
                        )}&round=${round}`}
                        prefetch={false}
                        className={`block rounded-xl px-4 py-3 font-bold transition ${
                          active
                            ? "bg-green-400 text-[#07110b]"
                            : "bg-[#202733] text-slate-300 hover:text-white"
                        }`}
                      >

                        <div className="flex items-center justify-between">

                          <span>
                            Round{" "}
                            {round}
                          </span>

                          {round ===
                            currentRound && (
                            <span className="text-xs uppercase">
                              Current
                            </span>
                          )}

                        </div>

                      </Link>

                    )
                  }
                )}

              </div>

            </div>

            {/* RULES */}

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

                <li>
                  • Current round picks are
                  private.
                </li>

                <li>
                  • Completed round picks are
                  visible to everyone.
                </li>

              </ul>

            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}
