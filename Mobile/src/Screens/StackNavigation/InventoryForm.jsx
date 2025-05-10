import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import React, { useState, useContext } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import RadioGroup from "react-native-radio-buttons-group";
import { InventoryContext } from "../../Context/InventoryContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";

const InventoryForm = () => {
  const [itemName, setItemName] = useState("");
  const [variant, setVariant] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [photos, setPhotos] = useState([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const { themeStyles } = useTheme();

  const navigation = useNavigation();
  const { addItem } = useContext(InventoryContext);

  const radioButtons = [
    { id: "1", label: "Active", value: "option1" },
    { id: "2", label: "Inactive", value: "option2" },
  ];

  // Function to handle photo selection
  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to proceed."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotos((prevPhotos) => [...prevPhotos, result.assets[0].uri]);
    }
  };

  const handleAddItem = () => {
    const newItem = {
      itemName,
      variant,
      category,
      sku,
      quantity,
      price,
      photos,
      description,
      unit,
      dateAdded: new Date().toLocaleDateString(),
      status: selectedId === "1" ? "Active" : "Inactive",
    };
    addItem(newItem);
    navigation.goBack({ newItem });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: themeStyles.backgroundColor }}
        contentContainerStyle={{ alignItems: "center", paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            marginTop: 30,
            width: "92%",
            height: 50,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#888888" />
          </TouchableOpacity>
          <Text
            style={{
              marginLeft: 10,
              fontWeight: "bold",
              fontSize: 18,
              color: themeStyles.textColor,
            }}
          >
            New Item
          </Text>
        </View>
        <View
          style={{
            width: "92%",
            padding: 15,
            marginTop: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: themeStyles.containerColor,
          }}
        >
          <View style={{ width: "100%" }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 20,
                color: themeStyles.textColor,
              }}
            >
              General Information
            </Text>
            <View style={{ width: "100%", alignItems: "center" }}>
              {/* Add Photos Button */}
              <TouchableOpacity
                onPress={handleAddPhoto}
                style={{
                  backgroundColor: themeStyles.imageButtonColor,
                  height: 150,
                  width: 150,
                  borderStyle: "dashed",
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="add"
                    size={20}
                    color={themeStyles.textColor}
                  />
                  <Text style={{ fontSize: 15, color: themeStyles.textColor }}>
                    Add Photos
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Display Selected Photos */}
              <View
                style={{
                  width: "100%",
                  marginTop: 20,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {photos.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={{
                      width: 50,
                      height: 50,
                      margin: 5,
                      borderRadius: 5,
                      backgroundColor: "#D9D9D9",
                    }}
                  />
                ))}
              </View>

              {/* Input Fields */}
              <TextInput
                placeholder="Item Name"
                placeholderTextColor={themeStyles.textColor}
                value={itemName} // Bind to state
                onChangeText={setItemName} // Update state on text change
                style={{
                  borderWidth: 1,
                  width: "100%",
                  height: 50,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 10,
                  color: themeStyles.textColor,
                }}
              />
              <TextInput
                placeholder="Variant"
                placeholderTextColor={themeStyles.textColor}
                value={variant} // Bind to state
                onChangeText={setVariant} // Update state on text change
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  width: "100%",
                  height: 50,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 10,
                  color: themeStyles.textColor,
                }}
              />
              <TextInput
                placeholder="Description"
                placeholderTextColor={themeStyles.textColor}
                value={description} // Bind to state
                onChangeText={setDescription} // Update state on text change
                style={{
                  borderWidth: 1,
                  width: "100%",
                  height: 50,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 10,
                  color: themeStyles.textColor,
                }}
              />
              <Text
                style={{
                  alignSelf: "flex-start",
                  marginBottom: 5,
                  fontSize: 14,
                  fontWeight: "bold",
                  paddingBottom: "15",
                  color: themeStyles.textColor,
                }}
              >
                Category
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  width: "100%",
                  marginBottom: 10,
                }}
              >
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={{
                    height: 50,
                    width: "100%",
                    color: themeStyles.textColor,
                  }}
                >
                  <Picker.Item
                    label="Select a category"
                    value=""
                    enabled={false}
                    color="#ccc"
                  />
                  <Picker.Item label="Electronics" value="electronics" />
                  <Picker.Item label="Clothing" value="clothing" />
                  <Picker.Item
                    label="Home Appliances"
                    value="home_appliances"
                  />
                  <Picker.Item label="Books" value="books" />
                </Picker>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                  marginBottom: 10,
                }}
              >
                <TextInput
                  placeholder="SKU (Stock Keeping Unit)"
                  placeholderTextColor={themeStyles.textColor} // Apply themeStyles.textColor to the placeholder
                  value={sku} // Bind to state
                  onChangeText={setSku} // Update state on text change
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    padding: 10,
                    flex: 1,
                    marginRight: 10,
                    color: themeStyles.textColor, // Apply themeStyles.textColor to the text
                  }}
                />
                <TouchableOpacity>
                  <MaterialCommunityIcons
                    name="barcode-scan"
                    size={30}
                    color={themeStyles.textColor}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ width: "100%", marginTop: 20 }}>
                <RadioGroup
                  radioButtons={radioButtons.map((button) => ({
                    ...button,
                    labelStyle: { color: themeStyles.textColor }, // Apply themeStyles.textColor to the label
                    color: themeStyles.textColor, // Apply themeStyles.textColor to the actual radio button
                  }))}
                  onPress={setSelectedId}
                  selectedId={selectedId}
                  layout="row"
                />
              </View>
            </View>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#888888",
              width: "100%",
              marginTop: 30,
              paddingTop: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                paddingBottom: "15",
                color: themeStyles.textColor,
              }}
            >
              Inventory & Availability
            </Text>
            <View style={{ width: "100%", alignItems: "center" }}>
              <TextInput
                placeholder="Quantity"
                placeholderTextColor={themeStyles.textColor}
                value={quantity} // Bind to state
                onChangeText={setQuantity} // Update state on text change
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  width: "100%",
                  height: 50,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 10,
                  color: themeStyles.textColor,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  justifyContent: "space-between",
                  marginTop: 20,
                }}
              >
                <View style={{ width: "45%" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      marginBottom: 5,
                      color: themeStyles.textColor,
                    }}
                  >
                    Weight/Volume
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#ccc",
                      borderRadius: 5,
                    }}
                  >
                    <TextInput
                      style={{
                        height: 50,
                        borderRadius: 6,
                        paddingHorizontal: 10,
                        width: "100%",
                        color: themeStyles.textColor,
                      }}
                      value={unit}
                      placeholder="Weight"
                      placeholderTextColor={themeStyles.textColor}
                      onChangeText={setUnit}
                    />
                  </View>
                </View>
                <View style={{ width: "45%" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      marginBottom: 5,
                      color: themeStyles.textColor,
                    }}
                  >
                    Unit
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      width: "100%",
                      borderColor: "#ccc",
                      borderRadius: 6,
                    }}
                  >
                    <Picker
                      selectedValue={selectedValue}
                      onValueChange={(itemValue) => setSelectedValue(itemValue)}
                      style={{ height: 50, width: "100%" }}
                    >
                      <Picker.Item
                        label="..."
                        value=""
                        enabled={false}
                        color="#ccc"
                      />
                      <Picker.Item label="kg" value="kg" />
                      <Picker.Item label="g" value="g" />
                      <Picker.Item label="pcs" value="pcs" />
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#888888",
              width: "100%",
              marginTop: 30,
              paddingTop: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                paddingBottom: "15",
                color: themeStyles.textColor,
              }}
            >
              Pricing Information
            </Text>
            <TextInput
              placeholder="Item Price"
              placeholderTextColor={themeStyles.textColor}
              value={price} // Bind to state
              onChangeText={setPrice} // Update state on text change
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                width: "100%",
                height: 50,
                borderRadius: 5,
                padding: 10,
                paddingTop: 15,
                color: themeStyles.textColor,
              }}
            />
          </View>
          <TouchableOpacity
            style={{
              width: "100%",
              height: 50,
              backgroundColor: themeStyles.buttonColor,
              marginTop: 40,
              borderRadius: 5,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleAddItem}
          >
            <Text style={{ fontSize: 16, color: "#FDFDFD" }}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InventoryForm;
