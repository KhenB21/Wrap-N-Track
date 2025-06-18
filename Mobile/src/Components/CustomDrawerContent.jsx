import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../Screens/DrawerNavigation/ThemeContect';

// Import useProfile to get profile info from context
import { useProfile } from '../Screens/DrawerNavigation/AccountProfileScreen';

const CustomDrawerContent = (props) => {
  const navigation = useNavigation();
  const { themeStyles } = useTheme();
  const styles = createStyles(themeStyles);

  // Get profile from context
  const { profile } = useProfile();

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
    <DrawerContentScrollView {...props} contentContainerStyle={{...styles.drawerContentContainer }}>
      <View style={{...styles.profileContainer, backgroundColor: themeStyles.headerColor}}>
        <Image
          source={
            profile.image
              ? (typeof profile.image === "string" && profile.image.startsWith("file")
                  ? { uri: profile.image }
                  : profile.image)
              : require('../../assets/Profile/person.jpg')
          }
          style={styles.profileImage} 
        />
        <Text style={styles.userName}>
          {profile.name ? profile.name : "Your Name"}
        </Text>
        <Text style={{fontSize: 14, color: '#FDFDFD'}}>
          {profile.email ? profile.email : "your@email.com"}
        </Text>
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

const createStyles = (themeStyles) =>
  StyleSheet.create({
    drawerContentContainer: {
      paddingTop: 0, paddingStart: 0, paddingEnd: 0, flex: 1, paddingBottom: 200,
      backgroundColor: themeStyles.backgroundColor,
    },
    profileContainer: {
      padding: 20,
      height: 200,
      backgroundColor: themeStyles.headerColor, 
      justifyContent: 'flex-end',
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