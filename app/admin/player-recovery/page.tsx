import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import PlayerRecoveryAdminPanel from "./PlayerRecoveryAdminPanel"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminPlayerRecoveryPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims) redirect("/admin/login")

  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : ""
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("email,active")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle()
  if (!adminUser) redirect("/admin/login?error=denied")

  const [{ data: leagueRows, error: leagueError }, { data: playerRows, error: playerError }] = await Promise.all([
    supabase.from("competitions").select("id,name,code").order("created_at", { ascending: false }),
    supabase.from("entries").select("id,name,competition_id,alive").order("created_at", { ascending: true }),
  ])

  if (leagueError || playerError) {
    throw new Error("Unable to load player recovery records.")
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">← Back to admin dashboard</Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Last Man Standing · Admin</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Player recovery</h1>
          <p className="mt-3 text-muted-foreground">Issue secure recovery codes for existing entries without changing a player's picks or status.</p>
        </div>
        <PlayerRecoveryAdminPanel leagues={leagueRows || []} players={playerRows || []} />
      </div>
    </main>
  )
}
