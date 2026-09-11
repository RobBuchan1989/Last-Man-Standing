"use client"

import { useCallback, useEffect, useState } from "react"

type LeaderboardPlayer = {
  id: string
  name: string
  alive: boolean
  picks: Array<{
    round: number
  }>
}

type Props = {
  leaderboard: LeaderboardPlayer[]
  currentRound: number
  leagueCode: string
}

function currentRoundPickCount(
  player: LeaderboardPlayer,
  currentRound: number
) {
  return player.picks.filter(
    (pick) => pick.round === currentRound
  ).length
}

export default function LiveLeaderboard({
  leaderboard,
  currentRound,
  leagueCode,
}: Props) {
  const [players, setPlayers] =
    useState<LeaderboardPlayer[]>(leaderboard)

  const refreshLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/leaderboard?league=${encodeURIComponent(
          leagueCode
        )}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      )

      if (!response.ok) return

      const result =
        (await response.json()) as {
          leaderboard?: LeaderboardPlayer[]
        }

      if (Array.isArray(result.leaderboard)) {
        setPlayers(result.leaderboard)
      }
    } catch {
      // Keep the last known data if a refresh fails.
    }
  }, [leagueCode])

  useEffect(() => {
    const handlePickSaved = () => {
      void refreshLeaderboard()
    }

    window.addEventListener(
      "lms-pick-saved",
      handlePickSaved
    )

    const interval = window.setInterval(() => {
      void refreshLeaderboard()
    }, 5000)

    return () => {
      window.removeEventListener(
        "lms-pick-saved",
        handlePickSaved
      )
      window.clearInterval(interval)
    }
  }, [refreshLeaderboard])

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshLeaderboard()
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    )

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      )
    }
  }, [refreshLeaderboard])

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#151b25] p-4 sm:p-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-2xl font-black">
          LEADERBOARD
        </h2>

        <div className="shrink-0 rounded-full bg-[#202733] px-3 py-1 text-xs font-bold">
          {players.filter(
            (player) => player.alive
          ).length}{" "}
          alive
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {players.map((player, index) => {
          const count =
            currentRoundPickCount(
              player,
              currentRound
            )

          return (
            <div
              key={player.id}
              className="rounded-xl bg-[#1c222d] p-4"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="text-slate-500">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {player.name}
                  </div>

                  <div className="text-sm text-slate-400">
                    {count}{" "}
                    {count === 1
                      ? "pick"
                      : "picks"}
                  </div>
                </div>

                <div
                  className={
                    player.alive
                      ? "shrink-0 text-right font-bold text-green-400"
                      : "shrink-0 text-right font-bold text-red-400"
                  }
                >
                  {player.alive
                    ? "ALIVE"
                    : "OUT"}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
