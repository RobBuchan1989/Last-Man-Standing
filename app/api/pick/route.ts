import { NextResponse } from "next/server"
import { getCurrentEntry, makePick } from "@/lib/store"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const teamName =
      typeof body?.teamName === "string"
        ? body.teamName.trim()
        : ""

    if (!teamName) {
      return NextResponse.json(
        {
          error: "Please select a team.",
        },
        { status: 400 }
      )
    }

    const entry =
      await getCurrentEntry()

    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Join the competition first.",
        },
        { status: 401 }
      )
    }

    await makePick(entry, {
      name: teamName,
    })

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not lock in your pick.",
      },
      { status: 400 }
    )
  }
}
