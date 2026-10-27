import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";

const forest = "#10251c";
const lime = "#c9f36a";
const muted = "#66736b";
const SESSION_STORAGE_KEY = "lms.playerSessions.v1";

type LeagueResponse = {
  ok: boolean;
  action: "create" | "join";
  competition: {
    id: string;
    code: string;
    name: string;
    status: string;
    round: number;
    seasonNumber: number;
  };
  entry: {
    id: string;
    name: string;
    alive: boolean;
  };
  sessionToken: string;
  error?: string;
};

type SavedSession = {
  competitionId: string;
  competitionCode: string;
  leagueName: string;
  entryId: string;
  playerName: string;
  sessionToken: string;
  savedAt: string;
};

type FixtureData = {
  id: string; round: number | null; home_team: string | null; away_team: string | null;
  kickoff: string | null; home_score: number | null; away_score: number | null; status: string | null;
};
type FixturesData = { fixtures: FixtureData[]; usedTeams: string[]; round: number; fixtureMatchday: number; status: string };

async function requestFixtures(leagueCode: string, sessionToken: string): Promise<FixturesData> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("The staging connection is not configured.");
  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "fixtures", leagueCode, sessionToken }),
  });
  const result = await response.json().catch(() => null) as (FixturesData & { ok?: boolean; error?: string }) | null;
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not load fixtures.");
  return result;
}

async function requestPick(leagueCode: string, sessionToken: string, teams: string[], useMultiChip: boolean): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("The staging connection is not configured.");
  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "pick", leagueCode, sessionToken, teams, useMultiChip }),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not submit your pick.");
}

type DashboardData = {
  competition: { code: string; name: string; status: string; round: number; seasonNumber: number; isOwner: boolean };
  player: { id: string; name: string; alive: boolean; multiChipUsed: boolean };
  entries: { id: string; name: string; alive: boolean; multi_chip_used: boolean }[];
  historicalPicks: { entry_id: string; round: number; team: string; result: string | null; is_multi: boolean }[];
  ownCurrentPicks: { round: number; team: string; result: string | null; is_multi: boolean }[];
  seasonWinners: { season_number: number; winner_name: string; completed_at: string }[];
};

async function requestLeague(
  action: "create" | "join",
  payload: { playerName: string; leagueName?: string; leagueCode?: string },
): Promise<LeagueResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  if (!supabaseUrl) {
    throw new Error(
      "The staging connection is not configured. Copy .env.example to .env and add the staging Supabase URL.",
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = (await response.json().catch(() => null)) as LeagueResponse | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || "The league request could not be completed.");
  }
  if (!result.sessionToken || !result.entry?.id || !result.competition?.code) {
    throw new Error("The staging service returned an incomplete player session.");
  }
  return result;
}

async function requestDashboard(leagueCode: string, sessionToken: string): Promise<DashboardData> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("The staging connection is not configured.");

  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "dashboard", leagueCode, sessionToken }),
  });
  const result = await response.json().catch(() => null) as (DashboardData & { ok?: boolean; error?: string }) | null;
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not load the league dashboard.");
  return result;
}

async function requestResetSeason(leagueCode: string, sessionToken: string): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("The staging connection is not configured.");
  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset", leagueCode, sessionToken }),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not reset the season.");
}

async function savePlayerSession(result: LeagueResponse) {
  const session: SavedSession = {
    competitionId: result.competition.id,
    competitionCode: result.competition.code,
    leagueName: result.competition.name,
    entryId: result.entry.id,
    playerName: result.entry.name,
    sessionToken: result.sessionToken,
    savedAt: new Date().toISOString(),
  };

  let existing: SavedSession[] = [];
  const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existing = parsed.filter(
          (item): item is SavedSession =>
            !!item &&
            typeof item === "object" &&
            typeof item.competitionCode === "string" &&
            typeof item.entryId === "string" &&
            typeof item.sessionToken === "string",
        );
      }
    } catch {
      existing = [];
    }
  }

  const next = [
    session,
    ...existing.filter(
      (item) =>
        item.competitionCode !== session.competitionCode ||
        item.entryId !== session.entryId,
    ),
  ].slice(0, 50);

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(next));
}

export default function App() {
  const [leagueCode, setLeagueCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [lastLeague, setLastLeague] = useState<{
    code: string;
    name: string;
    playerName: string;
  } | null>(null);
  const [lastSessionToken, setLastSessionToken] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [restoring, setRestoring] = useState(true);
  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [useMultiChip, setUseMultiChip] = useState(false);

  async function refreshSavedSessions() {
    const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) { setSavedSessions([]); return; }
    try {
      const parsed: unknown = JSON.parse(raw);
      const sessions = Array.isArray(parsed) ? parsed.filter(
        (item): item is SavedSession => !!item && typeof item === "object" &&
          typeof item.competitionCode === "string" && typeof item.leagueName === "string" &&
          typeof item.playerName === "string" && typeof item.sessionToken === "string" &&
          typeof item.entryId === "string",
      ) : [];
      setSavedSessions(sessions);
    } catch { setSavedSessions([]); }
  }

  useEffect(() => {
    refreshSavedSessions().catch(() => setSavedSessions([])).finally(() => setRestoring(false));
  }, []);

  async function reopenSavedSession(session: SavedSession) {
    setBusy(true);
    setMessage("");
    try {
      const data = await requestDashboard(session.competitionCode, session.sessionToken);
      setLastSessionToken(session.sessionToken);
      setLastLeague({ code: data.competition.code, name: data.competition.name, playerName: data.player.name });
      setDashboard(data);
      setLeagueCode(data.competition.code);
      setPlayerName(data.player.name);
      setMessageIsError(false);
      setMessage("Saved league restored securely.");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not restore this saved league.");
    } finally { setBusy(false); }
  }

  async function loadFixtures() {
    if (!lastLeague || !lastSessionToken) return;
    setBusy(true); setMessage("");
    try {
      const data = await requestFixtures(lastLeague.code, lastSessionToken);
      setFixturesData(data); setSelectedTeams([]);
      setMessageIsError(false);
      setMessage(data.fixtures.length ? "Fixtures loaded for your current round." : "No fixtures have been synced to staging yet. Team picks will be available when the fixture feed is connected.");
    } catch (error) {
      setMessageIsError(true); setMessage(error instanceof Error ? error.message : "Could not load fixtures.");
    } finally { setBusy(false); }
  }

  async function submitPick() {
    if (!lastLeague || !lastSessionToken) return;
    setBusy(true); setMessage("");
    try {
      await requestPick(lastLeague.code, lastSessionToken, selectedTeams, useMultiChip);
      setMessageIsError(false); setMessage("Pick submitted and locked for this round.");
      const [dash, fixtures] = await Promise.all([
        requestDashboard(lastLeague.code, lastSessionToken),
        requestFixtures(lastLeague.code, lastSessionToken),
      ]);
      setDashboard(dash); setFixturesData(fixtures); setSelectedTeams([]);
    } catch (error) {
      setMessageIsError(true); setMessage(error instanceof Error ? error.message : "Could not submit your pick.");
    } finally { setBusy(false); }
  }

  async function createLeague() {
    if (!playerName.trim() || !leagueName.trim()) {
      setMessageIsError(true);
      setMessage("Enter your name and a league name to continue.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await requestLeague("create", {
        playerName: playerName.trim(),
        leagueName: leagueName.trim(),
      });
      await savePlayerSession(result);
      await refreshSavedSessions();
      setLastSessionToken(result.sessionToken);
      setDashboard(null);
      setLastLeague({
        code: result.competition.code,
        name: result.competition.name,
        playerName: result.entry.name,
      });
      setLeagueCode(result.competition.code);
      setLeagueName("");
      setShowCreateForm(false);
      setMessageIsError(false);
      setMessage("League created. Your player session is saved securely on this device.");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not create the league.");
    } finally {
      setBusy(false);
    }
  }

  async function joinLeague() {
    if (!playerName.trim() || !leagueCode.trim()) {
      setMessageIsError(true);
      setMessage("Enter your name and the league invite code to continue.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await requestLeague("join", {
        playerName: playerName.trim(),
        leagueCode: leagueCode.trim().toUpperCase(),
      });
      await savePlayerSession(result);
      setLastSessionToken(result.sessionToken);
      setDashboard(null);
      setLastLeague({
        code: result.competition.code,
        name: result.competition.name,
        playerName: result.entry.name,
      });
      setLeagueCode(result.competition.code);
      setMessageIsError(false);
      setMessage("You have joined the league. Your player session is saved securely on this device.");
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not join the league.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>LMS</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PREMIER LEAGUE</Text>
            <Text style={styles.brand}>Last Man Standing</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>ONE PICK. EVERY ROUND.</Text>
          <Text style={styles.heroTitle}>Stay alive.</Text>
          <Text style={styles.heroBody}>
            Pick a team to win, survive the round, and be the last player standing.
          </Text>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillText}>20 clubs · One team per round</Text>
          </View>
        </View>

        <View style={styles.section}>
          {savedSessions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your saved leagues</Text>
              <Text style={styles.cardBody}>{restoring ? "Loading saved sessions…" : "Pick up where you left off on this device."}</Text>
              {savedSessions.map((session) => (
                <Pressable key={session.competitionCode + session.entryId} accessibilityRole="button"
                  disabled={busy} style={[styles.savedLeagueButton, busy && styles.disabledButton]}
                  onPress={() => reopenSavedSession(session)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedLeagueTitle}>{session.leagueName}</Text>
                    <Text style={styles.savedLeagueMeta}>{session.playerName} · Code {session.competitionCode}</Text>
                  </View>
                  <Text style={styles.buttonArrow}>↗</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.sectionTitle}>Your next move</Text>
          <Text style={styles.fieldLabel}>Your player name</Text>
          <TextInput
            accessibilityLabel="Your player name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            onChangeText={setPlayerName}
            placeholder="Enter your name"
            placeholderTextColor="#8a958e"
            style={styles.input}
            value={playerName}
          />

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={[styles.primaryButton, busy && styles.disabledButton]}
            onPress={() => {
              setShowCreateForm((visible) => !visible);
              setMessage("");
            }}
          >
            <Text style={styles.primaryButtonText}>
              {showCreateForm ? "Cancel league creation" : "Create a league"}
            </Text>
            <Text style={styles.buttonArrow}>{showCreateForm ? "−" : "↗"}</Text>
          </Pressable>

          {showCreateForm && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Start your own league</Text>
              <Text style={styles.cardBody}>Choose a name, then share the invite code with your friends.</Text>
              <TextInput
                accessibilityLabel="League name"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={60}
                onChangeText={setLeagueName}
                onSubmitEditing={createLeague}
                placeholder="e.g. Saturday Survivors"
                placeholderTextColor="#8a958e"
                returnKeyType="done"
                style={styles.input}
                value={leagueName}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                style={[styles.secondaryButton, busy && styles.disabledButton]}
                onPress={createLeague}
              >
                <Text style={styles.secondaryButtonText}>
                  {busy ? "Please wait…" : "Create and continue"}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join a league</Text>
            <Text style={styles.cardBody}>
              Enter the invite code shared by your organiser.
            </Text>
            <TextInput
              accessibilityLabel="League invite code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              onChangeText={setLeagueCode}
              onSubmitEditing={joinLeague}
              placeholder="e.g. 24B89C"
              placeholderTextColor="#8a958e"
              returnKeyType="go"
              style={styles.input}
              value={leagueCode}
            />
            <Pressable
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                (busy || !leagueCode.trim()) && styles.disabledButton,
              ]}
              disabled={busy || !leagueCode.trim()}
              onPress={joinLeague}
            >
              <Text style={styles.secondaryButtonText}>
                {busy ? "Please wait…" : "Continue to league"}
              </Text>
            </Pressable>
          </View>

          {!!message && (
            <View style={[styles.messageBox, messageIsError ? styles.errorBox : styles.successBox]}>
              <Text style={[styles.messageText, messageIsError ? styles.errorText : styles.successText]}>
                {message}
              </Text>
            </View>
          )}

          {lastLeague && (
            <View style={styles.successCard}>
              <Text style={styles.successEyebrow}>PLAYER SESSION SAVED</Text>
              <Text style={styles.successLeagueName}>{lastLeague.name}</Text>
              <Text style={styles.cardBody}>Playing as {lastLeague.playerName}</Text>
              <Text style={styles.inviteCodeLabel}>LEAGUE CODE</Text>
              <Text selectable style={styles.inviteCode}>{lastLeague.code}</Text>
              <Text style={styles.cardBody}>
                Keep this code to invite other players. The league dashboard and team-pick screen are the next features being connected.
              </Text>
            </View>
          )}
        </View>

        {lastLeague && (
          <View style={[styles.section, { paddingTop: 8 }]}>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !lastSessionToken}
              style={[styles.secondaryButton, busy && styles.disabledButton]}
              onPress={async () => {
                setBusy(true);
                setMessage("");
                try {
                  const data = await requestDashboard(lastLeague.code, lastSessionToken);
                  setDashboard(data);
                  setMessageIsError(false);
                  setMessage("League dashboard loaded. Other players' current-round picks are hidden.");
                } catch (error) {
                  setMessageIsError(true);
                  setMessage(error instanceof Error ? error.message : "Could not load the dashboard.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>{busy ? "Loading…" : "Open league dashboard"}</Text>
            </Pressable>

            {dashboard && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{dashboard.competition.name}</Text>
                <Text style={styles.cardBody}>Round {dashboard.competition.round} · Season {dashboard.competition.seasonNumber}</Text>
                <Text style={styles.cardBody}>
                  Your status: {dashboard.player.alive ? "Still alive" : "Eliminated"} · Multi Chip {dashboard.player.multiChipUsed ? "used" : "available"}
                </Text>
                <Text style={styles.cardTitle}>Players ({dashboard.entries.length})</Text>
                {dashboard.entries.map((entry) => (
                  <View key={entry.id} style={styles.playerRow}>
                    <Text style={styles.playerName}>{entry.name}{entry.id === dashboard.player.id ? " (you)" : ""}</Text>
                    <Text style={styles.playerStatus}>{entry.alive ? "Alive" : "Out"}</Text>
                  </View>
                ))}
                <Text style={styles.cardTitle}>Season winner history</Text>
                {dashboard.seasonWinners.length === 0 ? (
                  <Text style={styles.cardBody}>No completed seasons recorded yet.</Text>
                ) : dashboard.seasonWinners.map((winner) => (
                  <View key={winner.season_number} style={styles.playerRow}>
                    <Text style={styles.playerName}>Season {winner.season_number} · {winner.winner_name}</Text>
                    <Text style={styles.playerStatus}>{new Date(winner.completed_at).toLocaleDateString()}</Text>
                  </View>
                ))}
                {dashboard.competition.status === "finished" && dashboard.competition.isOwner && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    style={[styles.secondaryButton, busy && styles.disabledButton]}
                    onPress={() => {
                      const code = dashboard.competition.code;
                      const token = lastSessionToken;
                      Alert.alert(
                        "Start a new season?",
                        "This clears the current season's picks and restores all players. The completed-season winner record is kept.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Start new season", style: "destructive", onPress: async () => {
                            setBusy(true);
                            try {
                              await requestResetSeason(code, token);
                              const refreshed = await requestDashboard(code, token);
                              setDashboard(refreshed);
                              setFixturesData(null);
                              setSelectedTeams([]);
                              setUseMultiChip(false);
                              setMessage("A new season has started.");
                              setMessageIsError(false);
                            } catch (error) {
                              setMessage(error instanceof Error ? error.message : "Could not reset the season.");
                              setMessageIsError(true);
                            } finally {
                              setBusy(false);
                            }
                          } },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>{busy ? "Resetting…" : "Start new season"}</Text>
                  </Pressable>
                )}
                <Text style={styles.cardTitle}>Previous-round picks</Text>
                {dashboard.historicalPicks.length === 0 ? (
                  <Text style={styles.cardBody}>No completed rounds to show yet.</Text>
                ) : dashboard.historicalPicks.map((pick, index) => {
                  const entry = dashboard.entries.find((item) => item.id === pick.entry_id);
                  return (
                    <View key={`${pick.entry_id}-${pick.round}-${index}`} style={styles.playerRow}>
                      <Text style={styles.playerName}>R{pick.round} · {entry?.name ?? "Player"} · {pick.team}{pick.is_multi ? " (Multi Chip)" : ""}</Text>
                      <Text style={styles.playerStatus}>{pick.result ?? "Pending"}</Text>
                    </View>
                  );
                })}
                <Text style={styles.cardBody}>
                  {dashboard.ownCurrentPicks.length ? `Your current pick${dashboard.ownCurrentPicks.length > 1 ? "s" : ""}: ${dashboard.ownCurrentPicks.map((pick) => pick.team).join(", ")}` : "Your current-round pick has not been made yet."}
                </Text>
              </View>
            )}
          </View>
        )}

        {lastLeague && dashboard?.player.alive && dashboard.competition.status !== "finished" && dashboard.ownCurrentPicks.length === 0 && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Choose your team</Text>
              <Text style={styles.cardBody}>Your selection locks when submitted. You cannot reuse a team from a previous round.</Text>
              <Pressable accessibilityRole="button" disabled={busy} style={[styles.secondaryButton, busy && styles.disabledButton]} onPress={loadFixtures}>
                <Text style={styles.secondaryButtonText}>{busy ? "Loading…" : "Load current-round fixtures"}</Text>
              </Pressable>
              {fixturesData && (
                <>
                  <Text style={styles.cardBody}>Round {fixturesData.round} · Fixture matchday {fixturesData.fixtureMatchday}</Text>
                  {fixturesData.fixtures.length === 0 ? (
                    <Text style={styles.cardBody}>No fixtures are available in staging yet. The fixtures feed must be populated before picks can be submitted.</Text>
                  ) : (
                    <>
                      {fixturesData.fixtures
                        .filter((fixture) => {
                          const status = (fixture.status ?? "").toUpperCase();
                          const scheduled = ["TIMED", "SCHEDULED", "NS"].includes(status);
                          const kickoff = fixture.kickoff ? new Date(fixture.kickoff).getTime() : Number.NaN;
                          return scheduled && Number.isFinite(kickoff) && kickoff > Date.now();
                        })
                        .map((fixture) => {
                        const available = [fixture.home_team, fixture.away_team].filter((team): team is string => !!team && !fixturesData.usedTeams.some((used) => used.toLowerCase() === team.toLowerCase()));
                        return (
                          <View key={fixture.id} style={styles.fixtureRow}>
                            <Text style={styles.fixtureText}>{fixture.home_team ?? "TBC"} v {fixture.away_team ?? "TBC"}</Text>
                            <Text style={styles.fixtureMeta}>{fixture.kickoff ? new Date(fixture.kickoff).toLocaleString() : "Kick-off TBC"} · {fixture.status ?? "Unknown"}</Text>
                            {available.map((team) => (
                              <Pressable key={team} accessibilityRole="button" disabled={busy} onPress={() => setSelectedTeams((current) => current.includes(team) ? current.filter((item) => item !== team) : (useMultiChip ? current.length < 2 : current.length < 1) ? [...current, team] : current)} style={[styles.teamChoice, selectedTeams.includes(team) && styles.teamChoiceSelected]}>
                                <Text style={[styles.teamChoiceText, selectedTeams.includes(team) && styles.teamChoiceTextSelected]}>{selectedTeams.includes(team) ? "✓ " : ""}{team}</Text>
                              </Pressable>
                            ))}
                          </View>
                        );
                      })}
                      {!dashboard.player.multiChipUsed && (
                        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: useMultiChip }} onPress={() => { setUseMultiChip((v) => !v); setSelectedTeams([]); }} style={styles.chipToggle}>
                          <Text style={styles.chipToggleText}>{useMultiChip ? "☑" : "☐"} Use Multi Chip (choose two teams; either win keeps you alive)</Text>
                        </Pressable>
                      )}
                      <Text style={styles.cardBody}>Selected: {selectedTeams.length ? selectedTeams.join(", ") : "None"}</Text>
                      <Pressable accessibilityRole="button" disabled={busy || selectedTeams.length !== (useMultiChip ? 2 : 1)} style={[styles.primaryButton, (busy || selectedTeams.length !== (useMultiChip ? 2 : 1)) && styles.disabledButton]} onPress={submitPick}>
                        <Text style={styles.primaryButtonText}>{busy ? "Submitting…" : "Submit and lock pick"}</Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>The rules are simple.</Text>
          <Text style={styles.footerBody}>
            Choose a team you have not used before. A win keeps you in. A draw or loss means you are out.
          </Text>
          <Text style={styles.footerNote}>Staging preview · fixtures and picks are being validated</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: forest },
  page: { paddingBottom: 36, backgroundColor: "#f4f6f1" },
  header: {
    backgroundColor: forest,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: lime,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: forest, fontWeight: "900", fontSize: 15, letterSpacing: -0.5 },
  headerCopy: { gap: 2 },
  eyebrow: { color: lime, fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  brand: { color: "#ffffff", fontSize: 19, fontWeight: "800" },
  hero: {
    backgroundColor: forest,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroEyebrow: { color: lime, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  heroTitle: { color: "#ffffff", fontSize: 46, fontWeight: "900", letterSpacing: -1.8, marginTop: 10 },
  heroBody: { color: "#d9e3dc", fontSize: 16, lineHeight: 24, marginTop: 8, maxWidth: 330 },
  rulePill: {
    alignSelf: "flex-start",
    marginTop: 22,
    backgroundColor: "#243c30",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 99,
  },
  rulePillText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  section: { paddingHorizontal: 20, paddingTop: 28, gap: 14 },
  sectionTitle: { color: forest, fontSize: 22, fontWeight: "900", marginBottom: 2 },
  fieldLabel: { color: forest, fontSize: 13, fontWeight: "800", marginBottom: -7 },
  primaryButton: {
    backgroundColor: lime,
    borderRadius: 16,
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryButtonText: { color: forest, fontSize: 16, fontWeight: "900" },
  buttonArrow: { color: forest, fontSize: 22, fontWeight: "700" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8e0",
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: forest, fontSize: 18, fontWeight: "900" },
  cardBody: { color: muted, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#dbe2da",
    backgroundColor: "#f8faf7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: forest,
    letterSpacing: 0.3,
    marginTop: 3,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: forest,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  disabledButton: { opacity: 0.45 },
  messageBox: { padding: 14, borderRadius: 14, borderWidth: 1 },
  errorBox: { backgroundColor: "#fff0ed", borderColor: "#f5c0b8" },
  successBox: { backgroundColor: "#edf7df", borderColor: "#c9e4a1" },
  messageText: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  errorText: { color: "#9d3023" },
  successText: { color: "#234b2d" },
  fixtureRow: { borderTopWidth: 1, borderTopColor: "#e3e8e0", paddingTop: 12, gap: 7 },
  fixtureText: { color: forest, fontSize: 15, fontWeight: "800" },
  fixtureMeta: { color: muted, fontSize: 12 },
  teamChoice: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#dbe2da", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f8faf7" },
  teamChoiceSelected: { backgroundColor: forest, borderColor: forest },
  teamChoiceText: { color: forest, fontSize: 14, fontWeight: "700" },
  teamChoiceTextSelected: { color: "#ffffff" },
  chipToggle: { paddingVertical: 10 },
  chipToggleText: { color: forest, fontSize: 13, fontWeight: "700" },
  savedLeagueButton: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#edf0eb" },
  savedLeagueTitle: { color: forest, fontSize: 14, fontWeight: "800" },
  savedLeagueMeta: { color: muted, fontSize: 12, marginTop: 3 },
  playerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#edf0eb" },
  playerName: { color: forest, fontSize: 13, fontWeight: "700", flex: 1 },
  playerStatus: { color: muted, fontSize: 12, fontWeight: "700" },
  successCard: {
    backgroundColor: forest,
    borderRadius: 20,
    padding: 20,
    gap: 9,
  },
  successEyebrow: { color: lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  successLeagueName: { color: "#ffffff", fontSize: 24, fontWeight: "900" },
  inviteCodeLabel: { color: "#b8c8bd", fontSize: 10, fontWeight: "800", letterSpacing: 1.7, marginTop: 8 },
  inviteCode: { color: lime, fontSize: 34, fontWeight: "900", letterSpacing: 5 },
  footer: { paddingHorizontal: 22, paddingTop: 30, gap: 8 },
  footerTitle: { color: forest, fontSize: 18, fontWeight: "900" },
  footerBody: { color: muted, fontSize: 14, lineHeight: 21 },
  footerNote: { color: "#89948d", fontSize: 11, marginTop: 10 },
});
