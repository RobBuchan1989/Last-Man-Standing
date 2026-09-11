"use client"

import { useEffect, useMemo, useState } from "react"
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

const TEAM_LOGOS: Record<string, number> = {
  arsenal: 359,
  "aston villa": 362,
  bournemouth: 8678,
  brentford: 337,
  brighton: 397,
  "brighton & hove albion": 397,
  burnley: 379,
  chelsea: 363,
  "crystal palace": 384,
  everton: 368,
  fulham: 370,
  "leeds united": 357,
  liverpool: 364,
  "manchester city": 382,
  "manchester united": 360,
  newcastle: 361,
  "newcastle united": 361,
  "nottingham forest": 393,
  "nott'm forest": 393,
  "nott'm forest fc": 393,
  sunderland: 366,
  tottenham: 367,
  "tottenham hotspur": 367,
  "west ham": 371,
  "west ham united": 371,
  wolves: 380,
  "wolverhampton wanderers": 380,
  ipswich: 373,
  "ipswich town": 373,
  "man city": 382,
  "man united": 360,
}

function cleanTeamName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+fc$/i, "")
    .replace(/\s+football club$/i, "")
}

function getLogoUrl(name: string) {
  const id = TEAM_LOGOS[cleanTeamName(name)]
  return id
    ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`
    : null
}

function TeamLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false)
  const logoUrl = getLogoUrl(name)

  const sizeClass =
    size === "sm"
      ? "h-10 w-10"
      : "h-12 w-12 sm:h-14 sm:w-14"

  if (!logoUrl || failed) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()

    return (
      <div
        aria-hidden="true"
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#202a36] text-xs font-black text-slate-300`}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center`}>
      <img
        src={logoUrl}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function formatKickoff(value: string) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return { date: "", time: "" }
  }

  return {
    date: new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  }
}

export default function CurrentRoundPick({
  competition,
  entry,
  fixtures,
  usedTeams,
  currentPick,
}: Props) {
  const [expandedFixture, setExpandedFixture] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(
    currentPick?.team || null
  )

  useEffect(() => {
    if (currentPick?.team) {
      setSelectedTeam(currentPick.team)
    }
  }, [currentPick?.team])

  useEffect(() => {
    const handlePickSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamName: string }>
      const teamName = customEvent.detail?.teamName
      if (!teamName) return
      setSelectedTeam(teamName)
    }

    const handlePickCleared = () => {
      if (!currentPick?.team) {
        setSelectedTeam(null)
      }
    }

    window.addEventListener(PICK_EVENT, handlePickSelected)
    window.addEventListener(CLEAR_EVENT, handlePickCleared)

    return () => {
      window.removeEventListener(PICK_EVENT, handlePickSelected)
      window.removeEventListener(CLEAR_EVENT, handlePickCleared)
    }
  }, [currentPick?.team])

  const deadline = useMemo(() => {
    if (!fixtures.length) return null

    const times = fixtures
      .map((fixture) => new Date(fixture.kickoff).getTime())
      .filter((time) => Number.isFinite(time))

    return times.length ? Math.min(...times) : null
  }, [fixtures])

  const deadlinePassed = deadline !== null && Date.now() >= deadline

  if (selectedTeam) {
    const selectedFixture = fixtures.find(
      (fixture) =>
        fixture.home_team === selectedTeam ||
        fixture.away_team === selectedTeam
    )

    const opponent = selectedFixture
      ? selectedFixture.home_team === selectedTeam
        ? selectedFixture.away_team
        : selectedFixture.home_team
      : null

    return (
      <div className="mt-6 rounded-2xl border border-green-400/40 bg-green-400/10 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-400 text-xl font-black text-[#07110b]">
            ✓
          </div>

          <div className="min-w-0">
            <div className="text-xs font-black tracking-[0.25em] text-green-400">
              YOUR PICK IS LOCKED
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <TeamLogo name={selectedTeam} size="sm" />
              <div className="text-xl font-black sm:text-2xl">
                {selectedTeam}
              </div>
            </div>
            {opponent && (
              <div className="mt-1 text-sm text-slate-300">
                vs {opponent}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!entry.alive) {
    return (
      <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <div className="text-2xl font-black text-red-400">YOU ARE OUT</div>
      </div>
    )
  }

  return (
    <div className="mt-7 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.28em] text-green-400">
            SELECT ONE FIXTURE
          </div>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">
            Tap a fixture to open it, then choose your team.
          </p>
        </div>

        <PickDeadline fixtures={fixtures} />
      </div>

      {fixtures.length > 0 ? (
        <div className="mt-5 space-y-3">
          {fixtures.map((fixture, index) => {
            const expanded = expandedFixture === fixture.id
            const kickoff = formatKickoff(fixture.kickoff)

            return (
              <div
                key={fixture.id}
                className={`overflow-hidden rounded-2xl border bg-[#0c141e] transition ${
                  expanded
                    ? "border-green-400/60 shadow-[0_0_0_1px_rgba(74,222,128,0.12)]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedFixture(expanded ? null : fixture.id)
                  }
                  className="block w-full min-w-0 p-3 text-left sm:hidden"
                  aria-expanded={expanded}
                >
                  <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_52px_minmax(0,1fr)_32px] items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#202a36] text-xs font-black text-slate-300">
                      {index + 1}
                    </div>

                    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                      <TeamLogo name={fixture.home_team} size="sm" />
                      <span className="w-full truncate text-[11px] font-black text-white">
                        {fixture.home_team}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-col items-center text-center">
                      <span className="rounded-full bg-[#202733] px-2 py-0.5 text-[9px] font-black tracking-[0.15em] text-slate-400">
                        VS
                      </span>
                      <span className="mt-1 whitespace-nowrap text-[9px] font-bold text-slate-500">
                        {kickoff.date}
                      </span>
                      <span className="text-[11px] font-black text-slate-300">
                        {kickoff.time}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                      <TeamLogo name={fixture.away_team} size="sm" />
                      <span className="w-full truncate text-[11px] font-black text-white">
                        {fixture.away_team}
                      </span>
                    </div>

                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg font-black transition ${
                        expanded
                          ? "border-green-400 bg-green-400/10 text-green-400"
                          : "border-white/10 bg-[#202733] text-slate-300"
                      }`}
                    >
                      {expanded ? "↑" : "›"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedFixture(expanded ? null : fixture.id)
                  }
                  className="hidden w-full min-w-0 items-center gap-2 p-3 text-left sm:flex sm:gap-5 sm:p-4"
                  aria-expanded={expanded}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#202a36] text-xs font-black text-slate-300">
                    {index + 1}
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <TeamLogo name={fixture.home_team} />
                      <span className="min-w-0 truncate text-base font-black text-white">
                        {fixture.home_team}
                      </span>
                    </div>

                    <div className="flex w-24 shrink-0 flex-col items-center text-center">
                      <span className="rounded-full bg-[#202733] px-2 py-0.5 text-xs font-black tracking-[0.18em] text-slate-400">
                        VS
                      </span>
                      <span className="mt-1 text-xs font-bold text-slate-500">
                        {kickoff.date}
                      </span>
                      <span className="text-sm font-black text-slate-300">
                        {kickoff.time}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                      <span className="min-w-0 truncate text-base font-black text-white">
                        {fixture.away_team}
                      </span>
                      <TeamLogo name={fixture.away_team} />
                    </div>
                  </div>

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-black transition ${
                      expanded
                        ? "border-green-400 bg-green-400/10 text-green-400"
                        : "border-white/10 bg-[#202733] text-slate-300"
                    }`}
                  >
                    {expanded ? "↑" : "›"}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-white/10 bg-[#0a111a] p-3 sm:p-4">
                    <div className="mb-3 rounded-xl bg-[#101923] px-3 py-3 text-center text-[11px] font-black tracking-[0.2em] text-slate-400 sm:text-xs">
                      WHO WILL YOU PICK?
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#151e29] p-3 sm:p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <TeamLogo name={fixture.home_team} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-white sm:text-base">
                              {fixture.home_team}
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-slate-500">
                              HOME
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <FastPickButton
                            entryId={entry.id}
                            teamName={fixture.home_team}
                            league={competition.code}
                            used={usedTeams.includes(fixture.home_team)}
                            opponent={fixture.away_team}
                            venue="HOME"
                            deadlinePassed={deadlinePassed}
                          />
                        </div>
                      </div>

                      <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#151e29] p-3 sm:p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <TeamLogo name={fixture.away_team} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-white sm:text-base">
                              {fixture.away_team}
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-slate-500">
                              AWAY
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <FastPickButton
                            entryId={entry.id}
                            teamName={fixture.away_team}
                            league={competition.code}
                            used={usedTeams.includes(fixture.away_team)}
                            opponent={fixture.home_team}
                            venue="AWAY"
                            deadlinePassed={deadlinePassed}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
          No fixtures are currently available for Round {competition.round}.
        </div>
      )}
    </div>
  )
}
