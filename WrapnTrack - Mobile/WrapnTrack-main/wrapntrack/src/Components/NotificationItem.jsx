import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { Menu } from 'react-native-paper'
import { useState } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const NotificationItem = (props) => {
    const {time, icon, iconColor, message} = props;
    const [visible, setVisible] = useState(false);

    return (
        <TouchableOpacity style={{height: 80, width: '100%', flexDirection: 'row', justifyContent: 'space-between',marginTop: 15, marginBottom: 15}}>
            <View style={{ height: 50, width: 50, backgroundColor: `${iconColor}`, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={icon} size={28} color={'#FDFDFD'} />
            </View>
            <View style={{justifyContent: 'space-between', width: '70%'}}>
                <Text style={{color: 'black'}}>{message}</Text>
                <Text style={{color: '#888888'}}>{time} minutes ago</Text>
            </View>
            <View style={{ position: 'relative'}}>
                <Menu
                    visible={visible}
                    onDismiss={() => setVisible(false)}
                    anchor={
                    <TouchableOpacity onPress={() => setVisible(true)}>
                        <Ionicons name='ellipsis-horizontal' size={20} color={'#888888'} />
                    </TouchableOpacity>
                    }
                    contentStyle={{ backgroundColor: '#FDFDFD' }}
                >
                    <Menu.Item 
                    onPress={() => console.log('Delete')} 
                    title="Delete" 
                    leadingIcon={() => <Ionicons name="trash" size={20} color="red" />}
                    style={{backgroundColor: '#FDFDFD'}}
                    />
                </Menu>
            </View>
        </TouchableOpacity>
    )
}

export default NotificationItem