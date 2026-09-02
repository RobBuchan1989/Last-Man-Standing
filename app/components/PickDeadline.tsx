"use client"

import { useEffect, useState } from "react"

type Fixture = {
  kickoff: string
}

type Props = {
  fixtures: Fixture[]
}

function getDeadline(fixtures: Fixture[]) {
  if (!fixtures.length) {
    return null
  }

  const times = fixtures
    .map((fixture) =>
      new Date(fixture.kickoff).getTime()
    )
    .filter((time) => Number.isFinite(time))

  if (!times.length) {
    return null
  }

  return Math.min(...times)
}

function formatFirstGame(deadline: number) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date(deadline))
}

function formatCountdown(
  milliseconds: number
) {
  const totalSeconds =
    Math.max(
      0,
      Math.floor(
        milliseconds / 1000
      )
    )

  const days =
    Math.floor(
      totalSeconds / 86400
    )

  const hours =
    Math.floor(
      (totalSeconds % 86400) /
        3600
    )

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
        60
    )

  return `${days}d ${String(
    hours
  ).padStart(2, "0")}h ${String(
    minutes
  ).padStart(2, "0")}m`
}

export default function PickDeadline({
  fixtures,
}: Props) {
  const deadline =
    getDeadline(fixtures)

  const [
    now,
    setNow,
  ] = useState(() => Date.now())

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setNow(Date.now())
      }, 1000)

    return () =>
      window.clearInterval(
        interval
      )
  }, [])

  if (!deadline) {
    return null
  }

  const passed =
    now >= deadline

  return (
    <div
      className={`rounded-xl border p-4 sm:min-w-[260px] ${
        passed
          ? "border-red-500/40 bg-red-500/10"
          : "border-green-400/30 bg-green-400/10"
      }`}
    >
      <div
        className={`text-xs font-black tracking-[0.2em] ${
          passed
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {passed
          ? "DEADLINE PASSED"
          : "PICK DEADLINE"}
      </div>

      {!passed ? (
        <>
          <div className="mt-1 text-2xl font-black text-white">
            {formatCountdown(
              deadline - now
            )}
          </div>

          <div className="mt-1 text-sm text-slate-400">
            First game:{" "}
            {formatFirstGame(
              deadline
            )}
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm font-semibold text-red-200">
          Picks are locked for this round.
        </div>
      )}
    </div>
  )
}
