"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type Team = {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

type Props = {
  competition: any
  entry: any
  teams: Team[]
  picks: any[]
  leaderboard: any[]
  fixtures: any[]
}

export function GameDashboard({
  competition,
  entry,
  teams,
  picks,
  leaderboard,
  fixtures,
}: Props) {
  const [error, setError] =
    useState<string | null>(null)

  const [notice, setNotice] =
    useState<string | null>(null)

  const [localPicks, setLocalPicks] =
    useState(picks)

  const [selectedTeamId, setSelectedTeamId] =
    useState<number | null>(null)

  const used = new Set(
    localPicks.map((p) => p.team)
  )

  const current = localPicks.find(
    (p) =>
      p.round === competition.round
  )

  const fixtureByTeam =
    new Map<string, any>()

  fixtures.forEach((f) => {
    fixtureByTeam.set(
      f.home_team,
      f
    )

    fixtureByTeam.set(
      f.away_team,
      f
    )
  })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      )

      setNotice(
        "Join link copied."
      )
    } catch {
      setNotice(
        "Unable to copy link."
      )
    }
  }

  const pick = async (team: Team) => {
    if (
      selectedTeamId !== null ||
      current ||
      !entry.alive
    ) {
      return
    }

    setError(null)
    setNotice(null)

    /*
     * Update the screen immediately.
     *
     * There is deliberately no temporary
     * "locking in" message.
     */

    const optimisticPick = {
      id: `optimistic-${team.id}`,
      team: team.name,
      round: competition.round,
    }

    setSelectedTeamId(team.id)

    setLocalPicks(
      (previous) => [
        ...previous,
        optimisticPick,
      ]
    )

    try {
      const response =
        await fetch(
          "/api/pick",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              teamName:
                team.name,
            }),
          }
        )

      const result =
        await response.json()

      if (
        !response.ok ||
        result.error
      ) {
        throw new Error(
          result.error ||
            "Could not lock in your pick."
        )
      }

      /*
       * The optimistic pick is already displayed,
       * so there is deliberately no router.refresh()
       * here.
       */
    } catch (e) {
      /*
       * If the database rejects the pick,
       * restore the previous state.
       */

      setLocalPicks(
        (previous) =>
          previous.filter(
            (p) =>
              p.id !==
              optimisticPick.id
          )
      )

      setSelectedTeamId(null)

      setError(
        e instanceof Error
          ? e.message
          : "Could not lock in your pick."
      )
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">

        <section className="rounded-lg border border-border bg-card p-5">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>
              <p className="font-display text-xs uppercase tracking-[0.25em] text-primary">
                Round {competition.round}
              </p>

              <h2 className="mt-1 font-display text-3xl font-700 uppercase">
                Choose your winner
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Welcome, {entry.name}. A win keeps you alive. Draw or loss = OUT.
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={copy}
            >
              Copy join link
            </Button>

          </div>

          {current ? (
            <div className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-4">

              <p className="text-xs uppercase tracking-widest text-primary">
                Pick locked
              </p>

              <p className="mt-1 font-display text-2xl uppercase">
                {current.team}
              </p>

              <p className="text-sm text-muted-foreground">
                Waiting for the result.
              </p>

            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">

              {teams.map((t) => {
                const f =
                  fixtureByTeam.get(
                    t.name
                  )

                const locked =
                  used.has(t.name) ||
                  !f ||
                  new Date(
                    f.kickoff
                  ).getTime() <=
                    Date.now() ||
                  [
                    "FINISHED",
                    "IN_PLAY",
                    "PAUSED",
                  ].includes(
                    f.status
                  )

                const selected =
                  selectedTeamId ===
                  t.id

                return (
                  <button
                    key={t.id}
                    disabled={
                      locked ||
                      selectedTeamId !==
                        null ||
                      !entry.alive
                    }
                    onClick={() =>
                      pick(t)
                    }
                    className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                      locked
                        ? "cursor-not-allowed opacity-40"
                        : selected
                        ? "border-primary bg-secondary"
                        : "hover:border-primary hover:bg-secondary"
                    }`}
                  >

                    <img
                      src={t.crest}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />

                    <span className="min-w-0 flex-1">

                      <span className="block font-semibold">
                        {t.name}
                      </span>

                      {f && (
                        <span className="block text-xs text-muted-foreground">
                          {f.home_team} v{" "}
                          {f.away_team}
                        </span>
                      )}

                    </span>

                    <span className="text-xs text-muted-foreground">
                      {used.has(t.name)
                        ? "USED"
                        : !f
                        ? "WAIT"
                        : selected
                        ? ""
                        : "PICK"}
                    </span>

                  </button>
                )
              })}

            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}

          {notice && (
            <p className="mt-4 text-sm text-primary">
              {notice}
            </p>
          )}

          <p className="mt-5 text-xs text-muted-foreground">
            Data provided by football-data.org.
          </p>

        </section>

        <aside className="space-y-5">

          <section className="rounded-lg border border-border bg-card p-5">

            <div className="flex items-center justify-between">

              <h3 className="font-display text-xl uppercase">
                Leaderboard
              </h3>

              <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                {
                  leaderboard.filter(
                    (x) => x.alive
                  ).length
                }{" "}
                alive
              </span>

            </div>

            <div className="mt-4 space-y-2">

              {leaderboard.map(
                (p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-md bg-secondary/60 p-3"
                  >

                    <span className="w-6 text-xs text-muted-foreground">
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">

                      <div className="truncate font-semibold">
                        {p.name}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {p.picks?.length ||
                          0}{" "}
                        picks
                      </div>

                    </div>

                    <span
                      className={
                        p.alive
                          ? "text-primary"
                          : "text-destructive"
                      }
                    >
                      {p.alive
                        ? "ALIVE"
                        : "OUT"}
                    </span>

                  </div>
                )
              )}

            </div>

          </section>

          <section className="rounded-lg border border-border bg-card p-5">

            <h3 className="font-display text-xl uppercase">
              Rules
            </h3>

            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                • One Premier League team per round.
              </li>
              <li>
                • Your team must win.
              </li>
              <li>
                • Draw or loss eliminates you.
              </li>
              <li>
                • You cannot use a team twice.
              </li>
              <li>
                • Picks lock at kick-off.
              </li>
              <li>
                • Last player standing wins.
              </li>
            </ul>

          </section>

        </aside>

      </div>
    </main>
  )
}
