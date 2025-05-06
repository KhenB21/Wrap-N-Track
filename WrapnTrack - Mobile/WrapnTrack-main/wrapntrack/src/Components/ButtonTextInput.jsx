import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const ButtonTextInput = ({label, icon, secureTextEntry, buttonFunction}) => {
  
  return (
    <View  style={{width: '100%', marginTop: 20}}>
        <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 5}}>{label}</Text>
        <View style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10}}>
          <TextInput style={{ height:50, borderRadius: 6, width: '80%' }} secureTextEntry={secureTextEntry}/>
          <TouchableOpacity onPress={buttonFunction}>
              <MaterialCommunityIcons name={icon} size={24} color={'#888888'}/>
          </TouchableOpacity>
        </View>
    </View>
  )
}

export default ButtonTextInput