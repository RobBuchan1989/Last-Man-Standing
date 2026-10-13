"use client"

import { FormEvent, useState } from "react"

export default function PlayerRecoverySection() {
  const [open, setOpen] = useState(false)
  const [leagueCode, setLeagueCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/player-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueCode, playerName, recoveryCode }),
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        setError(result.error || "Those details could not be verified. Check them and try again.")
        return
      }

      setSuccess("Access restored. Taking you back to your league…")
      window.location.assign(`/?league=${encodeURIComponent(result.leagueCode)}`)
    } catch {
      setError("Recovery is temporarily unavailable. Please try again shortly.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 border-t border-white/10 pt-5 pb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-3 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 text-slate-500" aria-hidden="true">♧</span>
          <span>
            <span className="block text-sm font-semibold text-slate-300">
              Already playing? Recover access
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Get back into an existing player entry.
            </span>
          </span>
        </span>
        <span className="shrink-0 text-slate-500" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/10 bg-[#101720] p-4 sm:p-5">
          <div className="text-sm font-semibold text-slate-200">
            Recover your player entry
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Enter the details and recovery code supplied for your existing entry. Your picks and history will be preserved.
          </p>

          <form onSubmit={recover} className="mt-4 max-w-xl space-y-3">
            <div>
              <label htmlFor="recovery-league" className="mb-1.5 block text-xs font-semibold text-slate-400">League code</label>
              <input
                id="recovery-league"
                value={leagueCode}
                onChange={(event) => setLeagueCode(event.target.value.toUpperCase())}
                required
                maxLength={20}
                autoComplete="off"
                placeholder="e.g. 0910AB"
                className="w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="recovery-player" className="mb-1.5 block text-xs font-semibold text-slate-400">Your existing player name</label>
              <input
                id="recovery-player"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                required
                maxLength={40}
                autoComplete="name"
                placeholder="Enter the name already in the league"
                className="w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="recovery-code" className="mb-1.5 block text-xs font-semibold text-slate-400">Recovery code</label>
              <input
                id="recovery-code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value.trim())}
                required
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your recovery code"
                className="w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-3 text-sm text-white outline-none focus:border-slate-500"
              />
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</p>}
            {success && <p role="status" className="text-sm text-green-300">{success}</p>}

            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-white/15 bg-[#202733] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-[#293442] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Verifying details…" : "Recover existing player"}
            </button>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            If you don't have a recovery code yet, contact the league administrator. Your name alone cannot be used to access an existing entry.
          </p>
        </div>
      )}
    </section>
  )
}
