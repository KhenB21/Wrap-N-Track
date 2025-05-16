import { View, Text, TouchableOpacity} from 'react-native'
import React, { useState } from 'react'
import { Checkbox } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const ItemToolBar = ({ handleCancelSelectMode, onDelete, selectedCount = 1 }) => {
  const [isChecked, setChecked] = useState(false);

  return (
    <View style={{
      width: '100%',
      flexDirection: 'row',
      height: 50,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FDFDFD',
      borderRadius: 5,
      marginTop: 4,
      paddingHorizontal: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={handleCancelSelectMode}>
          <Icon name='close' size={24} color={'#888888'} />
        </TouchableOpacity>
        <Text style={{ color: '#888888', marginLeft: 10 }}>
          {selectedCount} Selected
        </Text>
        <Checkbox
          uncheckedColor='#888888'
          status={isChecked ? 'checked' : 'unchecked'}
          onPress={() => setChecked(!isChecked)}
        />
      </View>
      <TouchableOpacity onPress={onDelete}>
        <Icon name='trash-can' size={24} color={'#888888'} />
      </TouchableOpacity>
    </View>
  );
};

export default ItemToolBar