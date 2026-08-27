import { NextResponse } from "next/server"

import {
  getCurrentEntry,
  makePick,
} from "@/lib/store"

export const dynamic = "force-dynamic"

type PickRequest = {
  entryId?: string
  teamName?: string
  league?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PickRequest

    const entryId = String(body.entryId || "").trim()
    const teamName = String(body.teamName || "").trim()
    const league = String(body.league || "").trim().toUpperCase()

    if (!entryId || !teamName || !league) {
      return NextResponse.json(
        {
          error: "Invalid pick request.",
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Find the current player's entry for this league.
     *
     * Supplying the league is important because the user can
     * belong to multiple leagues.
     */
    const entry = await getCurrentEntry(
      league,
      false
    )

    if (!entry) {
      return NextResponse.json(
        {
          error: "Join the competition first.",
        },
        {
          status: 401,
        }
      )
    }

    /*
     * Make absolutely sure the browser is submitting
     * against its own entry.
     */
    if (entry.id !== entryId) {
      return NextResponse.json(
        {
          error: "Your player session could not be verified.",
        },
        {
          status: 403,
        }
      )
    }

    /*
     * This is the existing database-saving function.
     *
     * It performs the fast validation path and then inserts
     * the pick into Supabase.
     */
    await makePick(
      entry,
      {
        name: teamName,
      },
      league
    )

    return NextResponse.json(
      {
        ok: true,
        saved: true,
        team: teamName,
      },
      {
        status: 200,
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not lock in your pick.",
      },
      {
        status: 400,
      }
    )
  }
}
