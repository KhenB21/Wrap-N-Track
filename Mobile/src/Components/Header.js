import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../Context/CartContext';

const logo = require('../Images/Logo/pensee-logo-with-name-horizontal.png');

const Header = ({
  title,
  showMenu = false,
  showBack = false,
  showAdd = false,
  showCart = false,
  showProfile = false,
  onAddPress = null,
  onBackPress = null,
  onCartPress = null,
  onProfilePress = null,
  logoType = null,
  rightComponent = null,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  // useCart is only available inside CartProvider (customer POV); guard for
  // employee-side screens that render Header outside that provider.
  let totalItems = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ({ totalItems = 0 } = useCart());
  } catch (e) {
    totalItems = 0;
  }

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  const handleBackPress = () => {
    if (onBackPress) return onBackPress();
    navigation.goBack();
  };

  const handleCartPress = () => {
    if (onCartPress) return onCartPress();
    navigation.navigate('MyCart');
  };

  const handleProfilePress = () => {
    if (onProfilePress) return onProfilePress();
    navigation.navigate('Profile');
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
              accessibilityLabel="Go back"
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
              accessibilityLabel="Open menu"
            >
              <MaterialCommunityIcons
                name="menu"
                size={24}
                color={colors.buttonText}
              />
            </TouchableOpacity>
          )}
          {logoType === 'image' ? (
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          ) : (
            title ? (
              <Text style={[styles.title, { color: colors.buttonText }]}>
                {title}
              </Text>
            ) : null
          )}
        </View>

        <View style={styles.rightSection}>
          {showAdd && onAddPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onAddPress}
              accessibilityLabel="Add"
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={colors.buttonText}
              />
            </TouchableOpacity>
          )}
          {showCart && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleCartPress}
              accessibilityLabel="Open cart"
            >
              <View>
                <MaterialCommunityIcons
                  name="cart-outline"
                  size={24}
                  color={colors.buttonText}
                />
                {totalItems > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>
                      {totalItems > 99 ? '99+' : totalItems}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          {showProfile && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleProfilePress}
              accessibilityLabel="Open profile"
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={26}
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
  logoImage: {
    height: 28,
    width: 160,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Header;
