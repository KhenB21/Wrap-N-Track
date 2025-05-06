import { View, Text, ScrollView, Touchable, TouchableOpacity } from 'react-native'
import React from 'react'
import MenuTitle from '../../Components/MenuTitle'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
const SettingsScreen = ({route}) => {
  const {pageTitle} = route.params;
  
  return (
    <View style={{ flex: 1, alignItems: 'center'}}>
      <View style={{width: '100%', alignItems: 'center', height: 150, backgroundColor: '#696A8F'}}>
        <View style={{width: '92%', flex: 1}}>
            <MenuTitle pageTitle={pageTitle}/>        
        </View>
      </View>

      <View style={{ flex: 3, width: '100%', alignItems: 'center' }}>
        <ScrollView 
          style={{ width: '92%' }} 

          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={{height: 150, width: '100%', backgroundColor: '#FDFDFD', borderRadius: 10, marginTop: 10, padding: 15}}>
            <View style={{height: 30}}>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Organization</Text>
            </View>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='office-building' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>Organization Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='account-cog' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>User Management</Text>
            </TouchableOpacity>
          </View>
          <View style={{height: 200, width: '100%', backgroundColor: '#FDFDFD', borderRadius: 10, marginTop: 10, padding: 15}}>
            <View style={{height: 30}}>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Personal</Text>
            </View>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='account' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>Account Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='palette' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>Theme</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='bell' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>Notifications</Text>
            </TouchableOpacity>
          </View>
          <View style={{height: 100, width: '100%', backgroundColor: '#FDFDFD', borderRadius: 10, marginTop: 10, padding: 15}}>
            <View style={{height: 30}}>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Security</Text>
            </View>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='lock' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>Privacy and Security</Text>
            </TouchableOpacity>
          </View>
          <View style={{height: 100, width: '100%', backgroundColor: '#FDFDFD', borderRadius: 10, marginTop: 10, padding: 15}}>
            <View style={{height: 30}}>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>More</Text>
            </View>
            <TouchableOpacity style={{width: '100%', height: 50, flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name='information' size={22} color={'#888888'} />
              <Text style={{fontSize: 15, fontWeight: 500, color: '#888888', paddingLeft: 10}}>About</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

export default SettingsScreen