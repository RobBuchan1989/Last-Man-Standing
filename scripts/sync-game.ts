import {
  runBackgroundSync,
} from "../lib/store"

async function main() {
  console.log(
    "[LMS SYNC] Starting compatibility sync command..."
  )

  try {
    const result =
      await runBackgroundSync()

    console.log(
      "[LMS SYNC] Supabase pg_cron remains authoritative."
    )

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    )
  } catch (error) {
    console.error(
      "[LMS SYNC] Compatibility sync command failed:",
      error
    )

    process.exit(1)
  }
}

main()
