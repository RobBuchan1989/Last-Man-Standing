"use server"
import { revalidatePath } from "next/cache"
import { joinCompetition, makePick, getCurrentEntry } from "@/lib/store"

export async function joinGameAction(displayName: string) {
  const existing = await getCurrentEntry()
  if (existing) return { ok: true, returning: true }

  const name = displayName.trim().slice(0, 40)
  if (!name) return { error: "Please enter your name." }

  try {
    const entry = await joinCompetition(name)
    revalidatePath("/")
    return {
      ok: true,
      returning: entry.name === name,
    }
  } catch (e) {
    console.error("joinGameAction failed:", e)
    return { error: "Could not join the competition. Please try again." }
  }
}

export async function makePickAction(team:{name:string}){
  const entry=await getCurrentEntry()
  if(!entry) return {error:"Join the competition first."}

  try {
    await makePick(entry,team)
    revalidatePath("/")
    return {ok:true}
  } catch(e) {
    return {
      error:e instanceof Error ? e.message : "Could not lock in your pick."
    }
  }
}
