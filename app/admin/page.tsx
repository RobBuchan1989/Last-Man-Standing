import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminPage() {
  const supabase = await createClient()

  /*
   * ------------------------------------------------------------
   * VERIFY AUTHENTICATED USER
   * ------------------------------------------------------------
   */

  const {
    data: claimsData,
  } = await supabase.auth.getClaims()

  const claims = claimsData?.claims

  if (!claims) {
    redirect("/admin/login")
  }

  const email =
    typeof claims.email === "string"
      ? claims.email.toLowerCase()
      : ""

  /*
   * ------------------------------------------------------------
   * VERIFY ADMIN
   * ------------------------------------------------------------
   *
   * Being logged into Supabase is NOT enough.
   *
   * The user's email must also exist in admin_users
   * and the account must be active.
   */

  const {
    data: adminUser,
  } = await supabase
    .from("admin_users")
    .select("email, active")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle()

  if (!adminUser) {
    await supabase.auth.signOut()

    redirect("/admin/login?error=denied")
  }

  /*
   * ------------------------------------------------------------
   * ADMIN DASHBOARD
   * ------------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-background px-6 py-10">

      <div className="mx-auto max-w-7xl">

        <div className="mb-10 flex items-start justify-between gap-6">

          <div>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
              Last Man Standing
            </p>

            <h1 className="mt-3 font-display text-5xl font-bold uppercase tracking-tight text-foreground">
              Admin Dashboard
            </h1>

            <p className="mt-3 text-lg text-muted-foreground">
              Signed in as {email}
            </p>
          </div>

          <form
            action="/admin/logout"
            method="post"
          >
            <button
              type="submit"
              className="rounded-xl border border-border bg-card px-5 py-3 font-semibold text-foreground hover:bg-muted"
            >
              Sign out
            </button>
          </form>

        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Competition */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Competition
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Competition Management
            </h2>

            <p className="mt-3 text-muted-foreground">
              Manage leagues, competition status and players.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              Coming next
            </div>
          </div>

          {/* Fixtures */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Fixtures
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Round Control
            </h2>

            <p className="mt-3 text-muted-foreground">
              Sync fixtures and process completed rounds.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              Coming next
            </div>
          </div>

          {/* Players */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Players
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Player Management
            </h2>

            <p className="mt-3 text-muted-foreground">
              View players, picks and alive/out status.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              Coming next
            </div>
          </div>

          {/* Picks */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Picks
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Pick Management
            </h2>

            <p className="mt-3 text-muted-foreground">
              Inspect and manage player picks.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              Coming next
            </div>
          </div>

          {/* Emergency */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Emergency
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Manual Controls
            </h2>

            <p className="mt-3 text-muted-foreground">
              Correct results and reinstate players when required.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              Coming next
            </div>
          </div>

          {/* Security */}

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Security
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Admin Access Active
            </h2>

            <p className="mt-3 text-muted-foreground">
              Your account is authorised to access the administration area.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-primary">
              ● Authenticated administrator
            </div>
          </div>

        </div>

      </div>

    </main>
  )
}
