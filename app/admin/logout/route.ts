import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL || "https://last-man-standing-57j9.onrender.com"),
    {
      status: 303,
    }
  )
}
