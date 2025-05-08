import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { Menu } from 'react-native-paper'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const SearchBar = () => {
  const [isFocused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', height: 50, marginTop: 5, marginBottom: 5}}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{
          backgroundColor: (isFocused ? '#F0F0F0' : 'white'), 
          height: '75%', 
          width: '85%', 
          borderRadius: 6, 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingHorizontal: 10 
        }}
      >
        <TextInput 
          placeholder='Search' 
          placeholderTextColor={( 'gray')}
          color={(isFocused ? '#000' : '#F0F0F0')} 
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, 
            height: '100%', 
            fontSize: 16, 
          }}
        />
        <Ionicons name='search-outline' size={24} color={'grey'} />
      </KeyboardAvoidingView>
      <View style={{ position: 'relative'}}>
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={
            <TouchableOpacity style={{padding: 5}} onPress={() => setVisible(true)}>
              <Ionicons name='options-outline' size={24} color={'#F0F0F0'} />
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: '#FDFDFD' }}
        >
          <Menu.Item 
            onPress={() => console.log('Edit')} 
            title="A - Z" 
            leadingIcon={() => <MaterialCommunityIcons name="sort-alphabetical-ascending" size={20} color="#888888" />}
            style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Z - A" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-alphabetical-descending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
            onPress={() => console.log('Edit')} 
            title="Ascending Quantity" 
            leadingIcon={() => <MaterialCommunityIcons name="sort-ascending" size={20} color="#888888" />}
            style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Descending Quantity" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-descending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Ascending Product Number" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-numeric-ascending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Descending Product Number" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-numeric-descending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Newest First" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-calendar-ascending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
          <Menu.Item 
          onPress={() => console.log('Delete')} 
          title="Oldest First" 
          leadingIcon={() => <MaterialCommunityIcons name="sort-calendar-descending" size={20} color="#888888" />}
          style={{backgroundColor: '#FDFDFD'}}
          />
        </Menu>
      </View>
    </View>

  )
}

export default SearchBar