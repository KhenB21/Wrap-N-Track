import { View, Text, ScrollView, TouchableOpacity, ToastAndroid } from 'react-native'
import React from 'react'
import MenuTitle from '../../Components/MenuTitle';
import { useState } from 'react';
import SearchBar from '../../Components/SearchBar';
import SupplierItem from '../../Components/SupplierItem';
import SupplierOrderItem from '../../Components/SupplierOrderItem';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../Screens/DrawerNavigation/ThemeContect';

const SuppliersScreen = ({route}) => {
    const { pageTitle } = route.params;
    const [focused, setFocused] = useState('all');
    const navigation = useNavigation();
    const { themeStyles } = useTheme();

    return (
      <View style={{ flex: 1, alignItems: 'center'}}>

      {/* Header */}
      <View style={{width: '100%', height: 233, backgroundColor:themeStyles.headerColor, paddingHorizontal: 10}}>

        {/* Menu button, Menu title, and Notification button */}
        <MenuTitle pageTitle={pageTitle}/>

        {/* Search bar */}
        <SearchBar/>   

        {/* Header navbar */}
        <View style={{flexDirection: 'row', height: 40, width: '100%'}}>
          <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'all' ? 4 : 0}} onPress={() => setFocused('all')}>
            <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>All</Text>
          </TouchableOpacity>  
          <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'inactive' ? 4 : 0}} onPress={() => setFocused('inactive')}>
            <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>Pending Orders</Text>
          </TouchableOpacity>  
        </View>           
      </View>

      <View style={{ flex: 3, width: '100%', backgroundColor: themeStyles.backgroundColor, paddingHorizontal: 10}}>
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 63 }} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          {focused === 'all' ?
            <View>
              <SupplierItem/>
              <SupplierItem/>
              <SupplierItem/>
              <SupplierItem/>
              <SupplierItem/>
            </View>
            
            :
            <View>
              <SupplierOrderItem/>
              <SupplierOrderItem/>
              <SupplierOrderItem/>
              <SupplierOrderItem/>
              <SupplierOrderItem/>
            </View>
          }
        </ScrollView>
      </View>

      <View style={{ position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
        <TouchableOpacity 
          style={{
            backgroundColor: '#696A8F', 
            width: 45,
            height: 45,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
            marginRight: 10,
          }}
          onPress={() => ToastAndroid.show('Downloading Supplier List...', 5)}  
        >
          <Ionicons name='document-text' size={26} color={'#FDFDFD'}/>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{
            backgroundColor: '#696A8F', 
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
          }}
          onPress={() => navigation.navigate('SupplierForm')}
        >
          <Ionicons name='add' size={30} color={'#FDFDFD'}/>
        </TouchableOpacity>
      </View>
    </View>
    )
}

export default SuppliersScreen