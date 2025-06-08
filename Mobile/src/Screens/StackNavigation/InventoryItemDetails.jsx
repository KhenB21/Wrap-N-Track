import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import React, { useState } from "react";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../DrawerNavigation/ThemeContect";

const InventoryItemDetails = ({ route }) => {
  const { item } = route.params;
  console.log("Item Details:", item);
  const [focused, setFocused] = useState(
    item.image_url || "https://via.placeholder.com/350"
  );
  const navigation = useNavigation();

  const { themeStyles } = useTheme();

  return (
    <View>
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingBottom: 10,
          backgroundColor: themeStyles.backgroundColor,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <View
            style={{
              width: "92%",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={"#888888"} />
            </TouchableOpacity>
            <TouchableOpacity>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={22}
                color={"#888888"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View
          style={{
            width: "92%",
            backgroundColor: "#FDFDFD",
            marginTop: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: themeStyles.containerColor,
          }}
        >
          {/* Main Image */}
          <Image
            source={{ uri: focused }}
            style={{
              width: "100%",
              height: 350,
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
            }}
          />

          <View style={{ width: "100%", padding: 15 }}>
            {/* Thumbnails */}
            <View
              style={{
                flexDirection: "row",
                height: 60,
                width: "100%",
                alignItems: "center",
              }}
            >
              {item.additional_images && item.additional_images.length > 0
                ? item.additional_images.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setFocused(photo)}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={{
                          height: 60,
                          width: 60,
                          marginLeft: index === 0 ? 0 : 10,
                          borderRadius: 5,
                        }}
                      />
                    </TouchableOpacity>
                  ))
                : item.image_url && (
                    <TouchableOpacity
                      onPress={() => setFocused(item.image_url)}
                    >
                      <Image
                        source={{ uri: item.image_url }}
                        style={{
                          height: 60,
                          width: 60,
                          borderRadius: 5,
                        }}
                      />
                    </TouchableOpacity>
                  )}
            </View>

            {/* Item Name */}
            <Text
              style={{
                color: "black",
                fontSize: 22,
                fontWeight: "bold",
                paddingVertical: 20,
                color: themeStyles.textColor,
              }}
            >
              {item.name || "N/A"}
            </Text>

            {/* General Information */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#888888",
                width: "100%",
                paddingTop: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: themeStyles.textColor,
                }}
              >
                General Information
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Category
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Variant
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Stock Keeping Unit
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Description
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.category || "N/A"}
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.variant || "N/A"}
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.sku || "N/A"}
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.description || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Inventory & Availability */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#888888",
                width: "100%",
                marginTop: 20,
                paddingTop: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: themeStyles.textColor,
                }}
              >
                Inventory & Availability
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Quantity
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Weight / Volume
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Date Added
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.quantity || "N/A"}
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {item.weight_volume || "N/A"}
                  </Text>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      textAlign: "right",
                      marginTop: 20,
                    }}
                  >
                    {new Date(item.date_added).toLocaleDateString() || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing Information */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#888888",
                width: "100%",
                marginTop: 20,
                paddingTop: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: themeStyles.textColor,
                }}
              >
                Pricing Information
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 14,
                      marginTop: 20,
                    }}
                  >
                    Price
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      color: themeStyles.textColor,
                      fontSize: 18,
                      textAlign: "right",
                      marginTop: 20,
                      fontWeight: "bold",
                    }}
                  >
                    ₱{parseFloat(item.unit_price).toFixed(2) || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Create Order Button */}
            <TouchableOpacity
              style={{
                width: "100%",
                height: 60,
                backgroundColor: themeStyles.buttonColor,
                marginTop: 40,
                borderRadius: 5,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: "#FDFDFD" }}>
                Create Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default InventoryItemDetails;
