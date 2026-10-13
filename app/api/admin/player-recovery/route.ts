import { createHash, randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const email = typeof claimsData?.claims?.email === "string"
      ? claimsData.claims.email.toLowerCase()
      : ""

    if (!email) {
      return NextResponse.json({ error: "Administrator sign-in required." }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from("admin_users")
      .select("email")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ error: "Administrator access denied." }, { status: 403 })
    }

    const body = await request.json()
    const entryId = String(body.entryId || "").trim()
    if (!/^[0-9a-f-]{36}$/i.test(entryId)) {
      return NextResponse.json({ error: "Select a valid player entry." }, { status: 400 })
    }

    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .select("id,name,competition_id")
      .eq("id", entryId)
      .maybeSingle()

    if (entryError || !entry) {
      return NextResponse.json({ error: "Player entry not found." }, { status: 404 })
    }

    const recoveryCode = randomBytes(24).toString("base64url")
    const { error: issueError } = await supabase.rpc("lms_admin_set_player_recovery", {
      p_entry_id: entry.id,
      p_code_hash: sha256(recoveryCode),
    })

    if (issueError) {
      return NextResponse.json({ error: "Could not issue a recovery code. Check the admin session and database permissions." }, { status: 500 })
    }

    const { data: competition } = await supabase
      .from("competitions")
      .select("name,code")
      .eq("id", entry.competition_id)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      recoveryCode,
      playerName: entry.name,
      leagueName: competition?.name || "League",
      leagueCode: competition?.code || "",
    })
  } catch {
    return NextResponse.json({ error: "Recovery code could not be issued." }, { status: 500 })
  }
}
