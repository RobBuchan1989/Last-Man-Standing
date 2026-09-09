"use client"

import { useEffect, useMemo, useState } from "react"
import ShareLeague from "@/app/components/ShareLeague"
import FastPickButton from "@/app/components/FastPickButton"
import PickDeadline from "@/app/components/PickDeadline"

const PICK_EVENT = "lms-pick-selected"
const CLEAR_EVENT = "lms-pick-cleared"

type Fixture = {
  id: string
  home_team: string
  away_team: string
  kickoff: string
  status: string
}

type Entry = {
  id: string
  name: string
  alive: boolean
}

type Competition = {
  code: string
  name: string
  round: number
}

type Pick = {
  id: string
  entry_id: string
  round: number
  team: string
  result?: string | null
}

type Props = {
  competition: Competition
  entry: Entry
  fixtures: Fixture[]
  usedTeams: string[]
  currentPick?: Pick | null
}

function formatKickoff(kickoff: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(kickoff))
  } catch {
    return kickoff
  }
}

function fixtureHasStarted(fixture: Fixture) {
  const kickoff = new Date(fixture.kickoff).getTime()

  return (
    Number.isFinite(kickoff) &&
    Date.now() >= kickoff
  )
}

export default function CurrentRoundPick({
  competition,
  entry,
  fixtures,
  usedTeams,
  currentPick,
}: Props) {
  const [selectedTeam, setSelectedTeam] =
    useState<string | null>(
      currentPick?.team || null
    )

  const [openFixtureId, setOpenFixtureId] =
    useState<string | null>(
      fixtures[0]?.id || null
    )

  useEffect(() => {
    if (currentPick?.team) {
      setSelectedTeam(currentPick.team)
    }
  }, [currentPick?.team])

  useEffect(() => {
    if (!openFixtureId && fixtures[0]?.id) {
      setOpenFixtureId(fixtures[0].id)
    }
  }, [fixtures, openFixtureId])

  useEffect(() => {
    const handlePickSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ teamName: string }>

      const teamName =
        customEvent.detail?.teamName

      if (teamName) {
        setSelectedTeam(teamName)
      }
    }

    const handlePickCleared = () => {
      if (!currentPick?.team) {
        setSelectedTeam(null)
      }
    }

    window.addEventListener(
      PICK_EVENT,
      handlePickSelected
    )

    window.addEventListener(
      CLEAR_EVENT,
      handlePickCleared
    )

    return () => {
      window.removeEventListener(
        PICK_EVENT,
        handlePickSelected
      )

      window.removeEventListener(
        CLEAR_EVENT,
        handlePickCleared
      )
    }
  }, [currentPick?.team])

  const deadline = useMemo(() => {
    const times = fixtures
      .map((fixture) =>
        new Date(fixture.kickoff).getTime()
      )
      .filter((time) =>
        Number.isFinite(time)
      )

    return times.length
      ? Math.min(...times)
      : null
  }, [fixtures])

  const deadlinePassed =
    deadline !== null &&
    Date.now() >= deadline

  const selectedFixture =
    selectedTeam
      ? fixtures.find(
          (fixture) =>
            fixture.home_team === selectedTeam ||
            fixture.away_team === selectedTeam
        )
      : null

  const selectedOpponent =
    selectedFixture
      ? selectedFixture.home_team === selectedTeam
        ? selectedFixture.away_team
        : selectedFixture.home_team
      : null

  const selectedVenue =
    selectedFixture
      ? selectedFixture.home_team === selectedTeam
        ? "HOME"
        : "AWAY"
      : null

  if (selectedTeam) {
    return (
      <>
        <div className="mt-6 overflow-hidden rounded-3xl border border-green-400/30 bg-gradient-to-br from-green-400/15 via-green-400/5 to-transparent p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-400 text-xl font-black text-[#07110b]">
              ✓
            </div>

            <div className="min-w-0">
              <div className="text-[10px] font-black tracking-[0.3em] text-green-400 sm:text-xs">
                ROUND {competition.round} · PICK LOCKED
              </div>

              <div className="mt-2 break-words text-2xl font-black uppercase sm:text-3xl">
                {selectedTeam}
              </div>

              {selectedOpponent &&
                selectedVenue && (
                  <div className="mt-1 text-sm font-bold text-slate-300">
                    {selectedVenue} · vs {selectedOpponent}
                  </div>
                )}

              <div className="mt-3 text-sm text-slate-400">
                Your pick is locked. Good luck!
              </div>
            </div>
          </div>
        </div>

        <ShareLeague
          leagueCode={competition.code}
          leagueName={competition.name}
        />
      </>
    )
  }

  if (!entry.alive) {
    return (
      <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <div className="text-2xl font-black text-red-400">
          YOU ARE OUT
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.25em] text-green-400">
            SELECT ONE FIXTURE
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Tap a fixture to open it, then choose your team.
          </div>
        </div>

        <PickDeadline fixtures={fixtures} />
      </div>

      {fixtures.length > 0 ? (
        <div className="space-y-3">
          {fixtures.map((fixture, index) => {
            const isOpen =
              openFixtureId === fixture.id

            const started =
              fixtureHasStarted(fixture)

            const homeUsed =
              usedTeams.includes(
                fixture.home_team
              )

            const awayUsed =
              usedTeams.includes(
                fixture.away_team
              )

            return (
              <div
                key={fixture.id}
                className={`overflow-hidden rounded-2xl border transition ${
                  isOpen
                    ? "border-green-400/30 bg-[#111923]"
                    : "border-white/10 bg-[#0f161f]"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFixtureId(
                      isOpen
                        ? null
                        : fixture.id
                    )
                  }
                  className="w-full px-4 py-4 text-left sm:px-5"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#202733] text-xs font-black text-slate-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        <span>FIXTURE</span>
                        <span>•</span>
                        <span>{formatKickoff(fixture.kickoff)}</span>

                        {started && (
                          <>
                            <span>•</span>
                            <span className="text-red-400">
                              STARTED
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-black text-white sm:text-lg">
                          {fixture.home_team}
                        </span>
                        <span className="shrink-0 rounded-full border border-white/10 bg-[#202733] px-2 py-0.5 text-[9px] font-black tracking-widest text-slate-500">
                          VS
                        </span>
                        <span className="truncate text-base font-black text-white sm:text-lg">
                          {fixture.away_team}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg font-black transition ${
                        isOpen
                          ? "rotate-180 border-green-400/40 bg-green-400/10 text-green-400"
                          : "border-white/10 bg-[#202733] text-slate-400"
                      }`}
                    >
                      ↓
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 p-3 sm:p-4">
                    <div className="mb-3 rounded-xl bg-[#0b1119] px-4 py-3 text-center text-xs font-bold text-slate-400">
                      WHO WILL YOU PICK?
                    </div>

                    <div className="space-y-3">
                      <FastPickButton
                        entryId={entry.id}
                        teamName={fixture.home_team}
                        league={competition.code}
                        used={homeUsed}
                        opponent={fixture.away_team}
                        venue="HOME"
                        deadlinePassed={deadlinePassed}
                      />

                      <div className="flex items-center gap-3 px-2">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[10px] font-black tracking-[0.25em] text-slate-600">
                          OR
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>

                      <FastPickButton
                        entryId={entry.id}
                        teamName={fixture.away_team}
                        league={competition.code}
                        used={awayUsed}
                        opponent={fixture.home_team}
                        venue="AWAY"
                        deadlinePassed={deadlinePassed}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
          No fixtures are currently available for Round{" "}
          {competition.round}.
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-white/5 bg-[#0d141d] p-4 text-center text-xs leading-5 text-slate-500">
        Open a fixture above to choose your team. Only one pick
        can be made this round.
      </div>
    </div>
  )
}
