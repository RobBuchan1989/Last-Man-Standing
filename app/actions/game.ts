"use server"

import { revalidatePath } from "next/cache"
import {
  createCompetition,
  joinCompetition,
  makePick,
  getCurrentEntry,
} from "@/lib/store"

export async function joinGameAction(
  displayName: string,
  competitionCode?: string
) {
  const name = displayName.trim().slice(0, 40)
  const code = competitionCode?.trim().toUpperCase() || undefined

  if (!name) {
    return {
      error: "Please enter your name.",
    }
  }

  try {
    /*
     * If a league code is supplied, this is a shared
     * mini-league join link.
     *
     * Do NOT reuse an existing browser entry from
     * another league. The person using the link must
     * be allowed to join this league as a new manager.
     */
    const existing = await getCurrentEntry(
      code,
      Boolean(code)
    )

    if (existing) {
      return {
        ok: true,
        returning: true,
      }
    }

    await joinCompetition(name, code)

    revalidatePath("/")

    return {
      ok: true,
    }
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not join the league.",
    }
  }
}

export async function createLeagueAction(
  leagueName: string,
  managerName: string
) {
  const cleanLeagueName =
    leagueName.trim().slice(0, 60)

  const cleanManagerName =
    managerName.trim().slice(0, 40)

  if (!cleanLeagueName) {
    return {
      error: "Please enter a league name.",
    }
  }

  if (!cleanManagerName) {
    return {
      error: "Please enter your manager name first.",
    }
  }

  try {
    /*
     * Create the new private league.
     */
    const competition =
      await createCompetition(cleanLeagueName)

    /*
     * Automatically add the creator to the
     * newly created league.
     */
    await joinCompetition(
      cleanManagerName,
      competition.code
    )

    revalidatePath("/")

    return {
      ok: true,
      code: competition.code,
      name: competition.name,
    }
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not create the league.",
    }
  }
}

export async function makePickAction(
  team: { name: string }
) {
  const entry = await getCurrentEntry()

  if (!entry) {
    return {
      error: "Join the competition first.",
    }
  }

  try {
    await makePick(entry, team)

    revalidatePath("/")

    return {
      ok: true,
    }
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not lock in your pick.",
    }
  }
}
