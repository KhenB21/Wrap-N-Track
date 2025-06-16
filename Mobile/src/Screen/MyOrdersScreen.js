import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Header from "../Components/Header";

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserEmail(user.email);
        axios
          .get(`http://10.0.2.2:5000/api/orders/email/${user.email}`)
          .then((res) => setOrders(res.data))
          .catch((err) => console.error("Error loading orders", err))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header navigation={navigation} />
      <View style={{ height: 90 }} />
      <Text style={styles.title}>My Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <Text style={styles.orderName}>{item.name}</Text>
              <Text style={styles.orderDesc}>
                Status: <Text style={{ fontWeight: "bold" }}>{item.status}</Text>
              </Text>
              <Text style={styles.orderDesc}>
                Delivery: {item.expected_delivery?.slice(0, 10)}
              </Text>
              <Text style={styles.orderDesc}>
                Total: ₱{item.total_cost}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 16,
    color: "#726d8a",
    fontFamily: "serif",
    marginBottom: 12,
    letterSpacing: 1,
  },
  noOrders: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 80,
    fontFamily: "serif",
  },
  orderCard: {
    backgroundColor: "#f7f5fa",
    borderRadius: 14,
    margin: 10,
    padding: 18,
    elevation: 2,
  },
  orderName: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#726d8a",
    marginBottom: 6,
    fontFamily: "serif",
  },
  orderDesc: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
    fontFamily: "serif",
  },
});
