import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const data = await AsyncStorage.getItem("user");
      if (data) setUser(JSON.parse(data));
    };
    fetchUser();
  }, []);

  const avatar = require("../../assets/Images/Default Profile.jpg");

  return (
    <View style={styles.container}>
      <Image source={avatar} style={styles.avatar} />
      <Text style={styles.name}>{user?.name || "Juan Dela Cruz"}</Text>
      <Text style={styles.email}>{user?.email || "jdc@email.com"}</Text>
      <Text style={styles.label}>Phone:</Text>
      <Text style={styles.value}>{user?.phone || "—"}</Text>
      <Text style={styles.label}>Address:</Text>
      <Text style={styles.value}>{user?.address || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 18,
  },
  name: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#726d8a",
    marginBottom: 2,
    fontFamily: "serif",
  },
  email: {
    fontSize: 15,
    color: "#888",
    marginBottom: 18,
    fontFamily: "serif",
  },
  label: {
    fontWeight: "bold",
    color: "#726d8a",
    fontSize: 14,
    marginTop: 16,
    fontFamily: "serif",
  },
  value: {
    fontSize: 15,
    color: "#444",
    fontFamily: "serif",
  },
});
