export async function persistSessionAndRefresh(persistSession, refreshSavedSessions) {
  await persistSession();
  await refreshSavedSessions();
}
