import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import Header from "../Components/Header";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 70; // Adjust if your Header is taller/shorter

export default function AboutUsScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#faf8ea" }}>
      <Header title="About Pensée" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Spacer for Header */}
        <View style={{ height: HEADER_HEIGHT }} />

        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("../../assets/Banner/AboutUs.png")} // <-- use your banner image here
            style={styles.banner}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerText}>About Pensée</Text>
          </View>
        </View>

        {/* Three Values */}
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>Bespoke</Text>
          <Text style={styles.valueText}>Empowered</Text>
          <Text style={styles.valueText}>Patriotic</Text>
        </View>

        {/* Our Story */}
        <Text style={styles.sectionTitle}>Our Story</Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "400" }}>
            Pensée Gifting Studio offers{" "}
            <Text style={styles.italic}>curated</Text> and{" "}
            <Text style={styles.italic}>bespoke</Text> gift boxes and features{" "}
            <Text style={styles.italic}>local brands</Text> and{" "}
            <Text style={styles.italic}>entrepreneurs</Text>.
          </Text>
        </Text>
        <Text style={[styles.bodyText, { marginTop: 10 }]}>
          It started on a Tuesday afternoon over coffee, with co-founders
          Keizelle and Iana, planning to collaborate their own small brands into
          a unique gift concept. It grew with MJ and blossomed into creating
          thematic boxes that convey special messages. For us, gift-giving is
          extending a part of yourself and saying,
        </Text>
        <Text style={styles.italicQuote}>
          "I thought about you while buying this."
        </Text>

        {/* Soul of Pensée */}
        <Text style={[styles.bodyText, { marginTop: 22 }]}>
          The soul of Pensée is thoughtful and purposeful gift-giving.
        </Text>
        <Text style={[styles.bodyText, { marginTop: 6 }]}>
          We also strongly support Filipino-owned homegrown, start-up, and
          established businesses. We advocate for them, bring them together, and
          highlight their potential.
        </Text>

        {/* Mission Statement */}
        <Text style={[styles.bodyText, { marginTop: 22, marginBottom: 34 }]}>
          At Pensée, we ensure that our gift boxes are{" "}
          <Text style={styles.italic}>meticulously curated</Text> and{" "}
          <Text style={styles.italic}>impeccably executed</Text>, while bringing
          life to the <Text style={styles.italic}>essence of gift-giving</Text>.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 18,
    // No need for paddingTop since we use a spacer View
  },
  bannerContainer: {
    width: "100%",
    height: width * 0.54, // for a 2:1 ratio, adjust as needed
    marginBottom: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  banner: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  bannerOverlay: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    width: "78%",
    backgroundColor: "#f7f4e1cc",
    paddingVertical: 13,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    color: "#8680a3",
    fontSize: 27,
    fontFamily: "serif",
    fontWeight: "500",
    letterSpacing: 2,
    textAlign: "center",
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 8,
    marginBottom: 28,
  },
  valueText: {
    color: "#8680a3",
    fontSize: 18,
    fontFamily: "serif",
    fontWeight: "400",
    letterSpacing: 2,
  },
  sectionTitle: {
    fontFamily: "cursive",
    color: "#8680a3",
    fontSize: 24,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 14,
    fontWeight: "500",
    letterSpacing: 2,
  },
  bodyText: {
    color: "#494548",
    fontFamily: "serif",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    fontWeight: "400",
  },
  italic: {
    fontStyle: "italic",
    color: "#7d789b",
  },
  italicQuote: {
    fontStyle: "italic",
    color: "#7d789b",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 6,
    fontSize: 17,
  },
});
