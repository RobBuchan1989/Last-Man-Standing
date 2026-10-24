import { StatusBar } from "expo-status-bar";
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

export default function App() {
  const [leagueCode, setLeagueCode] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page}>
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
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => {
              // Connected to the staging create-league API in the next implementation step.
            }}
          >
            <Text style={styles.primaryButtonText}>Create a league</Text>
            <Text style={styles.buttonArrow}>↗</Text>
          </Pressable>

          <View style={styles.joinCard}>
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
              placeholder="e.g. 24B89C"
              placeholderTextColor="#8a958e"
              style={styles.input}
              value={leagueCode}
            />
            <Pressable
              accessibilityRole="button"
              style={[styles.secondaryButton, !leagueCode.trim() && styles.disabledButton]}
              disabled={!leagueCode.trim()}
              onPress={() => {
                // Connected to the staging join flow in the next implementation step.
              }}
            >
              <Text style={styles.secondaryButtonText}>Continue to league</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>The rules are simple.</Text>
          <Text style={styles.footerBody}>
            Choose a team you have not used before. A win keeps you in. A draw or loss means you are out.
          </Text>
          <Text style={styles.footerNote}>Mobile preview · Game actions are not connected yet</Text>
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
  joinCard: {
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
    letterSpacing: 1.2,
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
  footer: { paddingHorizontal: 22, paddingTop: 30, gap: 8 },
  footerTitle: { color: forest, fontSize: 18, fontWeight: "900" },
  footerBody: { color: muted, fontSize: 14, lineHeight: 21 },
  footerNote: { color: "#89948d", fontSize: 11, marginTop: 10 },
});
