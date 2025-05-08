import { View, ScrollView, TouchableOpacity, Text, ToastAndroid } from 'react-native';
import React from 'react';
import MenuTitle from '../../Components/MenuTitle'
import InventoryItem from '../../Components/InventoryItem';
import SearchBar from '../../Components/SearchBar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import ItemToolBar from '../../Components/ItemToolBar';
import { useTheme } from '../../Screens/DrawerNavigation/ThemeContect';


const InventoryScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const navigation = useNavigation();
  const { themeStyles } = useTheme();

  // State for page
  const [focused, setFocused] = useState('all');
  // State for long press
  const [isLongpress, setLongpress] = useState(false);

  // FUnction for longpressing item
  const handleItemLongpress = () => {
    setLongpress(true); 
  }

  // Function for pressing an item
  const handleItemPress = () => {
    if(isLongpress) {
      console.log('item selected')
    } else {
      navigation.navigate('InventoryItemDetails')
    }
  }

  const handleCancelSelectMode = () => {
    setLongpress(false);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>

      {/* Header */}
      <View style={{width: '100%', height: 233, backgroundColor: themeStyles.headerColor, paddingHorizontal: 10}}>

        {/* Menu button, Menu title, and Notification button */}
        <MenuTitle pageTitle={pageTitle}/>

        {/* Search bar */}
        <SearchBar/>   

        {/* Header navbar */}
        <View style={{flexDirection: 'row', height: 40, width: '100%'}}>
          <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'all' ? 4 : 0}} onPress={() => setFocused('all')}>
            <Text style={{fontWeight: 500, fontSize: 14, color: 'white'}}>All</Text>
          </TouchableOpacity>  
          <TouchableOpacity style={{flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0', borderBottomWidth: focused === 'inactive' ? 4 : 0}} onPress={() => setFocused('inactive')}>
            <Text style={{fontWeight: 500, fontSize: 14, color: 'white'}}>Inactive</Text>
          </TouchableOpacity>  
        </View>           
      </View>

      {/* Main Content */}
      <View style={{ flex: 3, width: '100%', backgroundColor: themeStyles.backgroundColor, paddingHorizontal: 10}}>

        {/* Tool bar that will show once the user longpresses an item */}
        {isLongpress &&
          <ItemToolBar handleCancelSelectMode={handleCancelSelectMode}/>
        } 

        {/* Products */}
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 63 }}
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >

          {focused === 'all' ?
            <View>
              <InventoryItem isLongpress={isLongpress} handleItemLongpress={handleItemLongpress} handleItemPress={handleItemPress}/>
            </View>
            :
            <View style={{alignItems: 'center'}}>
              <Text style={{color: '#888888', fontSize: 18, marginTop: 20}}>No Products Found</Text>
            </View>
          }
        </ScrollView>
      </View>

      <View style={{ position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'flex-end', marginBottom: 50 }}>
        <TouchableOpacity 
          style={{
            backgroundColor: '#696A8F', 
            width: 45,
            height: 45,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
            marginRight: 10,
          }}
          onPress={() => ToastAndroid.show('Downloading Inventory List...', 5)} 
        >
          <Icon name='file-document-outline' size={26} color={'#FDFDFD'}/>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{
            backgroundColor: '#696A8F', 
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 5,
          }}
          onPress={() => navigation.navigate('InventoryForm')}
        >
          <Icon name='plus' size={30} color={'#FDFDFD'}/>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default InventoryScreen;
