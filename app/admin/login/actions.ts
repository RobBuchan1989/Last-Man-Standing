"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()

  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    redirect("/admin/login?error=missing")
  }

  const supabase = await createClient()

  /*
   * ------------------------------------------------------------
   * SIGN IN
   * ------------------------------------------------------------
   */

  const { error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (loginError) {
    redirect("/admin/login?error=invalid")
  }

  /*
   * ------------------------------------------------------------
   * VERIFY ADMIN
   * ------------------------------------------------------------
   *
   * Being a valid Supabase user is NOT enough.
   *
   * The email must also exist in our admin_users table
   * and be active.
   */

  const { data: adminUser, error: adminError } =
    await supabase
      .from("admin_users")
      .select("email, active")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle()

  if (
    adminError ||
    !adminUser
  ) {
    /*
     * Important:
     * If someone has a normal Supabase account but isn't
     * an authorised admin, immediately sign them back out.
     */
    await supabase.auth.signOut()

    redirect("/admin/login?error=denied")
  }

  /*
   * ------------------------------------------------------------
   * ADMIN VERIFIED
   * ------------------------------------------------------------
   */

  redirect("/admin")
}
