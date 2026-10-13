"use client"

import Link from "next/link"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSent(false)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error("Password reset is not configured. Please contact the site administrator.")
      // Start the PKCE flow in the user's browser so its verifier is stored
      // in the same browser context that will open the recovery email.
      const supabase = createBrowserClient(url, key)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: "https://lastmanstandingpl.com/auth/confirm?next=/auth/reset-password",
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't request a reset email. Please try again shortly.")
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen bg-background px-6 py-16"><div className="mx-auto max-w-xl"><p className="font-display text-xs uppercase tracking-[0.3em] text-primary">Last Man Standing</p><h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-foreground">Reset admin password</h1><p className="mt-3 text-lg text-muted-foreground">We'll send a recovery link if the address belongs to an account.</p><div className="mt-8 rounded-2xl border border-border bg-card p-8">{sent ? <p role="status" className="text-sm leading-6 text-foreground">If that email belongs to an account, a recovery email will be sent when the email service allows it. Check your inbox and spam folder. If you recently hit the email rate limit, wait before requesting another link.</p> : <form onSubmit={submit} className="space-y-5"><div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">Admin email</label><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-4 text-foreground outline-none focus:border-primary" placeholder="Your admin email" /></div>{error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}<button disabled={busy} type="submit" className="w-full rounded-xl bg-primary px-6 py-4 font-bold uppercase text-black hover:opacity-90 disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button></form>}<div className="mt-6 border-t border-border pt-6 text-center"><Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">← Back to admin login</Link></div></div></div></main>
}
