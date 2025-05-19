import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { Menu } from 'react-native-paper';
import { useTheme } from '../Screens/DrawerNavigation/ThemeContect';

const CustomerItem = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const { themeStyles } = useTheme(); 

  return (
    <TouchableOpacity 
      style={{
        padding: 8, 
        backgroundColor: themeStyles.containerColor,
        width: '100%', 
        marginTop: 4,
        borderRadius: 5,
        justifyContent: 'space-between',
        flexDirection: 'row'
      }} 
      onPress={() => navigation.navigate('CustomerDetails')}
    >

    <View style={{marginBottom: 16}}>
      <Text style={{ fontWeight: 'bold',color:themeStyles.textColor}}>Marc Khenneth</Text>
      <Text style={{ color:themeStyles.textColor }}>Customer number</Text>
      <Text style={{ color:themeStyles.textColor }}>Total orders: 4</Text>
    </View>

    <View style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
      <Text style={{ color:themeStyles.textColor, fontSize: 12 }}>Last order: 02/05/25</Text>
    </View>
  </TouchableOpacity>
  )
}

export default CustomerItem