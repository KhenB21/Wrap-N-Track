import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { Menu } from 'react-native-paper';

const SupplierItem = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  return (
    <TouchableOpacity 
      style={{
        padding: 10, 
        backgroundColor: '#FDFDFD', 
        width: '100%', 
        marginTop: 4, 
        borderRadius: 5, 
        flexDirection: 'row'
      }} 
      onPress={() => navigation.navigate('SupplierDetails')}
    >
      <Image 
        source={require('../../assets/Profile/celestea.jpg')} 
        style={{ height: 60, width: 60, borderRadius: 5, marginRight: 15, borderRadius: 40 }} 
      />
      <View>
        <Text style={{fontWeight: 'bold'}}>Celestea</Text>
        <Text style={{color: '#888888'}}>celetea@gmail.com</Text>
        <Text style={{color: '#888888'}}>0965 4567 890</Text>
      </View>
      
    </TouchableOpacity>
  )
}

export default SupplierItem;
