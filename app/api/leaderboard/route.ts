import { NextResponse } from "next/server"

import { getLeaderboard } from "@/lib/store"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const league = String(
      url.searchParams.get("league") || ""
    )
      .trim()
      .toUpperCase()

    if (!league) {
      return NextResponse.json(
        { error: "League code is required." },
        { status: 400 }
      )
    }

    const leaderboard = await getLeaderboard(league)

    return NextResponse.json(
      { leaderboard },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load leaderboard.",
      },
      { status: 500 }
    )
  }
}
