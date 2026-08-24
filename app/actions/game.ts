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

  if (!name) {
    return {
      error: "Please enter your name.",
    }
  }

  try {
    const existing = await getCurrentEntry(competitionCode)

    if (existing) {
      return {
        ok: true,
        returning: true,
      }
    }

    await joinCompetition(name, competitionCode)

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
  const cleanLeagueName = leagueName.trim().slice(0, 60)
  const cleanManagerName = managerName.trim().slice(0, 40)

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
    // Create the new league.
    const competition =
      await createCompetition(cleanLeagueName)

    // Automatically add the creator to the new league.
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
