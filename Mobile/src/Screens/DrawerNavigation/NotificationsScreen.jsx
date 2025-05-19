import { View, Text, ScrollView } from "react-native";
import React from "react";
import MenuTitle from "../../Components/MenuTitle";
import NotificationItem from "../../Components/NotificationItem";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";

const NotificationScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const { themeStyles } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          alignItems: "center",
          height: 150,
          backgroundColor: themeStyles.headerColor,
        }}
      >
        <View style={{ width: "92%", flex: 1 }}>
          <MenuTitle pageTitle={pageTitle} />
        </View>
      </View>

      <View
        style={{
          flex: 3,
          width: "100%",
          alignItems: "center",
          backgroundColor: themeStyles.backgroundColor,
        }}
      >
        <ScrollView
          style={{ width: "92%" }}
          contentContainerStyle={{ paddingBottom: 70 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: "100%",
              backgroundColor: themeStyles.containerColor,
              height: 380,
              padding: 10,
              marginTop: 10,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 10,
                color: themeStyles.textColor,
              }}
            >
              Earlier
            </Text>
            <NotificationItem
              time={"10"}
              icon={"truck"}
              iconColor={"#47D614"}
              message={
                "Order #00001 for Reinan John Briones is out for delivery."
              }
              themeStyles={themeStyles}
            />
            <View style={{ borderTopWidth: 1, borderColor: "#888888" }}></View>
            <NotificationItem
              time={"31"}
              icon={"dolly"}
              iconColor={"#F58413"}
              message={
                "Order #00007 for Amazon is packed and ready for shipping."
              }
              themeStyles={themeStyles}
            />
            <View style={{ borderTopWidth: 1, borderColor: "#888888" }}></View>
            <NotificationItem
              time={"56"}
              icon={"alert"}
              iconColor={"#D61414"}
              message={"Artisan Tea is low in quantity. Only 5 left!"}
              themeStyles={themeStyles}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default NotificationScreen;
