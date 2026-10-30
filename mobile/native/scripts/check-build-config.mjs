import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stagingUrl = "https://tdtwbuoakjsbkjaljmla.supabase.co";
const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")).expo;

assert.equal(app.scheme, "lastmanstanding", "The app deep-link scheme must remain configured.");
assert.equal(app.ios?.bundleIdentifier, "com.lastmanstandingpl.app", "Unexpected iOS bundle identifier.");
assert.equal(app.android?.package, "com.lastmanstandingpl.app", "Unexpected Android package identifier.");

for (const profileName of ["development", "preview"]) {
  const profile = eas.build?.[profileName];
  assert.ok(profile, `Missing EAS ${profileName} profile.`);
  assert.equal(
    profile.env?.EXPO_PUBLIC_SUPABASE_URL,
    stagingUrl,
    `${profileName} builds must explicitly target the isolated staging Supabase project.`,
  );
}

assert.equal(
  eas.build?.preview?.android?.buildType,
  "apk",
  "Android preview builds must remain installable APKs.",
);
assert.equal(
  eas.build?.preview?.ios?.simulator,
  false,
  "iOS preview builds must target physical devices.",
);

for (const [profileName, profile] of Object.entries(eas.build ?? {})) {
  const env = profile?.env ?? {};
  for (const key of Object.keys(env)) {
    assert.ok(
      !/(SERVICE_ROLE|SECRET_KEY|FOOTBALL_DATA|LMS_FIXTURE_SYNC_SECRET|SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY)/i.test(key),
      `Sensitive or unnecessary key ${key} must not be embedded in EAS profile ${profileName}.`,
    );
  }
}
assert.notEqual(
  eas.build?.production?.env?.EXPO_PUBLIC_SUPABASE_URL,
  stagingUrl,
  "The production profile must not silently point at staging.",
);

console.log("EAS configuration safety checks passed: development/preview target staging, preview artifacts are installable, and no backend secrets are bundled.");
