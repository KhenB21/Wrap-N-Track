import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native';

const CustomDrawerContent = (props) => {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", onPress: () => null, style: "cancel" },
        { text: "Yes", onPress: () => {        
            navigation.replace('Login'); 
          } 
        }
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0, paddingStart: 0, paddingEnd: 0, flex: 1, paddingBottom: 200}}>
      <View style={styles.profileContainer}>
        <Image
          source={require('../../assets/Profile/person.jpg')}
          style={styles.profileImage}
        />
        <Text style={styles.userName}>Marc Khenneth Bolima</Text>
        <Text style={{fontSize: 14, color: '#FDFDFD'}}>bolimarc@gmail.com</Text>
      </View>
      <View style={{justifyContent: 'space-between', height: '100%'}}>
        <View>
          <DrawerItemList {...props} />
        </View>
        <View style={{borderTopWidth: 1, borderTopColor: '#888888', paddingLeft: 15}}>
          <TouchableOpacity style={{height: 50, alignItems: 'center', flexDirection: 'row'}} onPress={() => handleLogout()}>
            <MaterialCommunityIcons name='logout-variant' size={20} color={'#888888'}/>
            <Text style={{paddingLeft: 10, fontSize: 14, fontWeight: 500, color: '#888888'}}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  profileContainer: {
    padding: 20,
    height: 200,
    backgroundColor: '#696A8F',
    justifyContent: 'flex-end'
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  userName: {
    color: '#FDFDFD',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomDrawerContent;