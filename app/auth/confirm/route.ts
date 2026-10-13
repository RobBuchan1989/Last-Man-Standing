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

  // Complete the PKCE exchange in the browser that opened the email. This avoids
  // relying on server-side cookies being shared with the email client's browser.
  const destination = new URL(next, SITE_ORIGIN)
  destination.searchParams.set("code", code)
  return NextResponse.redirect(destination)
}
