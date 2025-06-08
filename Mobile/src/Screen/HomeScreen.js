import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import Header from "../Components/Header";


const imageMap = {
  "Gian_Becka": require("../../assets/Images/Gian_Becka.png"),
  "Eric_Mariel": require("../../assets/Images/Eric_Mariel.png"),
  "Carlo_Isabelle": require("../../assets/Images/Carlo_Isabelle.png"),
};

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from backend
    axios
      .get("http://10.0.2.2:5000/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => alert("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  // Filter products by search text
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
    >
      <Image
        source={
          imageMap[item.image_url]
        }
        style={styles.productImage}
      />
      <View>
        <Text style={styles.productName}>{item.name}</Text>
        <Text numberOfLines={2}>{item.description}</Text>
        <Text style={styles.productPrice}>₱{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Header
        title="Gift Box Products"
        onMenuPress={() => navigation.openDrawer && navigation.openDrawer()} // works if using Drawer
        onCartPress={() => navigation.navigate("Cart")}
      />
      <Text style={styles.title}>Gift Box Products</Text>
      <TextInput
        style={styles.searchBar}
        placeholder="Search products"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  searchBar: {
    backgroundColor: "#f3f3f3",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    elevation: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    marginRight: 14,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },
  productName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  productPrice: {
    marginTop: 2,
    color: "#278c4b",
    fontWeight: "bold",
  },
});
