import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'

const MenuTitle = ({pageTitle}) => {

    const navigation = useNavigation();

    const openDrawer = () => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.openDrawer();
        }
      };

    return (
        <View style={{height: 90, justifyContent: 'space-between', marginTop: 40}}>
            <View style={{justifyContent: 'space-between', flexDirection: 'row'}}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Ionicons name='menu' size={32} color={'#F0F0F0'}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                    <Ionicons name='notifications' size={28} color={'#F0F0F0'}/>
                </TouchableOpacity>
            </View>
            <Text style={{fontWeight: '500', fontSize: 24, color: '#F0F0F0'}}>{pageTitle}</Text>
        </View>
    )
}

export default MenuTitle;