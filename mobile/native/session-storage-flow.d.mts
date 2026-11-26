export function persistSessionAndRefresh(
  persistSession: () => Promise<void>,
  refreshSavedSessions: () => Promise<void>,
): Promise<void>;
