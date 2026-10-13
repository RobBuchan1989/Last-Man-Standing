import { NextResponse, type NextRequest } from "next/server"

const SITE_ORIGIN = "https://lastmanstandingpl.com"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  const requestedNext = url.searchParams.get("next")
  const next = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/admin/login"

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(new URL("/admin/forgot-password?error=invalid-link", SITE_ORIGIN))
  }

  // Pass the email's one-time token hash to the browser. The browser verifies it
  // with verifyOtp, which does not depend on a PKCE verifier from another context.
  const destination = new URL(next, SITE_ORIGIN)
  destination.searchParams.set("token_hash", tokenHash)
  destination.searchParams.set("type", "recovery")
  return NextResponse.redirect(destination)
}
