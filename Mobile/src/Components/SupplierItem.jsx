import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { Menu } from 'react-native-paper';
import { useTheme } from '../Screens/DrawerNavigation/ThemeContect';

const SupplierItem = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const { themeStyles } = useTheme(); 

  return (
    <TouchableOpacity 
      style={{
        padding: 10, 
        backgroundColor:themeStyles.containerColor, 
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
        <Text style={{fontWeight: 'bold',color:themeStyles.textColor}}>Celestea</Text>
        <Text style={{color:themeStyles.textColor}}>celetea@gmail.com</Text>
        <Text style={{color:themeStyles.textColor}}>0965 4567 890</Text>
      </View>
      
    </TouchableOpacity>
  )
}

export default SupplierItem;
