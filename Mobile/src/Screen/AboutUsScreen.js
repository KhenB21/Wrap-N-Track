import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import Header from "../Components/Header";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 70;

export default function AboutUsScreen({ navigation }) {
  // Animation for the value texts
  const values = ["Bespoke", "Empowered", "Patriotic"];
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={{ flex: 1, backgroundColor: "#faf8ea" }}>
      <Header title="About Pensée" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ height: HEADER_HEIGHT }} />

        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("../../assets/Banner/AboutUs.png")}
            style={styles.banner}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerText}>About Pensée</Text>
          </View>
        </View>

        {/* ANIMATED Three Values */}
        <View style={{ width: "100%", height: 100, marginBottom: 28, alignItems: "center" }}>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.6}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: (width - width * 0.6) / 2,
              alignItems: "center",
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {values.map((value, i) => {
              const inputRange = [
                (i - 1) * width * 0.6,
                i * width * 0.6,
                (i + 1) * width * 0.6,
              ];
              const translateX = scrollX.interpolate({
                inputRange,
                outputRange: [-50, 0, 50],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={value}
                  style={[
                    styles.valueItem,
                    {
                      transform: [{ translateX }],
                      opacity,
                    },
                  ]}
                >
                  <Text style={styles.valueText}>{value}</Text>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        </View>

        {/* --- REST OF YOUR ABOUT US --- */}
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
        <Text style={[styles.bodyText, { marginTop: 22 }]}>
          The soul of Pensée is thoughtful and purposeful gift-giving.
        </Text>
        <Text style={[styles.bodyText, { marginTop: 6 }]}>
          We also strongly support Filipino-owned homegrown, start-up, and
          established businesses. We advocate for them, bring them together, and
          highlight their potential.
        </Text>
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
  },
  bannerContainer: {
    width: "100%",
    height: width * 0.54,
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
  valueItem: {
    width: width * 0.6,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  valueText: {
    color: "#8680a3",
    fontSize: 24,
    fontFamily: "serif",
    fontWeight: "700",
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
