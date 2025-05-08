import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native'
import React, { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import SearchBar from '../../Components/SearchBar'
import InventoryItem from '../../Components/InventoryItem'
import SupplierTransactionItem from '../../Components/SupplierOrderItem'
import { useTheme } from '../../Screens/DrawerNavigation/ThemeContect'

const SupplierDetails = () => {
    const [focused, setFocused] = useState('all');
    const navigation = useNavigation();
    const { themeStyles } = useTheme();

    return (
        <View style={{flex: 1, alignItems: 'center', backgroundColor: themeStyles.backgroundColor}}>
            <View style={{width: '100%', height: 366, backgroundColor: '#696A8F', paddingRight: 15, paddingLeft: 15, paddingTop: 40}}>
                <TouchableOpacity style={{height: 28, width: 28, marginBottom: 5}} onPress={() => navigation.goBack()}>
                    <Ionicons name='chevron-back' size={28} color={'#FDFDFD'}/>
                </TouchableOpacity>
                <SearchBar/>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10}}>
                    <Image source={require('../../../assets/Profile/celestea.jpg')} style={{height: 90, width: 90, borderRadius: 45}}/>
                    <View style={{width: 220}}>
                        <Text style={{fontWeight: 'bold', color: '#FDFDFD', fontSize: 18}}>Celestea</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5}}>
                            <Ionicons name='mail' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>celestea@gmail.com</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center',  marginBottom: 5}}>
                            <Ionicons name='call' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>09567894561</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center',  marginBottom: 5}}>
                            <MaterialCommunityIcons name='archive' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>1 item</Text>
                        </View>
                        <View style={{flexDirection: 'row',  marginBottom: 5}}>
                            <MaterialCommunityIcons name='note-text' size={16} color={'#FDFDFD'}/>
                            <Text style={{fontSize: 14, color: '#FDFDFD', marginLeft: 10}}>Philippine-based online tea shop that offers affordable locally grown and imported loose leaf teas.</Text>
                        </View>
                    </View>
                </View>
                <View style={{flexDirection: 'row', height: 40, width: '100%'}}>
                    <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'all' ? 4 : 0}} onPress={() => setFocused('all')}>
                        <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>All</Text>
                    </TouchableOpacity>  
                    <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'category' ? 4 : 0}} onPress={() => setFocused('category')}>
                        <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>Category</Text>
                    </TouchableOpacity>  
                    <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'transactions' ? 4 : 0}} onPress={() => setFocused('transactions')}>
                        <Text style={{fontWeight: 500, fontSize: 14, color: '#F0F0F0'}}>Transactions</Text>
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
                    <InventoryItem/>
                    )
                    :
                    focused === 'category' ? 
                    (
                    <TouchableOpacity style={{width: '100%', flexDirection: 'row', padding: 5, backgroundColor: '#FDFDFD', marginTop: 10, borderRadius: 8, alignItems: 'center'}}>
                        <Image source={require('../../../assets/Profile/celestea.jpg')} style={{height: 50, width: 50, borderRadius: 4}}/>
                        <Text style={{paddingLeft: 20, fontWeight: 'bold', fontSize: 16}}>Beverages</Text>
                    </TouchableOpacity>
                    )
                    : 
                    (
                    <SupplierTransactionItem/>
                    )}
                </ScrollView>
            </View>
            {focused === 'transactions' &&
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
                        onPress={''} 
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
                        onPress={() => navigation.navigate('SupplierOrderForm')}
                    >
                        <Ionicons name='add' size={30} color={'#FDFDFD'}/>
                    </TouchableOpacity>
                </View>
            }
        </View>
    )
}

export default SupplierDetails