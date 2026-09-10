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
 * HOME / BRAND
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
        className={`flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-[#202733]/90 text-white shadow-lg transition group-hover:border-green-400 ${
          compact ? "h-10 w-10" : "h-12 w-12"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={compact ? "h-5 w-5" : "h-6 w-6"}
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      </span>

      <div className="min-w-0">
        <div className="text-[10px] font-black tracking-[0.34em] text-green-400 sm:text-xs">
          PREMIER LEAGUE
        </div>

        <h1
          className={
            compact
              ? "mt-0.5 text-xl font-black tracking-tight sm:text-2xl"
              : "mt-0.5 text-2xl font-black tracking-tight sm:text-3xl"
          }
        >
          LAST MAN STANDING
        </h1>

        {!compact && (
          <div className="mt-1 text-[10px] font-black tracking-[0.3em] text-slate-400 sm:text-xs">
            PICK. WIN. SURVIVE.
          </div>
        )}
      </div>
    </Link>
  )
}

/*
 * ------------------------------------------------------------
 * STADIUM HERO BACKDROP
 * ------------------------------------------------------------
 */

function StadiumBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050b12]"
    >
      <img
        src="/stadium-hero-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(90deg,rgba(3,7,12,0.72),rgba(3,7,12,0.18)_55%,rgba(3,7,12,0.62))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,12,0.32),transparent_42%,rgba(3,7,12,0.84))]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050b12] to-transparent" />
    </div>
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

          <div className="rounded-2xl border border-white/10 bg-[#151b25] p-7">

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
    <div className="rounded-2xl border border-white/10 bg-[#101821] p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black tracking-[0.3em] text-green-400 sm:text-xs">
            ROUND HISTORY
          </div>

          <div className="mt-1 text-base font-black sm:text-lg">
            {viewingCurrentRound
              ? `Round ${currentRound} — Current`
              : `Round ${displayRound} — Completed`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          {displayRound > 1 ? (
            <Link
              href={`/?league=${encodeURIComponent(
                competition.code
              )}&round=${displayRound - 1}`}
              prefetch={false}
              className="rounded-xl border border-white/10 bg-[#202733] px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:border-green-400"
            >
              ← ROUND {displayRound - 1}
            </Link>
          ) : (
            <span className="rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 text-center text-sm font-black text-slate-600">
              ← PREVIOUS
            </span>
          )}

          {displayRound < currentRound ? (
            <Link
              href={`/?league=${encodeURIComponent(
                competition.code
              )}&round=${displayRound + 1}`}
              prefetch={false}
              className="rounded-xl border border-white/10 bg-[#202733] px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:border-green-400"
            >
              ROUND {displayRound + 1} →
            </Link>
          ) : (
            <span className="rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 text-center text-sm font-black text-slate-600">
              CURRENT ROUND
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/*
 * ------------------------------------------------------------
 * CRITICAL GAME CONTENT
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
  const [picks, fixtures] =
    await Promise.all([
      getPicks(entry.id),
      viewingCurrentRound
        ? getFixtures(currentRound)
        : Promise.resolve([]),
    ])

  const currentPick =
    picks.find(
      (pick) =>
        pick.round === currentRound
    )

  const usedTeams =
    picks.map(
      (pick) => pick.team
    )

  return (
    <section>
      {viewingCurrentRound ? (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#101821] p-5 shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />

            <div className="relative">
              <div className="text-xs font-black tracking-[0.3em] text-green-400 sm:text-sm">
                ROUND {currentRound} — CURRENT
              </div>

              <h2 className="mt-2 max-w-4xl text-4xl font-black uppercase leading-[0.94] tracking-tight sm:text-5xl lg:text-6xl">
                {currentPick
                  ? "YOUR PICK IS LOCKED"
                  : "WHO WILL YOU PICK?"}
              </h2>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
                {currentPick
                  ? "Your team is locked in. Now sit back and see if they get the win."
                  : `Choose ONE team to survive Round ${currentRound}. Pick wisely, you can only use each team once.`}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-4 py-2 text-xs font-black tracking-wide ${
                    entry.alive
                      ? "border-green-400/40 bg-green-400/10 text-green-400"
                      : "border-red-400/30 bg-red-400/10 text-red-400"
                  }`}
                >
                  {entry.alive ? "ALIVE" : "OUT"}
                </span>

                <span className="rounded-full border border-white/10 bg-[#202733] px-4 py-2 text-xs font-black tracking-wide text-slate-300">
                  {entry.name}
                </span>

                <span className="rounded-full border border-white/10 bg-[#202733] px-4 py-2 text-xs font-black tracking-wide text-slate-300">
                  CODE · {competition.code}
                </span>
              </div>
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
        <div className="rounded-3xl border border-white/10 bg-[#101821] p-5 sm:p-7">
          <PreviousRoundContent
            competition={competition}
            displayRound={displayRound}
            currentRound={currentRound}
          />
        </div>
      )}
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
      <main className="min-h-screen bg-[#080d14] text-white">
        <header className="border-b border-white/10 bg-[#0d131d]">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <HomeLink compact />
          </div>
        </header>

        <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center">
            <h2 className="text-3xl font-black">
              League not found
            </h2>

            <p className="mt-3 text-slate-300">
              The league code could not be found.
              Please check the league link and try
              again.
            </p>

            <Link
              href="/?home=true"
              className="mt-6 inline-flex rounded-xl bg-green-400 px-5 py-3 font-black text-[#07110b]"
            >
              BACK TO HOME
            </Link>
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

  if (!entry) {
    return (
      <main className="min-h-screen bg-[#080d14] text-white">
        <header className="border-b border-white/10 bg-[#0d131d]">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <HomeLink compact />
          </div>
        </header>

        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111923] shadow-2xl">
            <div className="bg-[#101a18] p-6 sm:p-8">
              <div className="text-xs font-black tracking-[0.3em] text-green-400">
                JOIN LEAGUE
              </div>

              <h2 className="mt-2 break-words text-4xl font-black uppercase sm:text-5xl">
                {competition.name}
              </h2>

              <div className="mt-4 inline-flex rounded-full bg-[#202733] px-3 py-1 text-xs font-black tracking-wide text-slate-300">
                LEAGUE CODE · {competition.code}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-base leading-7 text-slate-300">
                Enter your name to join this Last Man
                Standing competition.
              </p>

              {joinError === "name-taken" && (
                <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                  <div className="text-sm font-black tracking-wide text-red-300">
                    PLAYER NAME ALREADY TAKEN
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Someone has already joined this
                    league using that name. Please
                    choose a different name.
                  </p>
                </div>
              )}

              {joinError === "join-error" && (
                <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
                  <div className="text-sm font-black tracking-wide text-red-300">
                    UNABLE TO JOIN LEAGUE
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    We couldn't join you to this
                    league. Please try again.
                  </p>
                </div>
              )}

              <form
                action={joinAction}
                className="mt-7 space-y-5"
              >
                <input
                  type="hidden"
                  name="league"
                  value={competition.code}
                />

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-300">
                    YOUR NAME
                  </label>

                  <input
                    name="name"
                    required
                    maxLength={40}
                    placeholder="e.g. Rob"
                    autoComplete="name"
                    className="w-full rounded-2xl border border-white/10 bg-[#0b1119] px-5 py-4 text-lg text-white outline-none transition focus:border-green-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-green-400 px-5 py-5 text-lg font-black text-[#07110b] transition hover:bg-green-300"
                >
                  JOIN LEAGUE
                </button>
              </form>
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
    displayRound === currentRound

  return (
    <main className="min-h-screen bg-[#080d14] text-white">
      {/* STADIUM HERO */}

      <header className="relative min-h-[500px] overflow-hidden border-b border-white/10 sm:min-h-[560px]">
        <StadiumBackdrop />

        <div className="relative mx-auto flex min-h-[500px] max-w-7xl flex-col px-4 pb-10 pt-6 sm:min-h-[560px] sm:px-6 sm:pb-12 sm:pt-7">
          <div className="flex items-start justify-between gap-5">
            <HomeLink />

            <div className="hidden rounded-full border border-white/10 bg-black/35 px-4 py-2 text-right backdrop-blur sm:block">
              <div className="text-[10px] font-black tracking-[0.3em] text-green-400">
                YOUR LEAGUE
              </div>
              <div className="mt-0.5 max-w-[220px] truncate text-sm font-black text-white">
                {competition.name}
              </div>
            </div>
          </div>

          <div className="relative mt-auto grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="max-w-4xl">
              <div className="text-xs font-black tracking-[0.34em] text-green-400 sm:text-sm">
                {competition.name.toUpperCase()} · ROUND {currentRound}
              </div>

              <h2
                className="mt-3 max-w-4xl text-6xl font-black uppercase italic leading-[0.82] tracking-[-0.045em] text-white drop-shadow-[0_5px_20px_rgba(0,0,0,0.7)] sm:text-7xl lg:text-[8.5rem]"
                style={{
                  fontFamily:
                    '"Brush Script MT","Segoe Print","Comic Sans MS",cursive',
                  transform: "rotate(-2deg)",
                  transformOrigin: "left center",
                }}
              >
                WHO WILL
                <br />
                <span className="text-green-400">
                  YOU PICK?
                </span>
              </h2>

              <div className="mt-6 text-sm font-black tracking-[0.32em] text-white sm:text-base">
                PICK. WIN. SURVIVE.
              </div>

              <p className="mt-3 max-w-2xl text-base leading-6 text-slate-200 sm:text-lg">
                Choose one team to survive the round.
                Pick wisely, you can only use each team once.
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="relative ml-auto w-[270px] rotate-[2deg] border-4 border-[#1b2025] bg-[#0a0e12] px-5 py-6 shadow-2xl">
                <div className="absolute -left-2 top-0 h-full w-2 bg-[#252a30]" />
                <div className="text-right text-3xl font-black italic leading-[0.95] text-white">
                  CAN YOU BE
                  <br />
                  THE LAST MAN
                  <br />
                  <span className="text-green-400">
                    STANDING?
                  </span>
                </div>
                <div className="mt-4 h-1 w-32 bg-green-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* GAME STATUS / SHARING BAR */}

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7">
        <section className="rounded-3xl border border-white/10 bg-[#0b131d]/95 p-3 shadow-2xl backdrop-blur sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[0.75fr_1fr_1.35fr_1fr_1.15fr] lg:divide-x lg:divide-white/10">
            <div className="rounded-2xl bg-[#111a25] px-3 py-3 text-center lg:rounded-none lg:bg-transparent lg:px-5">
              <div className="text-[10px] font-black tracking-[0.25em] text-green-400 sm:text-xs">
                ROUND
              </div>
              <div className="mt-1 text-3xl font-black">
                {currentRound}
              </div>
              <div className="text-xs text-slate-400">
                {viewingCurrentRound ? "Current" : "Completed"}
              </div>
            </div>

            <div className="rounded-2xl bg-[#111a25] px-3 py-3 text-center lg:rounded-none lg:bg-transparent lg:px-5">
              <div className="text-[10px] font-black tracking-[0.25em] text-green-400 sm:text-xs">
                YOUR STATUS
              </div>
              <div
                className={`mx-auto mt-2 inline-flex rounded-full border px-4 py-2 text-sm font-black ${
                  entry.alive
                    ? "border-green-400 text-green-400"
                    : "border-red-400 text-red-400"
                }`}
              >
                {entry.alive ? "ALIVE" : "OUT"}
              </div>
            </div>

            <div className="col-span-2 rounded-2xl bg-[#111a25] px-3 py-3 text-center sm:col-span-1 lg:rounded-none lg:bg-transparent lg:px-5">
              <div className="text-[10px] font-black tracking-[0.25em] text-green-400 sm:text-xs">
                YOUR LEAGUE
              </div>
              <div className="mt-2 truncate text-lg font-black sm:text-xl">
                {competition.name}
              </div>
            </div>

            <div className="rounded-2xl bg-[#111a25] px-3 py-3 text-center lg:rounded-none lg:bg-transparent lg:px-5">
              <div className="text-[10px] font-black tracking-[0.25em] text-green-400 sm:text-xs">
                LEAGUE CODE
              </div>
              <div className="mt-2 text-xl font-black sm:text-2xl">
                {competition.code}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-center rounded-2xl bg-[#111a25] px-2 py-2 lg:col-span-1 lg:rounded-none lg:bg-transparent lg:px-3">
              <ShareLeagueButton
                leagueName={competition.name}
                leagueCode={competition.code}
              />
            </div>
          </div>
        </section>
        <div className="mt-5">
          <RoundNavigation
            competition={competition}
            currentRound={currentRound}
            displayRound={displayRound}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <Suspense
            fallback={
              <section>
                <div className="rounded-3xl border border-white/10 bg-[#101821] p-6">
                  <div className="h-4 w-40 animate-pulse rounded bg-[#202733]" />
                  <div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded bg-[#202733]" />
                  <div className="mt-7 space-y-3">
                    {Array.from({ length: 6 }).map(
                      (_, index) => (
                        <div
                          key={index}
                          className="h-24 animate-pulse rounded-2xl bg-[#202733]"
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

          <Suspense
            fallback={
              <aside>
                <div className="rounded-3xl border border-white/10 bg-[#101821] p-6">
                  <div className="h-8 w-48 animate-pulse rounded bg-[#202733]" />
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: 5 }).map(
                      (_, index) => (
                        <div
                          key={index}
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
              currentRound={currentRound}
              displayRound={displayRound}
            />
          </Suspense>
        </div>

        <div className="mt-5 rounded-2xl border border-white/5 bg-[#0d141d] px-4 py-4 text-center text-xs leading-5 text-slate-500 sm:text-sm">
          Pick one team before the round deadline.
          Once saved, your pick is locked.
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
