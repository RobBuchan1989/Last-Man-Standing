export async function persistSessionAndRefresh(persistSession, refreshSavedSessions) {
  await persistSession();
  try {
    // The player session is already saved; refreshing the convenience list is best-effort.
    await refreshSavedSessions();
  } catch {
    // A read failure must not make a successful create, join or recovery appear to have failed.
  }
}
