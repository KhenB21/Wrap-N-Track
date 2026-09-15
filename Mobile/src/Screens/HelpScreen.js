import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";
import { STUDIO } from "../constants/studio";

const openLink = (url) => Linking.openURL(url).catch(() => Alert.alert("Unable to open", url));

const FAQS = [
  {
    q: "How do I place an order?",
    a: "Browse the Catalog, add a box from Packaging and the items you want to your cart, then open the Cart and tap Checkout. You can also use Create Gift to build a box step by step.",
  },
  {
    q: "Why can't I check out?",
    a: "Every order needs one box from the Packaging category. If your cart only has products, add a box first. Also make sure your mobile number is 11 digits starting with 09 and that you picked an event or delivery date.",
  },
  {
    q: "How do I confirm my order?",
    a: "After tapping Place Order we send a 6-digit code to your account email. Enter it to confirm the order.",
  },
  {
    q: "Where can I track my delivery?",
    a: "Open the Deliveries tab and tap your order to see its status, courier and tracking details.",
  },
  {
    q: "How do I pay?",
    a: "Our team coordinates payment with you after your order is placed. A down payment confirms your order and the remaining balance is settled before delivery.",
  },
  {
    q: "Can I get quick answers in the app?",
    a: "Yes. Tap the chat button on any shopping screen to ask our assistant about products, bundles and ordering.",
  },
];

export default function HelpScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [open, setOpen] = useState(0);
  const c = {
    bg: darkMode ? "#18191A" : "#F5F4FA",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#E4E6EB" : "#222",
    sub: darkMode ? "#B0B3B8" : "#6B6593",
    border: darkMode ? "#393A3B" : "#EDECF3",
    wash: darkMode ? "#393A3B" : "#F5F4FA",
    accent: "#6B6593",
  };

  const contacts = [
    { icon: "email-outline", title: "Email us", detail: STUDIO.email, url: `mailto:${STUDIO.email}` },
    { icon: "instagram", title: "Instagram", detail: STUDIO.instagramLabel, url: STUDIO.instagramUrl },
    { icon: "facebook", title: "Facebook", detail: STUDIO.facebookLabel, url: STUDIO.facebookUrl },
    { icon: "map-marker-outline", title: "Visit", detail: STUDIO.location, url: STUDIO.mapUrl },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header showBack onBackPress={() => navigation.goBack()} darkMode={darkMode} title="Help & Support" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: c.sub }]}>CONTACT {STUDIO.name.toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {contacts.map((row, i) => (
            <TouchableOpacity
              key={row.title}
              onPress={() => openLink(row.url)}
              style={[styles.row, i < contacts.length - 1 && { borderBottomColor: c.border, borderBottomWidth: 1 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: c.wash }]}>
                <MaterialCommunityIcons name={row.icon} size={20} color={c.accent} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{row.title}</Text>
                <Text style={[styles.rowDetail, { color: c.sub }]}>{row.detail}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={c.sub} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: c.sub }]}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {FAQS.map((item, i) => {
            const expanded = open === i;
            return (
              <View key={item.q} style={i < FAQS.length - 1 && { borderBottomColor: c.border, borderBottomWidth: 1 }}>
                <TouchableOpacity
                  onPress={() => setOpen(expanded ? -1 : i)}
                  style={styles.faqHead}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                >
                  <Text style={[styles.faqQ, { color: c.text }]}>{item.q}</Text>
                  <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={c.sub} />
                </TouchableOpacity>
                {expanded && <Text style={[styles.faqA, { color: c.sub }]}>{item.a}</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  flex1: { flex: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginBottom: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowDetail: { fontSize: 13, marginTop: 1 },
  faqHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  faqQ: { flex: 1, fontSize: 15, fontWeight: "600" },
  faqA: { fontSize: 14, lineHeight: 21, paddingBottom: 14 },
});
