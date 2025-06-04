import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";

const dummyTracking = [
  {
    status: "Order Placed",
    date: "2025-05-29 10:00 AM",
    icon: "cart-arrow-down",
    done: true,
  },
  {
    status: "Order Confirmed",
    date: "2025-05-29 10:10 AM",
    icon: "check-decagram",
    done: false,
  },
  {
    status: "Packed",
    date: "2025-05-29 12:00 PM",
    icon: "package-variant-closed",
    done: false,
  },
  {
    status: "Shipped",
    date: "2025-05-29 3:00 PM",
    icon: "truck-fast",
    done: false,
  },
  {
    status: "Out for Delivery",
    date: "",
    icon: "map-marker-path",
    done: false,
  },
  {
    status: "Delivered",
    date: "",
    icon: "home",
    done: false,
  },
];

const estimatedArrival = "May 31, 2025, 2:00 PM";

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { darkMode } = useTheme();
  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    accent: darkMode ? "#4F8EF7" : "#6B6593",
    timelineDone: darkMode ? "#4F8EF7" : "#6B6593",
    timelinePending: darkMode ? "#393A3B" : "#E0E0E0",
    infoBg: darkMode ? "#23243a" : "#F0F6FF",
    infoText: "#4F8EF7",
    border: darkMode ? "#393A3B" : "#C7C5D1",
  };

  const { product } = route.params || {};
  const item = product
    ? {
        image: product.image,
        title: product.title,
        subtitle: product.subtitle,
        desc: product.desc,
      }
    : {
        image: product.image,
        title: product.title,
        subtitle: product.subtitle,
        desc: product.desc,
      };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.navigate("Home")}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="Delivery Tracking"
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Item Card */}
        <View
          style={[
            styles.itemCard,
            {
              backgroundColor: colors.card,
              shadowColor: colors.text,
              borderColor: colors.border,
            },
          ]}
        >
          <Image source={item.image} style={styles.itemImage} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.itemSubtitle, { color: colors.text }]}>
              {item.subtitle}
            </Text>
            <Text style={[styles.itemDesc, { color: colors.text }]}>
              {item.desc}
            </Text>
          </View>
        </View>
        {/* ETA */}
        <View style={[styles.etaBox, { backgroundColor: colors.infoBg }]}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color={colors.infoText}
          />
          <Text style={[styles.etaText, { color: colors.infoText }]}>
            Estimated Arrival:{" "}
            <Text style={{ fontWeight: "bold" }}>{estimatedArrival}</Text>
          </Text>
        </View>

        {/* Link Holder */}
        <TouchableOpacity
          style={styles.linkHolder}
          onPress={() => {
            Linking.openURL("https://www.jtexpress.ph/track-and-trace");
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="link-variant"
            size={18}
            color={colors.accent}
          />
          <Text style={[styles.linkText, { color: colors.accent }]}>
            View Tracking Link
          </Text>
        </TouchableOpacity>

        {/* Vertical Tracking Progress */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tracking Progress
          </Text>
          <View style={styles.timelineVertical}>
            {dummyTracking.map((step, idx) => (
              <View key={step.status} style={styles.timelineRowVertical}>
                <View style={styles.timelineIconColVertical}>
                  <View
                    style={[
                      styles.timelineIconVertical,
                      {
                        backgroundColor: step.done
                          ? colors.timelineDone
                          : colors.timelinePending,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={step.icon}
                      size={22}
                      color={step.done ? "#fff" : "#888"}
                    />
                  </View>
                  {/* Vertical line below the icon, except for the last item */}
                  {idx < dummyTracking.length - 1 && (
                    <View
                      style={[
                        styles.timelineLineVertical,
                        {
                          backgroundColor: dummyTracking[idx + 1].done
                            ? colors.timelineDone
                            : colors.timelinePending,
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineContentVertical}>
                  <Text
                    style={[
                      styles.timelineStatusVertical,
                      {
                        color: step.done ? colors.accent : "#888",
                        textAlign: "left",
                      },
                    ]}
                  >
                    {step.status}
                  </Text>
                  {step.date ? (
                    <Text style={styles.timelineDateVertical}>{step.date}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.infoBg }]}>
            <MaterialCommunityIcons
              name="information"
              size={18}
              color={colors.infoText}
            />
            <Text style={[styles.infoText, { color: colors.infoText }]}>
              You will receive a notification once your order is out for
              delivery.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 4,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 32,
  },
  itemCard: {
    width: "92%",
    flexDirection: "row",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 10,
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#EDECF3",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    color: "#888",
  },
  etaBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 10,
    width: "92%",
  },
  etaText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  card: {
    width: "92%",
    borderRadius: 10,
    padding: 18,
    marginTop: 8,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 18,
    textAlign: "center",
  },
  timelineVertical: {
    flexDirection: "column",
    alignItems: "flex-start",
    paddingBottom: 12,
    paddingTop: 8,
    width: "100%",
  },
  timelineRowVertical: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    position: "relative",
    width: "100%",
    minHeight: 48,
  },
  timelineIconColVertical: {
    alignItems: "center",
    marginRight: 16,
    width: 32,
    position: "relative",
  },
  timelineIconVertical: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  timelineLineVertical: {
    width: 4,
    height: 36,
    backgroundColor: "#E0E0E0",
    position: "absolute",
    top: 32,
    left: 14,
    borderRadius: 2,
    zIndex: 0,
  },
  timelineContentVertical: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 2,
  },
  timelineStatusVertical: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "left",
  },
  timelineDateVertical: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    textAlign: "left",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  linkHolder: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: "4%",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F5F5F7",
  },
  linkText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});

export default DeliveryTrackingScreen;
