import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const Header = ({ 
  title, 
  showMenu = false, 
  showBack = false, 
  showAdd = false, 
  onAddPress = null,
  rightComponent = null 
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBackPress}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.buttonText}
              />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleMenuPress}
            >
              <MaterialCommunityIcons
                name="menu"
                size={24}
                color={colors.buttonText}
              />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.buttonText }]}>
            {title}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {showAdd && onAddPress && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddPress}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={colors.buttonText}
              />
            </TouchableOpacity>
          )}
          {rightComponent}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight || 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    padding: 8,
  },
});

export default Header;