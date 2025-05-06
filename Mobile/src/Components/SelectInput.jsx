import { View, Text } from 'react-native'
import React from 'react'
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';

const SelectInput = ({label}) => {
    const [selectedValue, setSelectedValue] = useState('');

    return (
        <View style={{marginTop: 15, width: '100%'}}>
            <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>{label}</Text>
            <View style={{borderWidth: 1, width: '100%', borderColor: '#ccc', borderRadius: 6}}>
                <Picker
                    selectedValue={selectedValue}
                    onValueChange={(itemValue) => setSelectedValue(itemValue)}
                    style={{ height: 50, width: '100%'}}
                >
                    <Picker.Item label="..." value="" enabled={false} color='#ccc'/>
                    <Picker.Item label="New Customer" value="New Customer"/>
                    <Picker.Item label="Acer Predator" value="Acer Predator"/>
                </Picker>
            </View>
        </View>
  )
}

export default SelectInput