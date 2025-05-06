import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { Menu } from 'react-native-paper';

const CustomerItem = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  return (
    <TouchableOpacity 
      style={{
        padding: 8, 
        backgroundColor: '#FDFDFD',
        width: '100%', 
        marginTop: 4,
        borderRadius: 5,
        justifyContent: 'space-between',
        flexDirection: 'row'
      }} 
      onPress={() => navigation.navigate('CustomerDetails')}
    >

    <View style={{marginBottom: 16}}>
      <Text style={{ fontWeight: 'bold' }}>Marc Khenneth</Text>
      <Text style={{ color: '#888888' }}>Customer number</Text>
      <Text style={{ color: '#888888' }}>Total orders: 4</Text>
    </View>

    <View style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
      <Text style={{ color: '#888888', fontSize: 12 }}>Last order: 02/05/25</Text>
    </View>
  </TouchableOpacity>
  )
}

export default CustomerItem