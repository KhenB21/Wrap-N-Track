import React from "react";
import { TextInput, View, Text } from "react-native";

const TextInputForm = ({ label, value, onChangeText, ...props }) => (
  <View style={{ width: "100%", marginBottom: 10 }}>
    <Text style={{ marginBottom: 4 }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      style={{
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        backgroundColor: "#fff",
      }}
      {...props}
    />
  </View>
);


export default TextInputForm;