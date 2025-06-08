import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import React, { useContext, useEffect } from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import MenuTitle from "../../Components/MenuTitle";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";
import { InventoryContext } from "../../Context/InventoryContext";
import { SalesContext } from "../../Context/SalesContext";
// import SideMenu from "../../Components/SideMenu";

const DashboardScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const navigation = useNavigation();
  const { themeStyles } = useTheme();
  const { items } = useContext(InventoryContext);
  const { orders } = useContext(SalesContext);
  const [menuVisible, setMenuVisible] = React.useState(false);

  // Calculate inventory statistics
  const totalProducts = items.length;
  const totalProductUnits = items.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 0),
    0
  );
  const lowInStock = items.filter(
    (item) => (parseInt(item.quantity) || 0) < 10
  ).length;
  const needsReplenishment = items.filter(
    (item) => (parseInt(item.quantity) || 0) < 20
  ).length;

  // Calculate sales statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum +
      (parseFloat(order.total_amount) || 0),
    0
  );
  const totalUnitsSold = orders.reduce(
    (sum, order) => sum + (parseInt(order.total_items) || 0),
    0
  );
  const totalCustomers = new Set(orders.map((order) => order.customer_name))
    .size;

  useEffect(() => {
    const backAction = () => {
      if (pageTitle === "Dashboard") {
        Alert.alert("Log Out", "Do you want to Log out?", [
          { text: "Cancel", onPress: () => null, style: "cancel" },
          { text: "Yes", onPress: () => navigation.replace("Login") },
        ]);
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [pageTitle]);

  return (
    <View style={{ flex: 1, backgroundColor: themeStyles.backgroundColor }}>
      {/* <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} /> */}
      <View
        style={{
          width: "100%",
          paddingHorizontal: 10,
          alignItems: "center",
          height: 170,
          backgroundColor: themeStyles.headerColor,
        }}
      >
        <View style={{ width: "100%", flex: 1 }}>
          <MenuTitle pageTitle={pageTitle} onMenuPress={() => setMenuVisible(true)} />
          <Text style={{ color: "#F0F0F0" }}>Welcome, Terence!</Text>
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 10,
          paddingBottom: Platform.OS === 'ios' ? 100 : 80,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Inventory Overview */}
        <View
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            backgroundColor: themeStyles.containerColor,
            marginBottom: 10,
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
              marginBottom: 20,
              color: themeStyles.textColor,
            }}
          >
            Inventory Overview
          </Text>

          {/* Stats */}
          <View
            style={{ flexDirection: "row", width: "100%", marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#187498",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Products
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {totalProducts}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#36AE7C",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Product Units
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {totalProductUnits}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", width: "100%" }}>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#F9D923",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Replenishment
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {needsReplenishment}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#ff595e",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text style={{ fontWeight: 400, color: "#D61414" }}>
                  Low in Stock
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {lowInStock}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sales Overview */}
        <View
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            backgroundColor: themeStyles.containerColor,
            marginBottom: 10,
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
              color: themeStyles.textColor,
            }}
          >
            Sales Overview
          </Text>
          <Text
            style={{
              fontWeight: 500,
              fontSize: 12,
              color: "#888888",
              marginBottom: 20,
            }}
          >
            February
          </Text>

          {/* Stats */}
          <View
            style={{ flexDirection: "row", width: "100%", marginBottom: 16 }}
          >
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#6B6593",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Revenue
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  ₱{totalRevenue.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#F5DB13",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Orders
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {totalOrders}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", width: "100%" }}>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#F58413",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Units Sold
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {totalUnitsSold}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", width: "50%" }}>
              <View
                style={{
                  height: 50,
                  width: 5,
                  backgroundColor: "#D61414",
                  borderRadius: 5,
                }}
              />
              <View
                style={{ justifyContent: "space-between", marginLeft: 10 }}
              >
                <Text
                  style={{ fontWeight: 400, color: themeStyles.textColor }}
                >
                  Total Customers
                </Text>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: 18,
                    color: themeStyles.textColor,
                  }}
                >
                  {totalCustomers}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;
