import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import React, { useState, useContext } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import ButtonTextInput from "../../Components/ButtonTextInput";
import { SalesContext } from "../../Context/SalesContext";
import { InventoryContext } from "../../Context/InventoryContext";

const SalesForm = () => {
  const navigation = useNavigation();
  const { addOrder } = useContext(SalesContext);
  const { items } = useContext(InventoryContext);

  // Form state variables
  const [customerName, setCustomerName] = useState("");
  const [salesOrderNumber, setSalesOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [dateOrdered, setDateOrdered] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleAddOrder = () => {
    if (!customerName.trim()) {
      Alert.alert("Missing Field", "Please enter the customer name.");
      return;
    }
    if (!salesOrderNumber.trim()) {
      Alert.alert("Missing Field", "Please enter the sales order number.");
      return;
    }
    if (!selectedItem) {
      Alert.alert("Missing Field", "Please select an item.");
      return;
    }
    if (!paymentMethod.trim()) {
      Alert.alert("Missing Field", "Please enter the payment method.");
      return;
    }
    if (!paymentType.trim()) {
      Alert.alert("Missing Field", "Please enter the payment type.");
      return;
    }
    if (!referenceNo.trim()) {
      Alert.alert("Missing Field", "Please enter the reference number.");
      return;
    }
    if (!province.trim()) {
      Alert.alert("Missing Field", "Please enter the province.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Missing Field", "Please enter the city/municipality.");
      return;
    }
    if (!barangay.trim()) {
      Alert.alert("Missing Field", "Please enter the barangay.");
      return;
    }
    if (!street.trim()) {
      Alert.alert(
        "Missing Field",
        "Please enter the house/building number & street."
      );
      return;
    }
    if (!zipCode.trim()) {
      Alert.alert("Missing Field", "Please enter the ZIP code.");
      return;
    }
    if (!dateOrdered.trim()) {
      Alert.alert("Missing Field", "Please enter the date ordered.");
      return;
    }
    if (!expectedDeliveryDate.trim()) {
      Alert.alert("Missing Field", "Please enter the expected delivery date.");
      return;
    }

    const newOrder = {
      customerName,
      salesOrderNumber,
      paymentMethod,
      paymentType,
      referenceNo,
      address: {
        province,
        city,
        barangay,
        street,
        zipCode,
      },
      dateOrdered,
      expectedDeliveryDate,
      item: selectedItem,
    };

    addOrder(newOrder);
    navigation.goBack();
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
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
            }}
          >
            New Sales Order
          </Text>
        </View>
        <View
          style={{
            width: "92%",
            padding: 15,
            marginTop: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#FDFDFD",
          }}
        >
          <View style={{ width: "100%" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Order Details
            </Text>
            <View style={{ width: "100%", alignItems: "center" }}>
              <View style={{ width: "100%", marginBottom: 10 }}>
                <Text style={{ marginBottom: 4 }}>Customer Name</Text>
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    padding: 10,
                    backgroundColor: "#fff",
                  }}
                />
              </View>
              <View style={{ width: "100%", marginBottom: 10 }}>
                <Text style={{ marginBottom: 4 }}>Sales Order Number</Text>
                <TextInput
                  value={salesOrderNumber}
                  onChangeText={setSalesOrderNumber}
                  placeholder="Enter sales order number"
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    padding: 10,
                    backgroundColor: "#fff",
                  }}
                />
              </View>
              <View style={{ width: "100%", marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    marginBottom: 5,
                  }}
                >
                  Items
                </Text>
                <TouchableOpacity
                  style={{
                    height: 50,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 10,
                  }}
                  onPress={() => setIsModalVisible(true)}
                >
                  <Text style={{ flex: 1, color: "#888888" }}>
                    {selectedItem ? selectedItem.itemName : "Select Item"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={"#888888"}
                  />
                </TouchableOpacity>
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
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Payment Information
            </Text>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Payment Method</Text>
              <TextInput
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="Enter payment method"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Payment Type</Text>
              <TextInput
                value={paymentType}
                onChangeText={setPaymentType}
                placeholder="Enter payment type"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Reference No.</Text>
              <TextInput
                value={referenceNo}
                onChangeText={setReferenceNo}
                placeholder="Enter reference number"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
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
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Address Details
            </Text>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Province</Text>
              <TextInput
                value={province}
                onChangeText={setProvince}
                placeholder="Enter province"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>City/Municipality</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Enter city/municipality"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Barangay</Text>
              <TextInput
                value={barangay}
                onChangeText={setBarangay}
                placeholder="Enter barangay"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>
                House/Building Number & Street
              </Text>
              <TextInput
                value={street}
                onChangeText={setStreet}
                placeholder="Enter house/building number & street"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>ZIP code</Text>
              <TextInput
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="Enter ZIP code"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
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
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              Delivery Information
            </Text>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Date Ordered</Text>
              <TextInput
                value={dateOrdered}
                onChangeText={setDateOrdered}
                placeholder="Enter date ordered"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>Expected Delivery Date</Text>
              <TextInput
                value={expectedDeliveryDate}
                onChangeText={setExpectedDeliveryDate}
                placeholder="Enter expected delivery date"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  backgroundColor: "#fff",
                }}
              />
            </View>
          </View>
          <TouchableOpacity
            style={{
              width: "100%",
              height: 50,
              backgroundColor: "#696A8F",
              marginTop: 40,
              borderRadius: 5,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleAddOrder}
          >
            <Text style={{ fontSize: 16, color: "#FDFDFD" }}>Add Order</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <FlatList
            data={items}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: "#ccc",
                }}
                onPress={() => handleSelectItem(item)}
              >
                <Text style={{ fontSize: 16 }}>{item.itemName}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={{
              padding: 15,
              backgroundColor: "#696A8F",
              alignItems: "center",
            }}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={{ color: "#FFF", fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default SalesForm;
