"use client"

import { useEffect, useState } from "react"
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
  const date = new Date(kickoff)
  if (!Number.isFinite(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

export default function CurrentRoundPick({
  competition,
  entry,
  fixtures,
  usedTeams,
  currentPick,
}: Props) {
  const [selectedTeam, setSelectedTeam] =
    useState<string | null>(currentPick?.team || null)

  useEffect(() => {
    if (currentPick?.team) setSelectedTeam(currentPick.team)
  }, [currentPick?.team])

  useEffect(() => {
    const handlePickSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ teamName: string }>
      const teamName = customEvent.detail?.teamName
      if (teamName) setSelectedTeam(teamName)
    }

    const handlePickCleared = () => {
      if (!currentPick?.team) setSelectedTeam(null)
    }

    window.addEventListener(PICK_EVENT, handlePickSelected)
    window.addEventListener(CLEAR_EVENT, handlePickCleared)

    return () => {
      window.removeEventListener(PICK_EVENT, handlePickSelected)
      window.removeEventListener(CLEAR_EVENT, handlePickCleared)
    }
  }, [currentPick?.team])

  const deadline =
    fixtures.length > 0
      ? Math.min(
          ...fixtures
            .map((fixture) => new Date(fixture.kickoff).getTime())
            .filter((time) => Number.isFinite(time))
        )
      : null

  const deadlinePassed =
    deadline !== null && Date.now() >= deadline

  const selectedFixture = selectedTeam
    ? fixtures.find(
        (fixture) =>
          fixture.home_team === selectedTeam ||
          fixture.away_team === selectedTeam
      )
    : null

  const selectedOpponent = selectedFixture
    ? selectedFixture.home_team === selectedTeam
      ? selectedFixture.away_team
      : selectedFixture.home_team
    : null

  const selectedVenue = selectedFixture
    ? selectedFixture.home_team === selectedTeam
      ? "HOME"
      : "AWAY"
    : null

  if (selectedTeam) {
    return (
      <>
        <div className="mt-8 rounded-2xl border-2 border-green-400/50 bg-green-400/10 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-400 text-xl font-black text-[#07110b]">
              ✓
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black tracking-[0.25em] text-green-400">
                YOU'RE LOCKED IN
              </div>

              <div className="mt-1 text-2xl font-black uppercase sm:text-3xl">
                {selectedTeam}
              </div>

              {selectedOpponent && selectedVenue && (
                <div className="mt-1 text-sm font-bold text-slate-300">
                  {selectedVenue} · vs {selectedOpponent}
                </div>
              )}

              <div className="mt-3 text-sm font-black uppercase tracking-wide text-white">
                Round {competition.round} pick saved
              </div>

              <div className="mt-1 text-sm text-slate-400">
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
      <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <div className="text-2xl font-black text-red-400">
          YOU ARE OUT
        </div>
        <p className="mt-2 text-slate-300">
          You are no longer in the competition.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.2em] text-green-400">
            PREMIER LEAGUE FIXTURES
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Choose ONE team to survive Round {competition.round}.
          </div>
        </div>

        <PickDeadline fixtures={fixtures} />
      </div>

      {fixtures.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0e141d] p-3 sm:p-4">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Who will you pick?
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {fixtures.length} fixtures
            </div>
          </div>

          <div className="space-y-3">
            {fixtures.map((fixture) => {
              const homeUsed = usedTeams.includes(fixture.home_team)
              const awayUsed = usedTeams.includes(fixture.away_team)
              const kickoff = formatKickoff(fixture.kickoff)

              return (
                <div
                  key={fixture.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#151b25]"
                >
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      FIXTURE
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {kickoff}
                    </span>
                  </div>

                  <div className="grid gap-2 p-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-3">
                    <FastPickButton
                      entryId={entry.id}
                      teamName={fixture.home_team}
                      league={competition.code}
                      used={homeUsed}
                      opponent={fixture.away_team}
                      venue="HOME"
                      deadlinePassed={deadlinePassed}
                    />

                    <div className="flex items-center justify-center">
                      <span className="rounded-full border border-white/10 bg-[#202733] px-3 py-1 text-[10px] font-black tracking-[0.2em] text-slate-500">
                        VS
                      </span>
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
              )
            })}
          </div>

          <div className="mt-4 rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 text-center text-xs font-semibold text-slate-500">
            Pick the green button showing the team you want.
            You can only pick one team this round.
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
          No fixtures are currently available for Round {competition.round}.
        </div>
      )}
    </div>
  )
}
