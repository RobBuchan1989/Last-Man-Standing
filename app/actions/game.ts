"use server"

import { revalidatePath } from "next/cache"
import {
  createCompetition,
  joinCompetition,
  getCurrentEntry,
} from "@/lib/store"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgjpsaruueqxrtvecnph.supabase.co"

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_-guOZ0scebhQqlluOl8Tmw_QiOrK32c"

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  }
}

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
    /*
     * When a league code is supplied, this is an
     * explicit join request from a shared invite link.
     *
     * DO NOT check the existing browser entry first.
     * We want to allow another manager to join the
     * same league from the same browser.
     */
    await joinCompetition(
      name,
      competitionCode
    )

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
  const cleanLeagueName = leagueName
    .trim()
    .slice(0, 60)

  const cleanManagerName = managerName
    .trim()
    .slice(0, 40)

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
    const competition =
      await createCompetition(
        cleanLeagueName
      )

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

/*
 * ------------------------------------------------------------
 * FAST MAKE PICK
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * This deliberately does NOT call the old makePick() function.
 *
 * The old path performs:
 *
 * - competition lookup
 * - Football Data API lookup
 * - fixture processing
 * - existing pick lookup
 * - validation
 * - pick insert
 *
 * The database function make_pick_fast() now performs the
 * validation and insert in a single PostgreSQL operation.
 *
 * The only extra lookup here is retrieving the session token
 * belonging to the current entry.
 */

export async function makePickAction(
  team: { name: string }
) {
  const entry =
    await getCurrentEntry()

  if (!entry) {
    return {
      error: "Join the competition first.",
    }
  }

  try {
    /*
     * Get the session token for this entry.
     *
     * The token is never sent to the browser.
     * This action runs entirely on the server.
     */
    const entryResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/entries?id=eq.${encodeURIComponent(
          entry.id
        )}&select=id,session_token`,
        {
          method: "GET",
          headers:
            supabaseHeaders(),
          cache: "no-store",
        }
      )

    if (!entryResponse.ok) {
      throw new Error(
        `Could not verify your game session.`
      )
    }

    const entryRows =
      (await entryResponse.json()) as Array<{
        id: string
        session_token:
          | string
          | null
      }>

    const storedEntry =
      entryRows[0]

    if (
      !storedEntry ||
      !storedEntry.session_token
    ) {
      throw new Error(
        "Your game session could not be verified."
      )
    }

    /*
     * CALL THE FAST POSTGRES FUNCTION.
     *
     * This replaces the old multi-step makePick()
     * implementation.
     */
    const pickResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/make_pick_fast`,
        {
          method: "POST",
          headers:
            supabaseHeaders(),
          cache: "no-store",
          body:
            JSON.stringify({
              p_entry_id:
                entry.id,

              p_session_token:
                storedEntry.session_token,

              p_team:
                team.name,
            }),
        }
      )

    if (!pickResponse.ok) {
      const text =
        await pickResponse.text()

      let message =
        "Could not lock in your pick."

      try {
        const parsed =
          JSON.parse(text)

        if (
          parsed?.message
        ) {
          message =
            parsed.message
        } else if (
          parsed?.error
        ) {
          message =
            parsed.error
        }
      } catch {
        if (text) {
          message =
            text
        }
      }

      throw new Error(
        message
      )
    }

    /*
     * No router.refresh().
     *
     * The GameDashboard already performs an optimistic
     * update, so the pick appears immediately.
     *
     * We also deliberately avoid revalidating the homepage
     * here because that would cause unnecessary work after
     * the pick has already been saved.
     */

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
