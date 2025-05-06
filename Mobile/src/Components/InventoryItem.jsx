import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";

const InventoryItem = ({handleItemLongpress, handleItemPress, isLongpress}) => {

  return (
    <TouchableOpacity 
      style={{
        width: '100%', 
        backgroundColor: '#FDFDFD', 
        marginTop: 4, 
        borderRadius: 5, 
        flexDirection: 'row', 
        padding: 8, 
        justifyContent: 'space-between',
      }} 
      onPress={() => handleItemPress()}
      onLongPress={() => handleItemLongpress()}
    >
      <View style={{flexDirection: 'row'}}>
        <Image style={{height: 90, width: 90, borderRadius: 3}} resizeMethod='contain' source={require('../../assets/inventory/oolong-tea.jpg')}/>
        <View style={{marginLeft: 8}}>
          <Text style={{fontWeight: 'bold'}}>Artisan teas</Text>
          <Text>Oolong tea</Text>
          <Text style={{color: '#888888'}}>Qty: 314</Text>
        </View>
      </View>
      <View>
        <Text style={{fontWeight: 'bold', textAlign: 'right'}}>₱195.00</Text>
      </View>
    </TouchableOpacity>
  );
};

export default InventoryItem;