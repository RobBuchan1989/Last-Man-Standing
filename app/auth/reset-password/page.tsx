"use client"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("")
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return }
    if (password !== confirmPassword) { setError("The passwords do not match."); return }
    setBusy(true)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error("Password reset is not configured. Please contact the site administrator.")
      const supabase = createBrowserClient(url, key)
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setMessage("Your password has been changed. You can now sign in to the admin area."); setPassword(""); setConfirmPassword("")
    } catch (e) { setError(e instanceof Error ? e.message : "The reset link may have expired. Request a new one and try again.") }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-background px-6 py-16"><div className="mx-auto max-w-xl"><p className="font-display text-xs uppercase tracking-[0.3em] text-primary">Last Man Standing</p><h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-foreground">Choose a new password</h1><p className="mt-3 text-lg text-muted-foreground">Set a new password for your existing account.</p><div className="mt-8 rounded-2xl border border-border bg-card p-8"><form onSubmit={updatePassword} className="space-y-5"><div><label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-foreground">New password</label><input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-4 text-foreground outline-none focus:border-primary" /></div><div><label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-foreground">Confirm new password</label><input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-4 text-foreground outline-none focus:border-primary" /></div>{error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}{message && <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">{message}</p>}<button disabled={busy || !!message} type="submit" className="w-full rounded-xl bg-primary px-6 py-4 font-bold uppercase text-black disabled:opacity-60">{busy ? "Updating password…" : "Update password"}</button></form>{message && <a href="/admin/login" className="mt-5 block text-center text-sm font-semibold text-primary hover:underline">Go to admin login →</a>}</div></div></main>
}
