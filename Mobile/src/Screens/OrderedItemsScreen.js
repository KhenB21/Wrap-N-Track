import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useTheme } from "../Context/ThemeContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useOrders } from "../Context/OrdersContext";
import { useNavigation } from "@react-navigation/native";
import Header from "../Components/Header"; // <-- Import your Header

export default function OrderedItemsScreen() {
  const navigation = useNavigation();
  const { orders } = useOrders();
  const { darkMode } = useTheme();
  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    accent: darkMode ? "#4F8EF7" : "#6B6593",
    border: darkMode ? "#393A3B" : "#C7C5D1",
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate("DeliveryTracking", { product: item })}
      activeOpacity={0.8}
    >
      <Image source={item.image} style={styles.itemImage} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.itemSubtitle, { color: colors.text }]}>{item.subtitle}</Text>
        <Text style={[styles.itemDesc, { color: colors.text }]}>{item.desc}</Text>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name="truck-fast"
            size={16}
            color={colors.accent}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusText, { color: colors.accent }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.accent} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="My Orders"
      />
      <FlatList
        data={orders}
        keyExtractor={(item, idx) => item.id ? item.id.toString() : idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        style={{ width: "100%" }}
        ListEmptyComponent={
          <Text style={{ color: colors.text, textAlign: "center", marginTop: 40 }}>
            No orders yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: "#F5F5F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#EDECF3",
    marginBottom: 2,
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
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
