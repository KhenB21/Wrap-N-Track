import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Alert } from "react-native";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";
import { STUDIO } from "../constants/studio";

const openLink = (url) => Linking.openURL(url).catch(() => Alert.alert("Unable to open", url));

export default function AboutScreen({ navigation }) {
  const { darkMode } = useTheme();
  const c = {
    bg: darkMode ? "#18191A" : "#F5F4FA",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#E4E6EB" : "#222",
    sub: darkMode ? "#B0B3B8" : "#6B6593",
    border: darkMode ? "#393A3B" : "#EDECF3",
    wash: darkMode ? "#393A3B" : "#F5F4FA",
  };
  const version = Constants?.expoConfig?.version || "1.0.0";

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header showBack onBackPress={() => navigation.goBack()} darkMode={darkMode} title="About" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.border }]}>
          <Image source={require("../Images/Logo/pensee-logo-square.png")} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.name, { color: c.text }]}>{STUDIO.name}</Text>
          <Text style={[styles.tagline, { color: c.sub }]}>Curated gift boxes for every occasion</Text>
          <View style={[styles.versionPill, { backgroundColor: c.wash }]}>
            <Text style={[styles.versionText, { color: c.sub }]}>App version {version}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Who we are</Text>
          <Text style={[styles.body, { color: c.sub }]}>
            {STUDIO.name} creates personalized gift boxes for weddings, corporate events and special
            celebrations. Through this app you can browse our collection, build your own gift box, place
            orders and follow your delivery from preparation to your doorstep.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Find us</Text>
          {[
            { icon: "map-marker-outline", label: STUDIO.location, url: STUDIO.mapUrl },
            { icon: "email-outline", label: STUDIO.email, url: `mailto:${STUDIO.email}` },
            { icon: "instagram", label: STUDIO.instagramLabel, url: STUDIO.instagramUrl },
            { icon: "facebook", label: STUDIO.facebookLabel, url: STUDIO.facebookUrl },
          ].map((row, i, all) => (
            <TouchableOpacity
              key={row.label}
              onPress={() => openLink(row.url)}
              style={[styles.row, i < all.length - 1 && { borderBottomColor: c.border, borderBottomWidth: 1 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: c.wash }]}>
                <MaterialCommunityIcons name={row.icon} size={18} color={c.sub} />
              </View>
              <Text style={[styles.rowText, { color: c.text }]}>{row.label}</Text>
              <MaterialCommunityIcons name="open-in-new" size={16} color={c.sub} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.footer, { color: c.sub }]}>© {new Date().getFullYear()} {STUDIO.name}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 24, marginBottom: 14 },
  logo: { width: 96, height: 96, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  tagline: { fontSize: 14, marginTop: 4, textAlign: "center" },
  versionPill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 12 },
  versionText: { fontSize: 12, fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 14, fontWeight: "500" },
  footer: { textAlign: "center", fontSize: 12, marginTop: 8 },
});
