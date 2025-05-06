import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Image } from 'react-native';
import React, { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import SelectInput from '../../Components/SelectInput';
import TextInputForm from '../../Components/TextInputForm';
import ButtonTextInput from '../../Components/ButtonTextInput';

const SupplierOrderForm = () => {
  const navigation = useNavigation();
  const [selectedValue, setSelectedValue] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  
  return (
    <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: 30, width: '92%', height: 50, flexDirection: 'row', alignItems: 'center' }}>      
              <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="chevron-back" size={22} color='#888888'/>
              </TouchableOpacity>
              <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 18 }}>New Supplier Order</Text>      
          </View>
          <View style={{width: '92%', padding: 15, marginTop: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#FDFDFD'}}>
            <View style={{width: '100%'}}>
              <Text style={{fontSize: 16, fontWeight: 'bold'}}>Order Details</Text>
              <View style={{width: '100%', alignItems: 'center'}}>               
                <ButtonTextInput label={'Order Number'} icon={'dots-vertical'}/>
                <View  style={{width: '100%', marginTop: 20}}>
                  <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 5}}>Items</Text>
                  <View style={{height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10}}>
                    <TouchableOpacity>
                        <MaterialCommunityIcons name='plus-circle' size={24} color={'#888888'}/>
                    </TouchableOpacity>
                  </View>
                </View>
                </View>
              </View>
              <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', marginTop: 30, paddingTop: 20}}>
                <Text style={{fontSize: 16, fontWeight: 'bold'}}>Payment Information</Text>
                <SelectInput label={'Payment Method'}/>
                <SelectInput label={'Payment Type'}/>
                <TextInputForm label={'Reference no.'}/>
              </View>
              <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', marginTop: 30, paddingTop: 20}}>
                <Text style={{fontSize: 16, fontWeight: 'bold'}}>Address Details</Text>
                <View style={{width: '100%', alignItems: 'center'}}>
                  <SelectInput label={'Province'}/>
                  <SelectInput label={'City/Municipality'}/>
                  <SelectInput label={'Barangay'}/>
                  <TextInputForm label={'House/Building Number & Street'}/>
                  <TextInputForm label={'ZIP code'}/>
                </View>
              </View>
              <View style={{borderTopWidth: 1, borderTopColor: '#888888', width: '100%', marginTop: 30, paddingTop: 20}}>
                <Text style={{fontSize: 16, fontWeight: 'bold'}}>Delivery Information</Text>
                <ButtonTextInput label={'Date Ordered'} icon={'calendar-month'}/>
                <ButtonTextInput label={'Expected Delivery Date'} icon={'calendar-month'}/>
              </View>
              <TouchableOpacity style={{width: '100%', height: 50, backgroundColor: '#696A8F', marginTop: 40, borderRadius: 5, justifyContent: 'center', alignItems: 'center'}} onPress={() => navigation.goBack()}>
                  <Text style={{fontSize: 16, color: '#FDFDFD'}}>Add Order</Text>
              </TouchableOpacity> 
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

export default SupplierOrderForm;
