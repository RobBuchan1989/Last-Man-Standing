import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const leagueCode = String(body.leagueCode || "").trim().toUpperCase()
    const playerName = String(body.playerName || "").trim()
    const recoveryCode = String(body.recoveryCode || "").trim()

    if (!leagueCode || !playerName || !recoveryCode || recoveryCode.length > 100) {
      return NextResponse.json({ ok: false, error: "Those details could not be verified. Check them and try again." }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("lms_recover_player", {
      p_league_code: leagueCode,
      p_player_name: playerName,
      p_code_hash: sha256(recoveryCode),
    })

    if (error || !data?.entry_id || !data?.competition_code) {
      return NextResponse.json({ ok: false, error: "Those details could not be verified. Check them and try again. If you have tried repeatedly, wait 15 minutes before trying again." }, { status: 400 })
    }

    const response = NextResponse.json({ ok: true, leagueCode: data.competition_code })
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    }

    response.cookies.set("lms_entry_id", data.entry_id, cookieOptions)
    response.cookies.set("lms_competition_code", data.competition_code, cookieOptions)

    const requestCookies = request.headers.get("cookie") || ""
    const existing = requestCookies.match(/(?:^|;\s*)lms_player_entries=([^;]*)/)?.[1]
    let entryIds: string[] = []
    if (existing) {
      try {
        const parsed = JSON.parse(decodeURIComponent(existing))
        if (Array.isArray(parsed)) entryIds = parsed.filter((id): id is string => typeof id === "string")
      } catch {
        entryIds = []
      }
    }
    const nextIds = [data.entry_id, ...entryIds.filter((id) => id !== data.entry_id)].slice(0, 50)
    response.cookies.set("lms_player_entries", JSON.stringify(nextIds), cookieOptions)
    return response
  } catch {
    return NextResponse.json({ ok: false, error: "Recovery is temporarily unavailable. Please try again shortly." }, { status: 500 })
  }
}
