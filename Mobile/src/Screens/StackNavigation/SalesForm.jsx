import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import React, { useState, useContext } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import TextInputForm from "../../Components/TextInputForm";
import ButtonTextInput from "../../Components/ButtonTextInput";
import { SalesContext } from "../../Context/SalesContext"; // Import SalesContext
import { InventoryContext } from "../../Context/InventoryContext"; // Import InventoryContext

const SalesForm = () => {
  const navigation = useNavigation();
  const { addOrder } = useContext(SalesContext); // Access addOrder function from context
  const { items } = useContext(InventoryContext); // Access inventory items from context

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
  const [selectedItem, setSelectedItem] = useState(null); // State for selected item
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility

  const handleAddOrder = () => {
    // Create a new order object
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
      item: selectedItem, // Include the selected item
    };

    // Add the order to the context
    addOrder(newOrder);

    // Navigate to SalesScreen
    navigation.goBack({ newOrder });
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item); // Set the selected item
    setIsModalVisible(false); // Close the modal
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
              <TextInputForm
                label={"Customer Name"}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInputForm
                label={"Sales Order Number"}
                value={salesOrderNumber}
                onChangeText={setSalesOrderNumber}
              />
              <View style={{ width: "100%", marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
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
                  onPress={() => setIsModalVisible(true)} // Open modal
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
            <TextInputForm
              label={"Payment Method"}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
            />
            <TextInputForm
              label={"Payment Type"}
              value={paymentType}
              onChangeText={setPaymentType}
            />
            <TextInputForm
              label={"Reference no."}
              value={referenceNo}
              onChangeText={setReferenceNo}
            />
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
            <TextInputForm
              label={"Province"}
              value={province}
              onChangeText={setProvince}
            />
            <TextInputForm
              label={"City/Municipality"}
              value={city}
              onChangeText={setCity}
            />
            <TextInputForm
              label={"Barangay"}
              value={barangay}
              onChangeText={setBarangay}
            />
            <TextInputForm
              label={"House/Building Number & Street"}
              value={street}
              onChangeText={setStreet}
            />
            <TextInputForm
              label={"ZIP code"}
              value={zipCode}
              onChangeText={setZipCode}
            />
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
            <ButtonTextInput
              label={"Date Ordered"}
              icon={"calendar-month"}
              value={dateOrdered}
              onChangeText={setDateOrdered}
            />
            <ButtonTextInput
              label={"Expected Delivery Date"}
              icon={"calendar-month"}
              value={expectedDeliveryDate}
              onChangeText={setExpectedDeliveryDate}
            />
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

      {/* Modal for selecting items */}
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
