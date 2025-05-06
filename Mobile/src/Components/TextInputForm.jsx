import { View, Text, TextInput } from 'react-native'
import React from 'react'

const TextInputForm = ({label, numberOfLines}) => {
  return (
    <View  style={{width: '100%', marginTop: 20}}>
      <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 5}}>{label}</Text>
      <View style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 5}}>
        <TextInput style={{ height: 50, borderRadius: 6, paddingHorizontal: 10, width: '100%' }} numberOfLines={numberOfLines}/>
      </View>
    </View>
  )
}

export default TextInputForm