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

  useEffect(() => {
    if (currentPick?.team) {
      setSelectedTeam(
        currentPick.team
      )
    }
  }, [currentPick?.team])

  useEffect(() => {
    const handlePickSelected = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          teamName: string
        }>

      const teamName =
        customEvent.detail?.teamName

      if (!teamName) {
        return
      }

      setSelectedTeam(
        teamName
      )
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

  /*
   * ----------------------------------------------------------
   * DEADLINE
   * ----------------------------------------------------------
   */

  const deadline =
    fixtures.length > 0
      ? Math.min(
          ...fixtures
            .map(
              (fixture) =>
                new Date(
                  fixture.kickoff
                ).getTime()
            )
            .filter(
              (time) =>
                Number.isFinite(
                  time
                )
            )
        )
      : null

  const deadlinePassed =
    deadline !== null &&
    Date.now() >= deadline

  /*
   * ----------------------------------------------------------
   * SELECTED TEAM
   * ----------------------------------------------------------
   */

  const selectedFixture =
    selectedTeam
      ? fixtures.find(
          (fixture) =>
            fixture.home_team ===
              selectedTeam ||
            fixture.away_team ===
              selectedTeam
        )
      : null

  const selectedOpponent =
    selectedFixture
      ? selectedFixture.home_team ===
        selectedTeam
        ? selectedFixture.away_team
        : selectedFixture.home_team
      : null

  const selectedVenue =
    selectedFixture
      ? selectedFixture.home_team ===
        selectedTeam
        ? "HOME"
        : "AWAY"
      : null

  /*
   * ----------------------------------------------------------
   * PICK ALREADY SELECTED / SAVED
   * ----------------------------------------------------------
   */

  if (selectedTeam) {
    return (
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
                {selectedTeam}
              </div>

              {selectedOpponent &&
                selectedVenue && (
                  <div className="mt-1 text-sm font-bold text-slate-300">
                    vs {selectedOpponent} ·{" "}
                    {selectedVenue}
                  </div>
                )}

              <div className="mt-2 text-lg font-black text-white">
                ROUND {competition.round} PICK SAVED & LOCKED IN
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
    )
  }

  /*
   * ----------------------------------------------------------
   * PLAYER IS OUT
   * ----------------------------------------------------------
   */

  if (!entry.alive) {
    return (
      <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/10 p-5">

        <div className="text-2xl font-black text-red-400">
          YOU ARE OUT
        </div>

      </div>
    )
  }

  /*
   * ----------------------------------------------------------
   * AVAILABLE FIXTURES
   * ----------------------------------------------------------
   */

  return (
    <div className="mt-8">

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="text-sm font-bold tracking-[0.2em] text-slate-400">
          AVAILABLE FIXTURES
        </div>

        <PickDeadline
          fixtures={fixtures}
        />

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
                {
                  teamName:
                    homeTeam,
                  opponent:
                    awayTeam,
                  venue:
                    "HOME" as const,
                },
                {
                  teamName:
                    awayTeam,
                  opponent:
                    homeTeam,
                  venue:
                    "AWAY" as const,
                },
              ].map(
                ({
                  teamName,
                  opponent,
                  venue,
                }) => {

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
                      opponent={
                        opponent
                      }
                      venue={
                        venue
                      }
                      deadlinePassed={
                        deadlinePassed
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
          No fixtures are currently available for Round{" "}
          {competition.round}.
        </div>

      )}

    </div>
  )
}
