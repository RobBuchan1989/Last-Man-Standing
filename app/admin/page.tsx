import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getAdminCompetitions } from "@/lib/supabase/admin"

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
    /*
     * IMPORTANT:
     *
     * This page is a Server Component.
     * We must NOT call supabase.auth.signOut() here because
     * signing out modifies authentication cookies.
     *
     * The logout route handles cookie modification.
     */
    redirect("/admin/login?error=denied")
  }

  /*
   * ------------------------------------------------------------
   * LOAD COMPETITIONS
   * ------------------------------------------------------------
   */

  const competitions = await getAdminCompetitions()

  const activeCompetitions = competitions.filter(
    (competition) => competition.status === "active"
  )

  const totalPlayers = competitions.reduce(
    (total, competition) => total + competition.total_players,
    0
  )

  const totalAlive = competitions.reduce(
    (total, competition) => total + competition.players_alive,
    0
  )

  /*
   * ------------------------------------------------------------
   * ADMIN DASHBOARD
   * ------------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

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

        {/* Overview */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Competitions
            </p>

            <p className="mt-3 text-3xl font-bold text-foreground">
              {competitions.length}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {activeCompetitions.length} active
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Active Leagues
            </p>

            <p className="mt-3 text-3xl font-bold text-foreground">
              {activeCompetitions.length}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Currently running
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Players
            </p>

            <p className="mt-3 text-3xl font-bold text-foreground">
              {totalPlayers}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Across all competitions
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Players Alive
            </p>

            <p className="mt-3 text-3xl font-bold text-primary">
              {totalAlive}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Still in the game
            </p>
          </div>

        </div>

        {/* Competition Management */}

        <section className="mb-8 rounded-2xl border border-border bg-card p-6">

          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Competition
            </p>

            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Competition Management
            </h2>

            <p className="mt-2 text-muted-foreground">
              View and monitor every Last Man Standing league.
            </p>
          </div>

          {competitions.length === 0 ? (
            <div className="rounded-xl bg-background p-6 text-sm text-muted-foreground">
              No competitions found.
            </div>
          ) : (
            <div className="space-y-4">

              {competitions.map((competition) => (
                <div
                  key={competition.id}
                  className="rounded-xl border border-border bg-background p-5"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    {/* Competition identity */}

                    <div>
                      <div className="flex flex-wrap items-center gap-3">

                        <h3 className="text-xl font-bold text-foreground">
                          {competition.name}
                        </h3>

                        <span
                          className={
                            competition.status === "active"
                              ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary"
                              : "rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                          }
                        >
                          {competition.status}
                        </span>

                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">

                        <span>
                          Code:{" "}
                          <strong className="text-foreground">
                            {competition.code}
                          </strong>
                        </span>

                        <span>
                          Round:{" "}
                          <strong className="text-foreground">
                            {competition.round}
                          </strong>
                        </span>

                      </div>
                    </div>

                    {/* Competition statistics */}

                    <div className="grid grid-cols-3 gap-3 sm:min-w-[420px]">

                      <div className="rounded-lg bg-card px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Players
                        </p>

                        <p className="mt-1 text-xl font-bold text-foreground">
                          {competition.total_players}
                        </p>
                      </div>

                      <div className="rounded-lg bg-card px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Alive
                        </p>

                        <p className="mt-1 text-xl font-bold text-primary">
                          {competition.players_alive}
                        </p>
                      </div>

                      <div className="rounded-lg bg-card px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Out
                        </p>

                        <p className="mt-1 text-xl font-bold text-foreground">
                          {competition.players_out}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* Competition footer */}

                  <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">

                    <span className="text-muted-foreground">
                      Created{" "}
                      {new Date(
                        competition.created_at
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    {competition.status === "active" ? (
                      <span className="font-semibold text-primary">
                        ● Competition running automatically
                      </span>
                    ) : (
                      <span className="font-semibold text-muted-foreground">
                        ● Competition finished
                      </span>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* Other Admin Features */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Fixtures */}

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Fixtures
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Round Control
            </h2>

            <p className="mt-3 text-muted-foreground">
              Monitor fixture synchronisation and automatic round processing.
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
              View players, leagues and alive/out status.
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
              Inspect player picks and results.
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

          {/* Automation */}

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Automation
            </p>

            <h2 className="mt-3 text-2xl font-bold text-foreground">
              Automatic Processing
            </h2>

            <p className="mt-3 text-muted-foreground">
              Fixture syncing and round processing are running automatically.
            </p>

            <div className="mt-6 rounded-xl bg-background p-4 text-sm text-primary">
              ● Automation active
            </div>
          </div>

        </div>

      </div>
    </main>
  )
}
