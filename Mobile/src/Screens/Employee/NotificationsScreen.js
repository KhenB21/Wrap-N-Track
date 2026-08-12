import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../Context/ThemeContext';
import { notificationAPI } from '../../services/api';
import { SkeletonRow } from '../../Components/Skeleton/Skeleton';

const ICON_MAP = {
  order: 'clipboard-text-outline',
  inventory: 'package-variant-outline',
  delivery: 'truck-outline',
  invoice: 'file-document-outline',
  payment: 'credit-card-outline',
  system: 'bell-outline',
};

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data.notifications || data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.is_read) return;
    try {
      await notificationAPI.markAsRead(notification.id || notification.notification_id);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id || n.notification_id) === (notification.id || notification.notification_id)
            ? { ...n, is_read: true }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type) => ICON_MAP[type?.toLowerCase()] || ICON_MAP.system;

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: item.is_read
            ? theme.colors.surface
            : (theme.dark ? '#1a2a3a' : '#EEF4FF'),
          borderLeftColor: item.is_read ? 'transparent' : theme.colors.primary,
        },
      ]}
      onPress={() => handleMarkAsRead(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '22' }]}>
        <MaterialCommunityIcons
          name={getIcon(item.type)}
          size={22}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.onSurface, fontWeight: item.is_read ? '400' : '700' }]}>
          {item.title || 'Notification'}
        </Text>
        {item.message ? (
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
          {formatTime(item.created_at)}
        </Text>
      </View>
      {!item.is_read && (
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Notifications</Text>
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        You're all caught up! Check back later.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} columns={2} style={{ marginBottom: 10 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id || item.notification_id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.colors.outline + '33' }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText: { fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  content: { flex: 1 },
  title: { fontSize: 14, marginBottom: 2 },
  message: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginLeft: 8,
  },
  separator: { height: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyContainer: { flex: 1 },
});
