import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native'
import React, { useState } from 'react'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'

const InventoryItemDetails = () => {
    const [focused, setFocused] = useState('image1');
    const navigation = useNavigation();


    return (
        <View>
            <ScrollView 
                contentContainerStyle={{ alignItems: 'center', paddingBottom: 10 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{alignItems: 'center', marginTop: 40}}>
                    <View style={{width: '92%', flexDirection: 'row', justifyContent: 'space-between'}}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name='chevron-back' size={22} color={'#888888'}/>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <MaterialCommunityIcons name='dots-vertical' size={22} color={'#888888'}/>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{width: '92%', backgroundColor: '#FDFDFD', marginTop: 10, borderRadius: 10, alignItems: 'center'}}>
                    <Image source={require('../../../assets/inventory/oolong-tea.jpg')} style={{width: '100%', height: 350, borderTopLeftRadius: 10, borderTopRightRadius: 10}}></Image>
                    <View style={{width: '100%', padding: 15}}>
                        <View style={{flexDirection: 'row', height: 60, width: '100%', alignItems: 'center'}}>
                            <TouchableOpacity onPress={() => setFocused('image2')}>
                                <Image source={require('../../../assets/inventory/oolong-tea2.jpg')} style={{height: 60, width: 60}}></Image>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFocused('image2')}>
                                <Image source={require('../../../assets/inventory/oolong-tea3.jpg')} style={{height: 60, width: 60, marginLeft: 10}}></Image>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFocused('image2')}>
                                <Image source={require('../../../assets/inventory/oolong-tea4.jpeg')} style={{height: 60, width: 60, marginLeft: 10}}></Image>
                            </TouchableOpacity>
                        </View>
                        <Text style={{color:'black', fontSize: 22, fontWeight: 'bold', paddingVertical: 20}}>Artisan Teas</Text>
                        <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', paddingTop: 20}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold'}}>General Information</Text>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <View>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Category</Text>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Variant</Text>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Stock Keeping Unit</Text>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Description</Text>
                                </View>
                                <View>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Beverages</Text>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Oolong Tea</Text>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>#IN-00001</Text>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Oxidized Chinese tea</Text>
                                </View>
                            </View>
                        </View>
                        <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', marginTop: 20, paddingTop: 20}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold'}}>Inventory & Availability</Text>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <View>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Quantity</Text>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Weight / Volume</Text>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Date Added</Text>
                                </View>
                                <View>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>214</Text>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>1pc</Text>
                                    <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>01/29/25</Text>
                                </View>
                            </View>
                        </View>
                        <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', marginTop: 20, paddingTop: 20}}>
                            <Text style={{fontSize: 16, fontWeight: 'bold'}}>Pricing Information</Text>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <View>
                                    <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Price</Text>
                                </View>
                                <View>
                                    <Text style={{fontSize: 18, textAlign: 'right', marginTop: 20, fontWeight: 'bold'}}>₱214</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={{width: '100%', height: 60, backgroundColor: '#696A8F', marginTop: 40, borderRadius: 5, justifyContent: 'center', alignItems: 'center'}}>
                            <Text style={{fontSize: 16, color: '#FDFDFD'}}>Create Order</Text>
                        </TouchableOpacity> 
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

export default InventoryItemDetails