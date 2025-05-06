import { View, Text, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Image } from 'react-native';
import React, { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import TextInputForm from '../../Components/TextInputForm';
import SelectInput from '../../Components/SelectInput'
import RadioGroup from 'react-native-radio-buttons-group';

const CustomerForm = () => {
    const navigation = useNavigation();
    const radioButtons = [
        { id: '1', label: 'Company', value: 'option1' },
        { id: '2', label: 'Individual', value: 'option2' },     
    ];

    const [selectedId, setSelectedId] = useState(null);
    
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
                    <Text style={{ marginLeft: 10, fontWeight: 'bold', fontSize: 18 }}>New Item</Text>      
                </View>
                <View style={{width: '92%', padding: 15, marginTop: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#FDFDFD'}}>
                    <View style={{width: '100%'}}>
                        <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 20}}>General Information</Text>
                        <View style={{width: '100%', alignItems: 'center'}}>
                            <TouchableOpacity style={{ backgroundColor: '#D9D9D9', height: 150, width: 150, borderStyle: 'dashed', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="add" size={20} />
                                    <Text style={{ fontSize: 15 }}>Add Photos</Text>
                                </View>
                            </TouchableOpacity>
                            <View style={{width: '100%', marginTop: 20}}>
                                <RadioGroup radioButtons={radioButtons} onPress={setSelectedId} selectedId={selectedId} layout='row'/>
                            </View>
                            <TextInputForm label={'Customer Name'}/>
                            <TextInputForm label={'Email Address'}/> 
                            <TextInputForm label={'Telephone'}/> 
                            <TextInputForm label={'Cellphone'}/> 
                            <TextInputForm label={'Description'} numberOfLines={4}/> 
                        </View>
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
                    <TouchableOpacity style={{width: '100%', height: 50, backgroundColor: '#696A8F', marginTop: 40, borderRadius: 5, justifyContent: 'center', alignItems: 'center'}} onPress={() => navigation.goBack()}>
                        <Text style={{fontSize: 16, color: '#FDFDFD'}}>Add Customer</Text>
                    </TouchableOpacity> 
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export default CustomerForm;
