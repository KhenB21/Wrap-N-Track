import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native'
import React from 'react'
import MenuTitle from '../../Components/MenuTitle'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { TextInput } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'


const OrderDetails = ({pageTitle}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ marginTop: 30, width: '92%', height: 50, flexDirection: 'row', alignItems: 'center' }}>      
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color='#888888'/>
                </TouchableOpacity>
                <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 18 }}>Order Details</Text>      
            </View>
            <View style={{width: '92%', marginTop: 10, flexDirection: 'row', justifyContent: 'space-evenly'}}>
              <View style={{alignItems: 'center', width: 70}}>
                <View style={{ height: 40, width: 40, backgroundColor: '#47D614', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name='package' size={20} color={'#F0F0F0'} />
                </View>
                <Text style={{fontWeight: 'bold'}}>Packed</Text>
              </View>
              <View style={{height: '100%'}}>
                <MaterialCommunityIcons name={'dots-horizontal'} size={48} color={'#888888'}/>
              </View> 
              <View style={{alignItems: 'center', width: 70}}>
                <View style={{ height: 40, width: 40, backgroundColor: '#D61414', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name='dolly' size={24} color={'#F0F0F0'}/>
                </View>
                <Text style={{fontWeight: 'bold'}}>Shipped</Text>
              </View>  
              <View style={{height: '100%'}}>
                <MaterialCommunityIcons name={'dots-horizontal'} size={48} color={'#888888'}/>
              </View> 
              <View style={{alignItems: 'center', width: 70}}>
                <View style={{ height: 40, width: 40, backgroundColor: '#D61414', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name='truck' size={20} color={'#F0F0F0'} />
                </View>
                <Text style={{fontWeight: 'bold'}}>Delivered</Text>
              </View>               
            </View>
            <View style={{width: '92%', padding: 15, marginTop: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#FDFDFD'}}>
              <View style={{width: '100%'}}>
                <Text style={{fontSize: 18, fontWeight: 'bold'}}>#SO-00015</Text>
                <View style={{width: '100%', marginTop: 20}}>
                  <Text style={{fontSize: 16, fontWeight: 'bold'}}>General Information</Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Customer Name</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Date Ordered</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Expected Delivery</Text>
                      </View>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Acer Predator</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>01/27/25</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>02/25/25</Text>
                      </View>
                  </View>
                </View>
                <View style={{width: '100%', marginTop: 20, borderTopWidth: 1, borderTopColor: '#888888', paddingTop: 20}}>
                  <Text style={{fontSize: 16, fontWeight: 'bold'}}>Address Details</Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>50 Rose street, Pamplona Dos, Las Pinas City, Metro Manila, 1740</Text>
                      </View>
                  </View>
                </View>
                <View style={{width: '100%', marginTop: 20, borderTopWidth: 1, borderTopColor: '#888888', paddingTop: 20}}>
                  <Text style={{fontSize: 16, fontWeight: 'bold'}}>Item Details</Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Artisan Teas - Oolong Tea</Text>
                      </View>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>₱195.00 x 35</Text>
                      </View>
                  </View>
                </View>
                <View style={{width: '100%', marginTop: 20}}>
                  <Text style={{fontSize: 16, fontWeight: 'bold', borderTopWidth: 1, borderTopColor: '#888888', paddingTop: 20}}>Payment Details</Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Payment Method</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Payment Type</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Reference no.</Text>
                          <Text style={{color: 'black', fontSize: 14, marginTop: 20, fontWeight: 'bold'}}>Summary:</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Total Items</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Total Item cost</Text>
                          <Text style={{color: '#888888', fontSize: 14, marginTop: 20}}>Delivery Fee</Text>
                      </View>
                      <View>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Bank Transfer</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>Partial</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>20240215-567890</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}></Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>1</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>₱6,825.00</Text>
                          <Text style={{color: '#888888', fontSize: 14, textAlign: 'right', marginTop: 20}}>₱1,799.00</Text>
                          
                      </View>
                  </View>
                  <View style={{width: '100%', borderTopWidth: 1, borderTopColor: '#888888', flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                    <View>
                      <Text style={{color: '#black', fontSize: 14, marginTop: 20, fontWeight: 'bold'}}>Total:</Text>
                    </View>
                    <View>
                      <Text style={{color: 'black', fontSize: 18, textAlign: 'right', marginTop: 20, fontWeight: 'bold'}}>₱8,624.00</Text>                
                  </View>
                  </View>
                </View>
              </View>
            </View>
        </ScrollView>
    </SafeAreaView>
  )
}

export default OrderDetails