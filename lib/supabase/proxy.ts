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
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
   * IMPORTANT:
   * Keep this immediately after creating
   * the Supabase client.
   *
   * It validates the JWT and refreshes
   * the session when required.
   */
  const { data } =
    await supabase.auth.getClaims()

  const claims =
    data?.claims

  /*
   * The Last Man Standing game itself
   * does not require Supabase Auth.
   *
   * The admin area does.
   *
   * Therefore we do NOT redirect normal
   * game users who don't have a Supabase
   * session.
   */

  void claims

  return supabaseResponse
}
