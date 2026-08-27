"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import {
  createCompetition,
  joinCompetition,
} from "@/lib/store"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zgjpsaruueqxrtvecnph.supabase.co"

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_-guOZ0scebhQqlluOl8Tmw_QiOrK32c"

const ENTRY_COOKIE = "lms_entry_id"

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
 * This is deliberately kept completely separate from the
 * normal league-loading logic.
 *
 * The pick operation must NOT:
 *
 * - load the competition
 * - synchronise Football Data
 * - refresh the homepage
 * - refresh the league
 * - navigate anywhere
 *
 * It only needs the entry cookie, then lets the PostgreSQL
 * function perform the actual validation and insert.
 */

export async function makePickAction(
  team: { name: string }
) {
  try {
    /*
     * Read the player's existing entry directly from
     * the server-side cookie.
     *
     * This avoids getCurrentEntry(), which can perform
     * additional database/competition work.
     */
    const jar = await cookies()

    const entryId =
      jar.get(
        ENTRY_COOKIE
      )?.value

    if (!entryId) {
      return {
        error:
          "Join the competition first.",
      }
    }

    /*
     * Fetch only the session token required by
     * make_pick_fast().
     *
     * No competition lookup.
     * No Football Data request.
     */
    const entryResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/entries?id=eq.${encodeURIComponent(
          entryId
        )}&select=id,session_token&limit=1`,
        {
          method: "GET",
          headers:
            supabaseHeaders(),
          cache: "no-store",
        }
      )

    if (!entryResponse.ok) {
      return {
        error:
          "Could not verify your game session.",
      }
    }

    const entryRows =
      (await entryResponse.json()) as Array<{
        id: string
        session_token:
          | string
          | null
      }>

    const entry =
      entryRows[0]

    if (
      !entry ||
      !entry.session_token
    ) {
      return {
        error:
          "Your game session could not be verified.",
      }
    }

    /*
     * ONE DATABASE OPERATION.
     *
     * make_pick_fast() handles:
     *
     * - session validation
     * - alive check
     * - competition lookup
     * - current round
     * - duplicate round check
     * - duplicate team check
     * - fixture lookup
     * - kick-off check
     * - pick insertion
     *
     * All inside PostgreSQL.
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
                entry.session_token,

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
          typeof parsed?.message ===
          "string"
        ) {
          message =
            parsed.message
        } else if (
          typeof parsed?.error ===
          "string"
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

      return {
        error: message,
      }
    }

    /*
     * IMPORTANT:
     *
     * Do not revalidate or refresh anything here.
     *
     * GameDashboard already updates the screen locally.
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
