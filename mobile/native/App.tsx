import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
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

async function requestLeague(
  action: "create" | "join",
  payload: { playerName: string; leagueName?: string; leagueCode?: string },
): Promise<LeagueResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "The staging connection is not configured. Copy .env.example to .env and add the staging Supabase URL and publishable key.",
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/mobile-league`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
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

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>The rules are simple.</Text>
          <Text style={styles.footerBody}>
            Choose a team you have not used before. A win keeps you in. A draw or loss means you are out.
          </Text>
          <Text style={styles.footerNote}>Staging preview · Create/join is connected; picks are not connected yet</Text>
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
