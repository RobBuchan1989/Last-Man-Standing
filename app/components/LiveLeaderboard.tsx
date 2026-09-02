"use client"

import { useEffect, useState } from "react"

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
}

const PICK_SAVED_EVENT = "lms-pick-saved"

export default function LiveLeaderboard({
  leaderboard,
  currentRound,
}: Props) {
  const [pickCounts, setPickCounts] = useState<
    Record<string, number>
  >(() => {
    const initial: Record<string, number> = {}

    for (const player of leaderboard) {
      initial[player.id] =
        player.picks.filter(
          (pick) =>
            pick.round === currentRound
        ).length
    }

    return initial
  })

  useEffect(() => {
    const handlePickSaved = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          entryId: string
        }>

      const entryId =
        customEvent.detail?.entryId

      /*
       * FastPickButton fires this event only after the
       * current-round pick has been successfully saved.
       * The event intentionally contains only the entryId,
       * so we do not require a round value here.
       */
      if (!entryId) {
        return
      }

      setPickCounts((current) => {
        /*
         * A player can only make one pick per round.
         * Ignore duplicate success events so the UI
         * cannot accidentally show 2 picks.
         */
        if (
          (current[entryId] ?? 0) >= 1
        ) {
          return current
        }

        return {
          ...current,
          [entryId]: 1,
        }
      })
    }

    window.addEventListener(
      PICK_SAVED_EVENT,
      handlePickSaved
    )

    return () => {
      window.removeEventListener(
        PICK_SAVED_EVENT,
        handlePickSaved
      )
    }
  }, [currentRound])

  return (
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
          ) => {
            const currentRoundPickCount =
              pickCounts[player.id] ?? 0

            return (
              <div
                key={player.id}
                className="rounded-xl bg-[#1c222d] p-4"
              >

                <div className="flex items-center gap-4">

                  <div className="text-slate-500">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="font-bold">
                      {player.name}
                    </div>

                    <div className="text-sm text-slate-400">
                      {currentRoundPickCount}{" "}
                      {currentRoundPickCount === 1
                        ? "pick"
                        : "picks"}
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
          }
        )}

      </div>

    </div>
  )
}
