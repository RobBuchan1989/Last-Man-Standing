import { type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(
  request: NextRequest
) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run the Supabase session refresh on
     * application routes, while skipping
     * static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
