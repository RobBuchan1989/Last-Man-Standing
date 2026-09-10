import Link from "next/link"
import { Suspense } from "react"

import CurrentRoundPick from "@/app/components/CurrentRoundPick"
import LeagueReturnButton from "@/app/components/LeagueReturnButton"
import ShareLeagueButton from "@/app/components/ShareLeagueButton"
import LiveLeaderboard from "@/app/components/LiveLeaderboard"

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
    joinError?: string | string[]
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

  const { redirect } =
    await import("next/navigation")

  try {
    await joinCompetition(
      name,
      league
    )

    redirect(
      `/?league=${encodeURIComponent(
        league
      )}`
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ""

    if (
      message.includes(
        "already taken"
      )
    ) {
      redirect(
        `/?league=${encodeURIComponent(
          league
        )}&joinError=name-taken`
      )
    }

    redirect(
      `/?league=${encodeURIComponent(
        league
      )}&joinError=join-error`
    )
  }
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
      className="group flex items-center gap-3"
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
 * HOME PAGE
 * ------------------------------------------------------------
 */

async function HomePage() {
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

                        <LeagueReturnButton
                          href={`/?league=${encodeURIComponent(
                            competition.code
                          )}`}
                        />

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
 * ------------------------------------------------------------
 * LEAGUE LOADING FALLBACK
 * ------------------------------------------------------------
 */

function LeagueLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">

      <div className="mb-6 rounded-2xl border border-white/10 bg-[#151b25] p-5">

        <div className="h-4 w-32 animate-pulse rounded bg-[#202733]" />

        <div className="mt-3 h-6 w-56 animate-pulse rounded bg-[#202733]" />

      </div>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">

        <section>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151b25] p-5 sm:p-7">

            <div className="h-4 w-40 animate-pulse rounded bg-[#202733]" />

            <div className="mt-4 h-10 w-80 animate-pulse rounded bg-[#202733]" />

            <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-[#202733]" />

            <div className="mt-8 space-y-3">

              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-[#202733]"
                />
              ))}

            </div>

          </div>

        </section>

        <aside>

          <div className="rounded-2xl border border-white/10 bg-[#151b25] p-6">

            <div className="h-8 w-48 animate-pulse rounded bg-[#202733]" />

            <div className="mt-5 space-y-3">

              {Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-[#202733]"
                />
              ))}

            </div>

          </div>

        </aside>

      </div>

    </div>
  )
}

/*
 * ------------------------------------------------------------
 * ROUND NAVIGATION
 * ------------------------------------------------------------
 */

function RoundNavigation({
  competition,
  currentRound,
  displayRound,
}: {
  competition: any
  currentRound: number
  displayRound: number
}) {
  const viewingCurrentRound =
    displayRound === currentRound

  return (
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
  )
}

/*
 * ------------------------------------------------------------
 * CRITICAL GAME CONTENT
 *
 * This is deliberately separate from leaderboard/history.
 * The player should not have to wait for those queries before
 * seeing their actual game.
 * ------------------------------------------------------------
 */

async function CriticalLeagueContent({
  competition,
  entry,
  displayRound,
  currentRound,
  viewingCurrentRound,
}: {
  competition: any
  entry: any
  displayRound: number
  currentRound: number
  viewingCurrentRound: boolean
}) {
  const [
    picks,
    fixtures,
  ] = await Promise.all([
    getPicks(entry.id),

    viewingCurrentRound
      ? getFixtures(
          currentRound
        )
      : Promise.resolve([]),
  ])

  const currentPick =
    picks.find(
      (pick) =>
        pick.round ===
        currentRound
    )

  const usedTeams =
    picks.map(
      (pick) =>
        pick.team
    )

  return (
    <section>

      <div className="rounded-2xl border border-white/10 bg-[#151b25] p-4 sm:p-7">

        {viewingCurrentRound ? (

          <>

            <div className="min-w-0">
              <div className="text-xs font-black tracking-[0.28em] text-green-400 sm:text-sm">
                ROUND {currentRound} — CURRENT
              </div>

              <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
                WHO WILL YOU PICK?
              </h2>

              <p className="mt-3 max-w-3xl text-base leading-6 text-slate-400 sm:text-lg">
                Choose ONE team to survive Round {currentRound}. Pick wisely, you can only use each team once.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-green-400/50 bg-green-400/10 px-4 py-2 text-xs font-black text-green-400">
                  {entry.alive ? "ALIVE" : "OUT"}
                </span>
                <span className="rounded-full bg-[#202733] px-4 py-2 text-xs font-black text-slate-300">
                  {entry.name}
                </span>
                <span className="rounded-full bg-[#202733] px-4 py-2 text-xs font-black text-slate-300">
                  CODE · {competition.code}
                </span>
              </div>
            </div>

            <CurrentRoundPick
              competition={competition}
              entry={entry}
              fixtures={fixtures}
              usedTeams={usedTeams}
              currentPick={
                currentPick || null
              }
            />

          </>

        ) : (

          <PreviousRoundContent
            competition={competition}
            displayRound={displayRound}
            currentRound={currentRound}
          />

        )}

      </div>

    </section>
  )
}

/*
 * ------------------------------------------------------------
 * PREVIOUS ROUND CONTENT
 * ------------------------------------------------------------
 */

async function PreviousRoundContent({
  competition,
  displayRound,
  currentRound,
}: {
  competition: any
  displayRound: number
  currentRound: number
}) {
  const [
    leaderboard,
    roundPicks,
  ] = await Promise.all([
    getLeaderboard(
      competition.code
    ),

    getRoundPicks(
      displayRound,
      competition.code
    ),
  ])

  const roundPickMap =
    new Map(
      roundPicks.map(
        (pick) => [
          pick.entry_id,
          pick,
        ]
      )
    )

  return (
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
  )
}

/*
 * ------------------------------------------------------------
 * SIDEBAR
 *
 * Loaded separately so it does not block the game.
 * ------------------------------------------------------------
 */

async function LeagueSidebar({
  competition,
  currentRound,
  displayRound,
}: {
  competition: any
  currentRound: number
  displayRound: number
}) {
  const leaderboard =
    await getLeaderboard(
      competition.code
    )

  return (
    <aside>

      {/* LEADERBOARD */}

      <LiveLeaderboard
        leaderboard={leaderboard}
        currentRound={currentRound}
        leagueCode={competition.code}
      />

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
  )
}

/*
 * ------------------------------------------------------------
 * LEAGUE PAGE
 *
 * Competition + player entry are loaded once.
 * Critical game and sidebar are then separated.
 * ------------------------------------------------------------
 */

async function LeaguePage({
  leagueCode,
  requestedRound,
  joinError,
}: {
  leagueCode: string
  requestedRound?: number
  joinError?: string
}) {
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

  const entry =
    await getCurrentEntry(
      competition.code,
      false
    )

  /*
   * JOIN SCREEN
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

            {joinError ===
              "name-taken" && (
              <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                <div className="text-lg font-black text-red-300">
                  PLAYER NAME ALREADY TAKEN
                </div>

                <p className="mt-2 text-slate-300">
                  Someone has already joined this
                  league using that name. Please
                  choose a different name.
                </p>
              </div>
            )}

            {joinError ===
              "join-error" && (
              <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                <div className="text-lg font-black text-red-300">
                  UNABLE TO JOIN LEAGUE
                </div>

                <p className="mt-2 text-slate-300">
                  We couldn't join you to this
                  league. Please check the details
                  and try again.
                </p>
              </div>
            )}

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

  const currentRound =
    competition.round

  const displayRound =
    requestedRound &&
    requestedRound <= currentRound
      ? requestedRound
      : currentRound

  const viewingCurrentRound =
    displayRound ===
    currentRound

  return (
    <main className="min-h-screen bg-[#0b1018] text-white">

      {/* HERO */}

      <section className="relative isolate overflow-hidden border-b border-white/10">
        <img
          src="/stadium-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#06111a]/35" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,10,17,0.95)_0%,rgba(3,10,17,0.78)_38%,rgba(3,10,17,0.34)_72%,rgba(3,10,17,0.18)_100%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(3,10,17,0.24)_0%,rgba(3,10,17,0.06)_55%,rgba(3,10,17,0.82)_100%)]" />

        <div className="mx-auto max-w-7xl px-4 pb-7 pt-5 sm:px-6 sm:pb-10 sm:pt-7 lg:px-8">
          <HomeLink />

          <div className="mt-8 grid min-w-0 items-center gap-6 sm:mt-10 sm:gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-[0.28em] text-green-400 sm:text-sm">
                {competition.name.toUpperCase()} · ROUND {currentRound}
              </div>

              <h2 className="mt-3 max-w-3xl text-[3rem] font-black uppercase leading-[0.86] tracking-[-0.045em] text-white sm:text-6xl lg:text-8xl">
                WHO WILL
                <br />
                YOU <span className="text-green-400">PICK?</span>
              </h2>

              <div className="mt-5 text-xs font-black tracking-[0.28em] text-white sm:text-base">
                PICK. WIN. SURVIVE.
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-5 text-slate-200 sm:text-lg sm:leading-6">
                Choose one team to survive the round. Pick wisely, you can only use each team once.
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="relative rounded-xl border-2 border-white/30 bg-[#07111b]/75 p-6 shadow-2xl backdrop-blur-sm">
                <div className="absolute inset-2 rounded-lg border border-white/10" />
                <div className="relative text-center">
                  <div className="text-2xl font-black uppercase leading-tight text-green-400">
                    CAN YOU BE
                    <br />
                    THE LAST MAN
                    <br />
                    STANDING?
                  </div>
                  <div className="mt-5 text-xs font-black tracking-[0.25em] text-slate-400">
                    PREMIER LEAGUE
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <div className="inline-flex rounded-lg border border-green-400/30 bg-[#07111b]/80 px-4 py-2 backdrop-blur-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.08em] text-green-400 sm:text-sm">
                  CAN YOU BE THE LAST MAN STANDING?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAGUE STATUS BAR */}

      <section className="border-b border-white/10 bg-[#080f17]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid min-w-0 grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#101923] p-2 sm:gap-3 sm:p-3 lg:grid-cols-[1fr_1fr_1.45fr_1fr_1fr_1fr]">
            <div className="min-w-0 rounded-xl bg-[#151f2b] px-3 py-3 text-center sm:px-4 sm:py-4">
              <div className="text-[9px] font-black tracking-[0.22em] text-green-400 sm:text-[10px]">ROUND</div>
              <div className="mt-1 text-2xl font-black sm:text-3xl">{currentRound}</div>
              <div className="text-[10px] text-slate-500 sm:text-xs">Current</div>
            </div>

            <div className="min-w-0 rounded-xl bg-[#151f2b] px-3 py-3 text-center sm:px-4 sm:py-4">
              <div className="text-[9px] font-black tracking-[0.22em] text-green-400 sm:text-[10px]">YOUR STATUS</div>
              <div className="mt-2 inline-flex rounded-full border border-green-400 px-3 py-1 text-xs font-black text-green-400 sm:px-4 sm:py-1.5 sm:text-sm">
                {entry.alive ? "ALIVE" : "OUT"}
              </div>
            </div>

            <div className="min-w-0 rounded-xl bg-[#151f2b] px-3 py-3 text-center sm:px-4 sm:py-4">
              <div className="text-[9px] font-black tracking-[0.22em] text-green-400 sm:text-[10px]">YOUR LEAGUE</div>
              <div className="mt-2 truncate text-base font-black text-white sm:text-xl">{competition.name}</div>
            </div>

            <div className="min-w-0 rounded-xl bg-[#151f2b] px-3 py-3 text-center sm:px-4 sm:py-4">
              <div className="text-[9px] font-black tracking-[0.22em] text-green-400 sm:text-[10px]">LEAGUE CODE</div>
              <div className="mt-2 text-base font-black text-white sm:text-xl">{competition.code}</div>
            </div>

            <div className="col-span-2 flex min-w-0 gap-2 lg:col-span-2">
              <ShareLeagueButton
                leagueName={competition.name}
                leagueCode={competition.code}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl min-w-0 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-8 lg:px-8">

        {/* ROUND NAVIGATION */}

        <RoundNavigation
          competition={competition}
          currentRound={currentRound}
          displayRound={displayRound}
        />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] lg:gap-8">

          {/* CRITICAL GAME */}

          <Suspense
            fallback={
              <section>

                <div className="rounded-2xl border border-white/10 bg-[#151b25] p-7">

                  <div className="h-4 w-40 animate-pulse rounded bg-[#202733]" />

                  <div className="mt-4 h-10 w-80 animate-pulse rounded bg-[#202733]" />

                  <div className="mt-8 space-y-3">

                    {Array.from({
                      length: 6,
                    }).map(
                      (_, index) => (
                        <div
                          key={
                            index
                          }
                          className="h-20 animate-pulse rounded-2xl bg-[#202733]"
                        />
                      )
                    )}

                  </div>

                </div>

              </section>
            }
          >
            <CriticalLeagueContent
              competition={competition}
              entry={entry}
              displayRound={displayRound}
              currentRound={currentRound}
              viewingCurrentRound={
                viewingCurrentRound
              }
            />
          </Suspense>

          {/* SECONDARY DATA */}

          <Suspense
            fallback={
              <aside>

                <div className="rounded-2xl border border-white/10 bg-[#151b25] p-6">

                  <div className="h-8 w-48 animate-pulse rounded bg-[#202733]" />

                  <div className="mt-5 space-y-3">

                    {Array.from({
                      length: 5,
                    }).map(
                      (_, index) => (
                        <div
                          key={
                            index
                          }
                          className="h-16 animate-pulse rounded-xl bg-[#202733]"
                        />
                      )
                    )}

                  </div>

                </div>

              </aside>
            }
          >
            <LeagueSidebar
              competition={competition}
              currentRound={
                currentRound
              }
              displayRound={
                displayRound
              }
            />
          </Suspense>

        </div>

      </div>

    </main>
  )
}

/*
 * ------------------------------------------------------------
 * MAIN PAGE
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

  const joinError =
    typeof params?.joinError ===
    "string"
      ? params.joinError
      : Array.isArray(
            params?.joinError
          )
        ? params.joinError[0]
        : undefined

  if (
    explicitHomePage ||
    !leagueCode
  ) {
    return (
      <HomePage />
    )
  }

  return (
    <LeaguePage
      leagueCode={
        leagueCode
      }
      requestedRound={
        requestedRound
      }
      joinError={
        joinError
      }
    />
  )
}
