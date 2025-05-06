import { View, Text } from 'react-native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const ReportChoice = ({reportTitle, description, icon, iconColor}) => {
  return (
    <TouchableOpacity style={{ height: 100, width: '100%', flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
        <View style={{ height: 60, width: 60, backgroundColor: `#${iconColor}`, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={icon} size={36} color={'#F0F0F0'} />
        </View>
        <View style={{ height: 80, marginLeft: 20 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>{reportTitle}</Text>
            <Text style={{fontSize: 14, color: '#888888', width: 235 }}>{description}</Text>
        </View>
    </TouchableOpacity>
  )
}

export default ReportChoice