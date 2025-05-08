import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import TextInputForm from "../../Components/TextInputForm";
import SelectInput from "../../Components/SelectInput";
import ButtonTextInput from "../../Components/ButtonTextInput";
import RadioGroup from "react-native-radio-buttons-group";

const InventoryForm = () => {
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const navigation = useNavigation();
  const [photo, setPhoto] = useState(null);
  const [selectedValue, setSelectedValue] = useState("");
  const radioButtons = [
    { id: "1", label: "Active", value: "option1" },
    { id: "2", label: "Inactive", value: "option2" },
  ];

  const [selectedId, setSelectedId] = useState(null);
  const openCamera = async () => {
    console.log("openCamera called"); 
    setCameraVisible(true);
    if (!cameraPermission) {
      Alert.alert("Camera permission is not granted");
      return;
    }
    setCameraVisible(true);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log("Camera Permission:", status); // Debugging
      setCameraPermission(status === "granted");
    })();
  }, []);

  const takePicture = async (cameraRef) => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      setPhoto(photo.uri);
      setCameraVisible(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {cameraVisible ? (
        <>
          {console.log("Rendering Camera")}
          <Camera
            style={{ flex: 1 }} // Ensure this is set
            type={Camera.Constants.Type.back}
            onCameraReady={() => console.log("Camera is ready")}
          >
            {({ camera }) => (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "transparent",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "flex-end",
                }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 5,
                    marginBottom: 20,
                  }}
                  onPress={() => takePicture(camera)}
                >
                  <Text style={{ fontSize: 18 }}>Take Picture</Text>
                </TouchableOpacity>
              </View>
            )}
          </Camera>
        </>
      ) : (
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
            <Text style={{ marginLeft: 10, fontWeight: "bold", fontSize: 18 }}>
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
              backgroundColor: "#FDFDFD",
            }}
          >
            <View style={{ width: "100%" }}>
              <Text
                style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}
              >
                General Information
              </Text>
              <View style={{ width: "100%", alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#D9D9D9",
                    height: 150,
                    width: 150,
                    borderStyle: "dashed",
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="add" size={20} />
                    <Text style={{ fontSize: 15 }}>Add Photos</Text>
                  </View>
                </TouchableOpacity>
                <View
                  style={{
                    width: "100%",
                    marginTop: 20,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {[...Array(5)].map((_, index) => (
                    <View
                      key={index}
                      style={{
                        width: 50,
                        height: 50,
                        backgroundColor: "#D9D9D9",
                      }}
                    ></View>
                  ))}
                </View>
                <TextInputForm label={"Item Name"} />
                <TextInputForm label={"Variant"} />
                <SelectInput label={"Category"} />
                <ButtonTextInput
                  label={"SKU (Stock Keeping Unit)"}
                  icon={"barcode"}
                  onPress={openCamera}
                />
                {photo && (
                  <Image
                    source={{ uri: photo }}
                    style={{
                      width: 100,
                      height: 100,
                      marginTop: 10,
                      borderRadius: 10,
                    }}
                  />
                )}
                <View style={{ width: "100%", marginTop: 20 }}>
                  <RadioGroup
                    radioButtons={radioButtons}
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
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                Inventory & Availability
              </Text>
              <View style={{ width: "100%", alignItems: "center" }}>
                <TextInputForm label={"Quantity"} />
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
                      style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}
                    >
                      Weight / Volume
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
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ width: "45%" }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}
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
                        onValueChange={(itemValue) =>
                          setSelectedValue(itemValue)
                        }
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
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                Pricing Information
              </Text>
              <TextInputForm label={"Item Price"} />
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
              onPress={() => navigation.goBack()}
            >
              <Text style={{ fontSize: 16, color: "#FDFDFD" }}>Add Item</Text>
            </TouchableOpacity>
          </View>
          {console.log('Camera Visible:', cameraVisible)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default InventoryForm;
