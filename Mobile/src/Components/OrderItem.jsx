import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';

const OrderItem = ({handleItemLongpress, handleItemPress, isLongpress}) => {
    
    return (
        <TouchableOpacity 
            style={{
                width: '100%', 
                backgroundColor: '#FDFDFD', 
                marginTop: 4, padding: 8, 
                borderRadius: 5, 
                flexDirection: 'row', 
                justifyContent: 'space-between'
            }} 
            onPress={() => handleItemPress()}
            onLongPress={() => handleItemLongpress()}
        >
            {/* Order details - customer name, order number, expected delivery, total items */}
            <View style={{marginBottom: 16}}>
                <Text style={{fontWeight: 'bold'}}>John Terence Auyong</Text>
                <Text style={{fontWeight: 400, color: '#888888'}}>Order number</Text>
                <Text style={{fontWeight: 400, color: '#888888'}}>Expected Delivery: 01/23/25</Text>
                <Text style={{fontWeight: 400, color: '#888888'}}>Total Items: 124</Text>
            </View>
            
            <View style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>

                {/* order status */}
                <Text style={{ fontWeight: 'bold', color: 'red' }}>Invoiced</Text>

                {/* order amount */}
                <Text style={{ fontWeight: 'bold' }}>₱17,456.00</Text> 
            </View>
        </TouchableOpacity>
    )
}

export default OrderItem;