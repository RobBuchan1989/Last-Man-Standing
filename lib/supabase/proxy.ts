import { createServerClient } from "@supabase/ssr"
import {
  NextResponse,
  type NextRequest,
} from "next/server"

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    })

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(
            cookiesToSet,
            headers
          ) {
            cookiesToSet.forEach(
              ({ name, value }) => {
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            supabaseResponse =
              NextResponse.next({
                request,
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )

            Object.entries(
              headers
            ).forEach(
              ([key, value]) => {
                supabaseResponse.headers.set(
                  key,
                  value
                )
              }
            )
          },
        },
      }
    )

  /*
   * Refresh/validate the Supabase Auth session
   * in the Proxy, where cookies can safely be
   * written to the response.
   *
   * The game itself does not require a Supabase
   * Auth session, so we deliberately do not
   * redirect unauthenticated visitors here.
   */
  await supabase.auth.getClaims()

  return supabaseResponse
}
