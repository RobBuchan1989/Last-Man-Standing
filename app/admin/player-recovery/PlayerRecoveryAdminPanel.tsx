"use client"

import { useState } from "react"

type League = { id: string; name: string; code: string }
type Player = { id: string; name: string; competition_id: string; alive: boolean }

export default function PlayerRecoveryAdminPanel({ leagues, players }: { leagues: League[]; players: Player[] }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id || "")
  const [entryId, setEntryId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [issued, setIssued] = useState<{ recoveryCode: string; playerName: string; leagueName: string; leagueCode: string } | null>(null)
  const filteredPlayers = players.filter((player) => player.competition_id === leagueId)

  async function issueCode() {
    if (!entryId) {
      setError("Select the existing player entry first.")
      return
    }
    setBusy(true)
    setError("")
    setIssued(null)
    try {
      const response = await fetch("/api/admin/player-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        setError(result.error || "Could not issue the recovery code.")
        return
      }
      setIssued(result)
    } catch {
      setError("Could not issue the recovery code. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.recoveryCode)
    } catch {
      setError("Copy was blocked by the browser. Select and copy the code manually.")
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Existing player recovery</p>
        <h2 className="mt-3 text-2xl font-bold text-foreground">Issue a recovery code</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Select the player's original entry. Issuing a code replaces any previous code for that entry, but does not alter their picks, status or history. The code is shown only once, so send it to the verified player privately.
        </p>

        {leagues.length === 0 ? (
          <p className="mt-5 rounded-xl bg-background p-4 text-sm text-muted-foreground">No leagues found.</p>
        ) : (
          <div className="mt-6 max-w-2xl space-y-4">
            <div>
              <label htmlFor="recovery-admin-league" className="mb-2 block text-sm font-semibold text-foreground">League</label>
              <select id="recovery-admin-league" value={leagueId} onChange={(event) => { setLeagueId(event.target.value); setEntryId(""); setIssued(null); setError("") }} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground">
                {leagues.map((league) => <option key={league.id} value={league.id}>{league.name} · {league.code}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="recovery-admin-player" className="mb-2 block text-sm font-semibold text-foreground">Existing player</label>
              <select id="recovery-admin-player" value={entryId} onChange={(event) => { setEntryId(event.target.value); setIssued(null); setError("") }} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground">
                <option value="">Choose the player's existing entry…</option>
                {filteredPlayers.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.alive ? "ALIVE" : "OUT"}</option>)}
              </select>
            </div>
            <button type="button" disabled={busy || !entryId} onClick={issueCode} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Generating secure code…" : "Issue / replace recovery code"}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>

      {issued && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Code generated</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">{issued.playerName} · {issued.leagueName}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Send this code to {issued.playerName} through a private channel. They should open the homepage, expand “Already playing? Recover access”, and enter league code <strong>{issued.leagueCode}</strong>, their existing name and this code.
          </p>
          <div className="mt-4 break-all rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground">{issued.recoveryCode}</div>
          <button type="button" onClick={copyCode} className="mt-3 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Copy recovery code</button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            This code will not be shown again after you leave this page. If lost, issue a replacement; the previous code will stop working. Do not post the code in the league chat.
          </p>
        </section>
      )}
    </div>
  )
}
