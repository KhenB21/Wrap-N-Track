import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ButtonTextInput = ({ label, icon, onPress }) => {
  return (
    <View style={{ width: '100%', marginTop: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 5 }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 5,
          paddingHorizontal: 10,
        }}
      >
        <TextInput
          style={{ flex: 1, height: 50 }}
          placeholder={`Enter ${label}`}
        />
        <TouchableOpacity onPress={onPress}>
          <Ionicons name={icon} size={20} color="#888888" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ButtonTextInput;
