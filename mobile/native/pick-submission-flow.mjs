export function applySubmittedPick(dashboard, teams, useMultiChip) {
  if (!dashboard) return dashboard;
  return {
    ...dashboard,
    ownCurrentPicks: teams.map((team) => ({
      round: dashboard.competition.round,
      team,
      result: null,
      is_multi: useMultiChip,
    })),
  };
}

export async function submitPickAndRefresh({ submit, refresh, dashboard, teams, useMultiChip }) {
  await submit();

  const optimisticDashboard = applySubmittedPick(dashboard, teams, useMultiChip);
  try {
    const refreshed = await refresh();
    if (!refreshed?.dashboard || !Array.isArray(refreshed?.fixtures?.fixtures)) {
      throw new Error("Dashboard refresh returned incomplete data.");
    }
    return {
      dashboard: refreshed.dashboard,
      fixtures: refreshed.fixtures,
      refreshFailed: false,
    };
  } catch (error) {
    return {
      dashboard: optimisticDashboard,
      fixtures: null,
      refreshFailed: true,
      error,
    };
  }
}
