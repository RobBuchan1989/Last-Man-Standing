import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SITE_ORIGIN = "https://lastmanstandingpl.com"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedNext = url.searchParams.get("next")
  const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/admin/login"

  if (!code) {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=invalid-link", SITE_ORIGIN))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=configuration", SITE_ORIGIN))
  }

  // Use the canonical public origin, not request.url's origin: on hosted services
  // the incoming request URL can reflect an internal localhost address.
  const response = NextResponse.redirect(new URL(next, SITE_ORIGIN))
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=invalid-link", SITE_ORIGIN))
  }

  return response
}
