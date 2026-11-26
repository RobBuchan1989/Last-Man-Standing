import assert from "node:assert/strict";
import test from "node:test";

import { persistSessionAndRefresh } from "../session-storage-flow.mjs";

test("refreshes saved sessions after the new session is persisted", async () => {
  const events = [];

  await persistSessionAndRefresh(
    async () => { events.push("persist"); },
    async () => { events.push("refresh"); },
  );

  assert.deepEqual(events, ["persist", "refresh"]);
});

test("does not refresh the saved-session list when persistence fails", async () => {
  const events = [];

  await assert.rejects(
    persistSessionAndRefresh(
      async () => {
        events.push("persist");
        throw new Error("secure storage failed");
      },
      async () => { events.push("refresh"); },
    ),
    /secure storage failed/,
  );

  assert.deepEqual(events, ["persist"]);
});
