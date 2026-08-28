import {
  runBackgroundSync,
} from "../lib/store"

async function main() {
  console.log(
    "[LMS SYNC] Starting background game sync..."
  )

  try {
    const result =
      await runBackgroundSync()

    console.log(
      "[LMS SYNC] Background game sync completed."
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
      "[LMS SYNC] Background game sync failed:",
      error
    )

    process.exit(1)
  }
}

main()
