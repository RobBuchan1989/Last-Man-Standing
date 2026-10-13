"use server"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
export async function requestAdminPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!email) redirect("/admin/forgot-password?status=sent")
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://lastmanstandingpl.com/auth/reset-password" })
  redirect("/admin/forgot-password?status=sent")
}
