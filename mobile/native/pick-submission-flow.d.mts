export type PickDashboard = {
  competition: { round: number };
  ownCurrentPicks: Array<{ round: number; team: string; result: string | null; is_multi: boolean }>;
};

export function applySubmittedPick<T extends PickDashboard>(
  dashboard: T | null,
  teams: string[],
  useMultiChip: boolean,
): T | null;

export function submitPickAndRefresh<T extends PickDashboard, F>(args: {
  submit: () => Promise<void>;
  refresh: () => Promise<{ dashboard: T; fixtures: F }>;
  dashboard: T | null;
  teams: string[];
  useMultiChip: boolean;
}): Promise<{ dashboard: T | null; fixtures: F | null; refreshFailed: boolean; error?: unknown }>;
