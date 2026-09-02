"use client"

import { useEffect, useState } from "react"

type Props = {
  entryId: string
  teamName: string
  league: string
  used: boolean
  opponent: string
  venue: "HOME" | "AWAY"
  deadlinePassed: boolean
}

const PICK_EVENT = "lms-pick-selected"
const CLEAR_EVENT = "lms-pick-cleared"

export default function FastPickButton({
  entryId,
  teamName,
  league,
  used,
  opponent,
  venue,
  deadlinePassed,
}: Props) {
  const [selectedTeam, setSelectedTeam] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const [saving, setSaving] =
    useState(false)

  const pickedByThisButton =
    selectedTeam === teamName

  const anotherTeamPicked =
    selectedTeam !== null &&
    selectedTeam !== teamName

  useEffect(() => {
    const handlePickSelected = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          teamName: string
        }>

      const picked =
        customEvent.detail?.teamName

      if (!picked) return

      setSelectedTeam(picked)
    }

    const handlePickCleared = () => {
      setSelectedTeam(null)
      setSaving(false)
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
  }, [])

  const handlePick = async () => {
    /*
     * Never allow a pick if:
     *
     * - the team has already been used
     * - the round deadline has passed
     * - another team has already been selected
     * - a pick is currently being saved
     */
    if (
      used ||
      deadlinePassed ||
      selectedTeam !== null ||
      saving
    ) {
      return
    }

    setError(null)

    /*
     * Lock ALL team buttons immediately.
     */
    window.dispatchEvent(
      new CustomEvent(
        PICK_EVENT,
        {
          detail: {
            teamName,
          },
        }
      )
    )

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
       * The successful pick remains displayed
       * immediately.
       */
      setSaving(false)

    } catch (err) {
      /*
       * Server rejected the pick.
       * Restore all buttons.
       */
      setError(
        err instanceof Error
          ? err.message
          : "Could not lock in your pick."
      )

      window.dispatchEvent(
        new Event(CLEAR_EVENT)
      )
    }
  }

  /*
   * ----------------------------------------------------------
   * SELECTED TEAM
   * ----------------------------------------------------------
   */

  if (pickedByThisButton) {
    return (
      <div className="sm:col-span-2 rounded-xl border border-green-400/40 bg-green-400/10 p-5">

        <div className="text-sm font-bold tracking-[0.2em] text-green-400">
          YOUR PICK
        </div>

        <div className="mt-1 text-2xl font-black">
          {teamName}
        </div>

        <div className="mt-1 text-sm font-bold text-slate-300">
          vs {opponent} · {venue}
        </div>

        <div className="mt-1 text-slate-400">
          Your pick is locked.
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

      </div>
    )
  }

  /*
   * ----------------------------------------------------------
   * ANOTHER TEAM HAS BEEN PICKED
   * ----------------------------------------------------------
   */

  if (anotherTeamPicked) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-[#10151d] p-5 text-left opacity-35"
      >
        <div className="flex items-center justify-between gap-4">

          <div>
            <div className="text-xl font-black">
              {teamName}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              vs {opponent} · {venue}
            </div>
          </div>

          <span className="text-sm font-bold text-slate-600">
            PICK
          </span>

        </div>
      </button>
    )
  }

  /*
   * ----------------------------------------------------------
   * ALREADY USED
   * ----------------------------------------------------------
   */

  if (used) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-[#10151d] p-5 text-left opacity-35"
      >
        <div className="flex items-center justify-between gap-4">

          <div>
            <div className="text-xl font-black">
              {teamName}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              vs {opponent} · {venue}
            </div>
          </div>

          <span className="text-sm font-bold text-slate-600">
            USED
          </span>

        </div>
      </button>
    )
  }

  /*
   * ----------------------------------------------------------
   * DEADLINE PASSED
   * ----------------------------------------------------------
   */

  if (deadlinePassed) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-red-500/20 bg-[#10151d] p-5 text-left opacity-40"
      >
        <div className="flex items-center justify-between gap-4">

          <div>
            <div className="text-xl font-black">
              {teamName}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              vs {opponent} · {venue}
            </div>
          </div>

          <span className="shrink-0 text-sm font-bold text-red-400">
            LOCKED
          </span>

        </div>
      </button>
    )
  }

  /*
   * ----------------------------------------------------------
   * AVAILABLE TEAM
   * ----------------------------------------------------------
   */

  return (
    <div className="w-full">

      <button
        type="button"
        disabled={saving}
        onClick={handlePick}
        className="w-full rounded-xl border border-white/10 bg-[#151b25] p-5 text-left transition hover:border-green-400 hover:bg-[#202733]"
      >

        <div className="flex items-center justify-between gap-4">

          <div>
            <div className="text-xl font-black">
              {teamName}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-400">
              vs {opponent} · {venue}
            </div>
          </div>

          <span className="shrink-0 text-sm font-bold text-slate-400">
            PICK
          </span>

        </div>

      </button>

      {error && (
        <p className="mt-2 px-1 text-sm text-red-400">
          {error}
        </p>
      )}

    </div>
  )
}
