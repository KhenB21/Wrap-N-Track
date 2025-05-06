import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { Menu } from 'react-native-paper'
import { useState } from 'react'

const SupplierOrderItem = () => {

  return (
    <TouchableOpacity 
      style={{
        width: '100%', 
        backgroundColor: '#FDFDFD', 
        marginTop: 4, 
        borderRadius: 5, 
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
      }}
    >
      <View style={{flexDirection: 'row', marginBottom: 16}}>
        <Image 
          source={require('../../assets/Profile/celestea.jpg')} 
          style={{ height: 60, width: 60, borderRadius: 5, marginRight: 15, borderRadius: 40 }} 
        />
        <View>
          <Text style={{fontWeight: 'bold'}}>Celestea</Text>
          <Text style={{color: '#888888'}}>Date ordered: 01/05/25</Text>
          <Text style={{color: '#888888'}}>11 items</Text>
        </View>
      </View> 
      <View style={{justifyContent: 'flex-end', alignItems: 'flex-end'}}>
        <Text style={{fontWeight: 'bold'}}>₱17,890.00</Text>
      </View>    
    </TouchableOpacity>
  )
}

export default SupplierOrderItem