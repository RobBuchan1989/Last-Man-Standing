import test from "node:test";
import assert from "node:assert/strict";
import { applySubmittedPick, submitPickAndRefresh } from "../pick-submission-flow.mjs";

const dashboard = {
  competition: { round: 4 },
  ownCurrentPicks: [],
  player: { alive: true },
};

test("refresh success returns the server dashboard and fixtures", async () => {
  let submitted = 0;
  let refreshed = 0;
  const freshDashboard = { ...dashboard, ownCurrentPicks: [{ round: 4, team: "Arsenal", result: null, is_multi: false }] };
  const fixtures = { fixtures: [{ id: "fixture-1" }] };

  const result = await submitPickAndRefresh({
    submit: async () => { submitted += 1; },
    refresh: async () => { refreshed += 1; return { dashboard: freshDashboard, fixtures }; },
    dashboard,
    teams: ["Arsenal"],
    useMultiChip: false,
  });

  assert.equal(submitted, 1);
  assert.equal(refreshed, 1);
  assert.equal(result.refreshFailed, false);
  assert.equal(result.dashboard, freshDashboard);
  assert.equal(result.fixtures, fixtures);
});

test("refresh failure preserves an optimistic pick so it cannot be retried from stale UI", async () => {
  let submitted = 0;
  const refreshError = new Error("dashboard timeout");

  const result = await submitPickAndRefresh({
    submit: async () => { submitted += 1; },
    refresh: async () => { throw refreshError; },
    dashboard,
    teams: ["Arsenal"],
    useMultiChip: false,
  });

  assert.equal(submitted, 1);
  assert.equal(result.refreshFailed, true);
  assert.equal(result.error, refreshError);
  assert.equal(result.fixtures, null);
  assert.deepEqual(result.dashboard.ownCurrentPicks, [
    { round: 4, team: "Arsenal", result: null, is_multi: false },
  ]);
  assert.deepEqual(dashboard.ownCurrentPicks, [], "the original dashboard is not mutated");
});

test("Multi Chip optimistic state records both submitted teams as one round pick", () => {
  const result = applySubmittedPick(dashboard, ["Chelsea", "Liverpool"], true);
  assert.deepEqual(result.ownCurrentPicks, [
    { round: 4, team: "Chelsea", result: null, is_multi: true },
    { round: 4, team: "Liverpool", result: null, is_multi: true },
  ]);
  assert.deepEqual(dashboard.ownCurrentPicks, []);
});

test("submission failure does not attempt dashboard refresh", async () => {
  let refreshed = 0;
  await assert.rejects(
    submitPickAndRefresh({
      submit: async () => { throw new Error("pick rejected"); },
      refresh: async () => { refreshed += 1; return { dashboard, fixtures: { fixtures: [] } }; },
      dashboard,
      teams: ["Arsenal"],
      useMultiChip: false,
    }),
    /pick rejected/,
  );
  assert.equal(refreshed, 0);
});

test("optimistic state is safe when dashboard is not available", () => {
  assert.equal(applySubmittedPick(null, ["Arsenal"], false), null);
});

test("incomplete refresh payload is treated as a refresh failure and preserves submitted pick", async () => {
  const result = await submitPickAndRefresh({
    submit: async () => {},
    refresh: async () => ({ dashboard: null, fixtures: null }),
    dashboard,
    teams: ["Arsenal"],
    useMultiChip: false,
  });
  assert.equal(result.refreshFailed, true);
  assert.match(result.error.message, /incomplete data/);
  assert.deepEqual(result.dashboard.ownCurrentPicks, [
    { round: 4, team: "Arsenal", result: null, is_multi: false },
  ]);
  assert.equal(result.fixtures, null);
});
