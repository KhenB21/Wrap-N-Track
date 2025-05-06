import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import MenuTitle from '../../Components/MenuTitle'
import NotificationItem from '../../Components/NotificationItem';

const NotificationScreen = ({route}) => {
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
          contentContainerStyle={{ paddingBottom: 70 }} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={{width: '100%', backgroundColor: '#FDFDFD', height: 380, padding: 10, marginTop: 10, borderRadius: 10}}>
            <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 10}}>Earlier</Text>
            <NotificationItem time={'10'} icon={'truck'} iconColor={'#47D614'} message={'Order #00001 for Reinan John Briones is out for delivery.'}/>
            <View style={{borderTopWidth: 1, borderColor: '#888888'}}></View>
            <NotificationItem time={'31'} icon={'dolly'} iconColor={'#F58413'} message={'Order #00007 for Amazon is packed and ready for shipping.'}/>
            <View style={{borderTopWidth: 1, borderColor: '#888888'}}></View>
            <NotificationItem time={'56'} icon={'alert'} iconColor={'#D61414'} message={'Artisan Tea is low in quantity. Only 5 left!'}/>
          </View>          
        </ScrollView>
      </View>
    </View>
  )
}

export default NotificationScreen