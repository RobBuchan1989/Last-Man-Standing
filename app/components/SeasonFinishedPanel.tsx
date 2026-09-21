"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { renewLeagueAction } from "@/app/actions/game"

type Props = {
  competitionId: string
  leagueCode: string
  seasonNumber: number
  winnerName: string | null
  winnerRound: number
}

export default function SeasonFinishedPanel({
  competitionId,
  leagueCode,
  seasonNumber,
  winnerName,
  winnerRound,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function renew() {
    const confirmed = window.confirm(
      "Renew this league for a new season? Everyone will start again from Round 1 and previous picks will be cleared."
    )

    if (!confirmed) {
      return
    }

    setError("")

    startTransition(async () => {
      const result = await renewLeagueAction(
        competitionId,
        leagueCode
      )

      if (result.error) {
        setError(result.error)
        return
      }

      window.location.href = `/?league=${encodeURIComponent(leagueCode)}`
    })
  }

  return (
    <section className="rounded-2xl border border-green-400/30 bg-[#101b18] p-5 shadow-xl sm:p-8">
      <div className="text-xs font-black tracking-[0.28em] text-green-400">
        SEASON {seasonNumber} COMPLETE
      </div>

      {winnerName ? (
        <>
          <div className="mt-5 text-5xl" aria-hidden="true">
            🏆
          </div>

          <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
            {winnerName}
          </h2>

          <p className="mt-3 text-xl font-bold text-green-400">
            IS THE LAST MAN STANDING!
          </p>

          <p className="mt-4 text-slate-300">
            They survived through Round {winnerRound}.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-5 text-3xl font-black uppercase sm:text-4xl">
            SEASON COMPLETE
          </h2>

          <p className="mt-3 text-xl font-bold text-slate-200">
            No players survived the final round.
          </p>

          <p className="mt-4 text-slate-400">
            There is no winner for this season, but the league can still be renewed.
          </p>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1219] p-5">
        <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
          Ready for another season?
        </div>

        <p className="mt-2 text-slate-300">
          Anyone who is already in this league can start the next season.
          The same league code and players will be kept.
        </p>

        <button
          type="button"
          onClick={renew}
          disabled={isPending}
          className="mt-5 w-full rounded-xl bg-green-400 px-5 py-4 text-lg font-black text-[#07110b] transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "RENEWING SEASON..." : "RENEW LEAGUE · START NEW SEASON"}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}
      </div>
    </section>
  )
}
