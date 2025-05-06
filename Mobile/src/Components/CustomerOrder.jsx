import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native'
import React from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { Menu } from 'react-native-paper';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

const CustomerOrder = ({orderCode, dateOrdered, expectedDelivery, totalItems, Cost, Delivery}) => {
    const [visible, setVisible] = useState(false);
    const navigation = useNavigation();
  return (
    <TouchableOpacity style={{width: '100%', height: 140, backgroundColor: '#FDFDFD', marginTop: 10, borderRadius: 10, padding: 10}} onPress={() => navigation.navigate('OrderDetails')}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{color: '#F58413', fontSize: 16, marginBottom: 5, fontWeight: 'bold'}}>#{orderCode}</Text>
            <View style={{ position: 'relative'}}>
            <Menu
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={
                <TouchableOpacity onPress={() => setVisible(true)}>
                    <Ionicons name='ellipsis-horizontal' size={20} color={'#888888'} />
                </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: '#FDFDFD' }}
            >
                <Menu.Item 
                onPress={() => console.log('Edit')} 
                title="Edit" 
                leadingIcon={() => <Ionicons name="create-outline" size={20} color="#888888" />}
                style={{backgroundColor: '#FDFDFD'}}
                />
                <Menu.Item 
                onPress={() => console.log('Delete')} 
                title="Delete" 
                leadingIcon={() => <Ionicons name="trash" size={20} color="red" />}
                style={{backgroundColor: '#FDFDFD'}}
                />
            </Menu>
            </View>
        </View>
        <View style={{flexDirection: 'row', justifyContent:'space-between'}}>
            <Text style={{color: '#888888', fontSize: 14, marginBottom: 5}}>Date Ordered</Text>
            <Text style={{color: 'black', fontSize: 14, marginBottom: 5}}>{dateOrdered}</Text>
        </View>
        <View style={{flexDirection: 'row', justifyContent:'space-between'}}>
            <Text style={{color: '#888888', fontSize: 14, marginBottom: 5}}>{Delivery === 'complete' ? 'Date Delivered' : 'Expected Delivery'}</Text>
            <Text style={{color: 'black', fontSize: 14, marginBottom: 5}}>{expectedDelivery}</Text>
        </View>
        <View style={{flexDirection: 'row', justifyContent:'space-between'}}>
            <Text style={{color: '#888888', fontSize: 14, marginBottom: 5}}>Total Items</Text>
            <Text style={{color: 'black', fontSize: 14, marginBottom: 5}}>{totalItems}</Text>
        </View>   
        <View style={{flexDirection: 'row', justifyContent:'space-between'}}>
            <Text style={{color: '#888888', fontSize: 14, marginBottom: 5}}>Cost</Text>
            <Text style={{color: 'black', fontSize: 14, marginBottom: 5, fontWeight: 'bold'}}>₱{Cost}</Text>
        </View>                        
        </TouchableOpacity>
  )
}

export default CustomerOrder