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

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as PickRequest

    const entryId =
      String(
        body.entryId || ""
      ).trim()

    const teamName =
      String(
        body.teamName || ""
      ).trim()

    const league =
      String(
        body.league || ""
      )
        .trim()
        .toUpperCase()

    if (
      !entryId ||
      !teamName ||
      !league
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid pick request.",
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Get the entry belonging to this browser
     * and this league.
     *
     * This also verifies that the entry ID supplied
     * by the browser is the current player's entry.
     */
    const entry =
      await getCurrentEntry(
        league,
        false
      )

    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Your player session could not be verified.",
        },
        {
          status: 401,
        }
      )
    }

    if (
      entry.id !== entryId
    ) {
      return NextResponse.json(
        {
          error:
            "Your player session could not be verified.",
        },
        {
          status: 403,
        }
      )
    }

    /*
     * Use the existing, proven makePick()
     * database-saving logic.
     *
     * This writes the pick to Supabase.
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
        round: null,
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
