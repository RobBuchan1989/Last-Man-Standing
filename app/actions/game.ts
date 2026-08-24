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
  const existing = await getCurrentEntry(competitionCode)

  if (existing) {
    return {
      ok: true,
      returning: true,
    }
  }

  const name = displayName.trim().slice(0, 40)

  if (!name) {
    return {
      error: "Please enter your name.",
    }
  }

  try {
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
  leagueName: string
) {
  const name = leagueName.trim().slice(0, 60)

  if (!name) {
    return {
      error: "Please enter a league name.",
    }
  }

  try {
    const competition = await createCompetition(name)

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
