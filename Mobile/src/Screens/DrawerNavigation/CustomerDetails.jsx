import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import SearchBar from '../../Components/SearchBar';
import InventoryItem from '../../Components/InventoryItem';
import SalesOrder from '../../Components/OrderItem';
import { Menu } from 'react-native-paper';
import CustomerOrder from '../../Components/CustomerOrder';

const CustomerDetails = () => {
    const [focused, setFocused] = useState('all');
    const [visible, setVisible] = useState(false);
    const navigation = useNavigation();

    return (
        <View style={{flex: 1, alignItems: 'center'}}>
            <View style={{width: '100%', height: 349, backgroundColor: '#696A8F', paddingRight: 15, paddingLeft: 15, paddingTop: 40}}>
                <TouchableOpacity style={{height: 28, width: 28, marginBottom: 5}} onPress={() => navigation.goBack()}>
                    <Ionicons name='chevron-back' size={28} color={'#FDFDFD'}/>
                </TouchableOpacity>
                <SearchBar/>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10}}>
                    <Image source={require('../../../assets/Profile/predator.png')} style={{height: 90, width: 90, borderRadius: 45}}/>
                    <View style={{width: 220}}>
                        <Text style={{fontWeight: 'bold', color: '#FDFDFD', fontSize: 18}}>Acer Predator</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5}}>
                            <Ionicons name='mail' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>acer.predator@gmail.com</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center',  marginBottom: 5}}>
                            <Ionicons name='call' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>09567894561</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center',  marginBottom: 5}}>
                            <MaterialCommunityIcons name='archive' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>1 order</Text>
                        </View>
                        <View style={{flexDirection: 'row',  marginBottom: 5}}>
                            <MaterialCommunityIcons name='note-text' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>Acer Inc is a Taiwanese multinational company that produces computer hardware</Text>
                        </View>
                    </View>
                </View>
                <View style={{flexDirection: 'row', height: 40, width: '100%'}}>
                    <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'all' ? 4 : 0}} onPress={() => setFocused('all')}>
                        <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>Order History</Text>
                    </TouchableOpacity>  
                    <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'ongoing' ? 4 : 0}} onPress={() => setFocused('ongoing')}>
                        <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>Ongoing Orders</Text>
                    </TouchableOpacity>  
                </View>
            </View>
            <View style={{ flex: 3, width: '100%', alignItems: 'center' }}>
                <ScrollView 
                    style={{ width: '92%' }} 
                    contentContainerStyle={{ paddingBottom: 70 }} 
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                >
                    {focused === 'all' ?
                    (
                        <CustomerOrder orderCode={'CO-00003'} dateOrdered={'01/02/25'} expectedDelivery={'01/08/25'} totalItems={'4'} Cost={'12,536.00'} Delivery={'complete'}/>
                    )
                    :
                    (
                        <CustomerOrder orderCode={'CO-00015'} dateOrdered={'01/27/25'} expectedDelivery={'02/25/25'} totalItems={'4'} Cost={'8,624.00'} Delivery={'incomplete'}/>
                    )
                    }
                </ScrollView>
            </View>
        </View>
    )
}

export default CustomerDetails;