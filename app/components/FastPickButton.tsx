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
const PICK_SAVED_EVENT = "lms-pick-saved"

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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pickedByThisButton = selectedTeam === teamName
  const anotherTeamPicked =
    selectedTeam !== null && selectedTeam !== teamName

  useEffect(() => {
    const handlePickSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ teamName: string }>
      const picked = customEvent.detail?.teamName
      if (picked) setSelectedTeam(picked)
    }

    const handlePickCleared = () => {
      setSelectedTeam(null)
      setSaving(false)
    }

    window.addEventListener(PICK_EVENT, handlePickSelected)
    window.addEventListener(CLEAR_EVENT, handlePickCleared)

    return () => {
      window.removeEventListener(PICK_EVENT, handlePickSelected)
      window.removeEventListener(CLEAR_EVENT, handlePickCleared)
    }
  }, [])

  const handlePick = async () => {
    if (
      used ||
      deadlinePassed ||
      selectedTeam !== null ||
      saving
    ) {
      return
    }

    setError(null)

    window.dispatchEvent(
      new CustomEvent(PICK_EVENT, {
        detail: { teamName },
      })
    )

    setSaving(true)

    try {
      const response = await fetch("/api/pick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entryId,
          teamName,
          league,
        }),
      })

      const result = await response.json()

      if (!response.ok || result?.error) {
        throw new Error(
          result?.error ||
            "Could not lock in your pick."
        )
      }

      setSaving(false)

      window.dispatchEvent(
        new CustomEvent(PICK_SAVED_EVENT, {
          detail: { entryId },
        })
      )
    } catch (err) {
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

  if (pickedByThisButton) {
    return (
      <div className="rounded-xl border border-green-400/50 bg-green-400/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-400 text-lg font-black text-[#07110b]">
            ✓
          </div>

          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">
              YOUR PICK
            </div>
            <div className="mt-0.5 text-lg font-black">
              {teamName}
            </div>
            <div className="text-xs font-semibold text-slate-300">
              {venue} · vs {opponent}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs font-black uppercase tracking-wide text-white">
          Round pick saved & locked in
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (anotherTeamPicked) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 text-left opacity-35"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-black">
              {teamName}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">
              {venue} · vs {opponent}
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold text-slate-600">
            NOT SELECTED
          </span>
        </div>
      </button>
    )
  }

  if (used) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-[#10151d] px-4 py-3 text-left opacity-45"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-black text-slate-500">
              {teamName}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-600">
              {venue} · vs {opponent}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#202733] px-2.5 py-1 text-[10px] font-black text-slate-500">
            USED
          </span>
        </div>
      </button>
    )
  }

  if (deadlinePassed) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-red-500/20 bg-[#10151d] px-4 py-3 text-left opacity-45"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-black text-slate-500">
              {teamName}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-600">
              {venue} · vs {opponent}
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black text-red-400">
            LOCKED
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={saving}
        onClick={handlePick}
        aria-label={`Pick ${teamName}`}
        className="group w-full rounded-xl border border-white/10 bg-[#151b25] px-4 py-3 text-left transition hover:border-green-400 hover:bg-[#202733] focus:outline-none focus:ring-2 focus:ring-green-400/60 disabled:cursor-wait"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-black">
              {teamName}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-400">
              {venue} · vs {opponent}
            </div>
          </div>

          <span className="shrink-0 rounded-lg bg-green-400 px-3 py-2 text-[10px] font-black text-[#07110b] transition group-hover:bg-green-300 sm:text-xs">
            {saving ? "SAVING..." : `PICK ${teamName}`}
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
