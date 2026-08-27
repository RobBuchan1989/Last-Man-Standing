"use client"

import { useState } from "react"

type Props = {
  entryId: string
  teamName: string
  league: string
  used: boolean
}

export default function FastPickButton({
  entryId,
  teamName,
  league,
  used,
}: Props) {
  const [picked, setPicked] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [saving, setSaving] =
    useState(false)

  const handlePick = async () => {
    if (
      used ||
      picked ||
      saving
    ) {
      return
    }

    setError(null)

    /*
     * IMPORTANT:
     *
     * Show the successful pick immediately.
     *
     * There is deliberately no
     * "locking in..." message.
     */
    setPicked(true)
    setSaving(true)

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
            body:
              JSON.stringify({
                entryId,
                teamName,
                league,
              }),
          }
        )

      const result =
        await response.json()

      if (
        !response.ok ||
        result?.error
      ) {
        throw new Error(
          result?.error ||
            "Could not lock in your pick."
        )
      }

      /*
       * The pick is already displayed locally.
       *
       * We deliberately do NOT:
       *
       * - refresh the page
       * - navigate
       * - reload the league
       */
    } catch (err) {
      /*
       * If the database rejects the pick,
       * roll back the instant UI change.
       */
      setPicked(false)

      setError(
        err instanceof Error
          ? err.message
          : "Could not lock in your pick."
      )
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handlePick}
          className="w-full rounded-2xl border border-white/10 bg-[#151b25] p-5 text-left transition hover:border-green-400 hover:bg-[#202733]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-black">
                {teamName}
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Try again
              </div>
            </div>

            <span className="text-sm font-bold text-slate-400">
              PICK
            </span>
          </div>
        </button>

        <p className="px-1 text-sm text-red-400">
          {error}
        </p>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={
        used ||
        picked ||
        saving
      }
      onClick={handlePick}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        used
          ? "cursor-not-allowed border-white/5 bg-[#10151d] opacity-40"
          : picked
          ? "border-green-400 bg-green-400/10"
          : "border-white/10 bg-[#151b25] hover:border-green-400 hover:bg-[#202733]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">

        <div>
          <div className="text-xl font-black">
            {teamName}
          </div>
        </div>

        <span
          className={`text-sm font-bold ${
            picked
              ? "text-green-400"
              : "text-slate-400"
          }`}
        >
          {picked
            ? "PICKED"
            : used
            ? "USED"
            : "PICK"}
        </span>

      </div>
    </button>
  )
}
