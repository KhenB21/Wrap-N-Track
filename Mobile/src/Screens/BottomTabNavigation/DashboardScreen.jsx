import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import React, { useContext } from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import MenuTitle from "../../Components/MenuTitle";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";
import { InventoryContext } from "../../Context/InventoryContext";

const DashboardScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const navigation = useNavigation();
  const { themeStyles } = useTheme();
  const { items } = useContext(InventoryContext);

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

  // Calculate sales statistics (initialize to 0 for now)
  const totalRevenue = 0;
  const totalOrders = 0;
  const totalUnitsSold = 0;
  const totalCustomers = 0;

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
    <View style={{ flex: 1, alignItems: "center", paddingBottom: 165 }}>
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
          <MenuTitle pageTitle={pageTitle} />
          <Text style={{ color: "#F0F0F0" }}>Welcome, Terence!</Text>
        </View>
      </View>
      <View
        style={{
          width: "100%",
          alignItems: "center",
          backgroundColor: themeStyles.backgroundColor,
        }}
      >
        <ScrollView
          style={{ width: "100%", height: "100%" }}
          contentContainerStyle={{
            padding: 10,
            paddingBottom: 75,
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

            {/* Buttons */}
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
                color: themeStyles.textColor,
              }}
            >
              February
            </Text>

            {/* Buttons */}
            <View
              style={{ flexDirection: "row", width: "100%", marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", width: "50%" }}>
                <View
                  style={{
                    height: 50,
                    width: 5,
                    backgroundColor: "blue",
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
                    {totalRevenue}
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
          <View
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              backgroundColor: themeStyles.containerColor,
            }}
          >
            {/* Sales Activity */}
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 20,
                color: themeStyles.textColor,
              }}
            >
              Sales Overview
            </Text>
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                flexDirection: "column",
              }}
            >
              <View style={{ flexDirection: "row", marginBottom: 20 }}>
                <View
                  style={{
                    height: 50,
                    width: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 25,
                    backgroundColor: "#D61414",
                  }}
                >
                  <Icon name="package" size={32} color={"#FDFDFD"} />
                </View>
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
              <View style={{ flexDirection: "row", marginBottom: 20 }}>
                <View
                  style={{
                    height: 50,
                    width: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 25,
                    backgroundColor: "#F58413",
                  }}
                >
                  <Icon name="package" size={32} color={"#FDFDFD"} />
                </View>
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
              <View style={{ flexDirection: "row" }}>
                <View
                  style={{
                    height: 50,
                    width: 50,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 25,
                    backgroundColor: "blue",
                  }}
                >
                  <Icon name="package" size={32} color={"#FDFDFD"} />
                </View>
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
    </View>
  );
};

export default DashboardScreen;
