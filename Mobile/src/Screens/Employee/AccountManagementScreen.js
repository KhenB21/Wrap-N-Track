import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { accountManagementAPI } from '../../services/api';

const ROLES = [
  'admin',
  'business_developer',
  'creatives',
  'director',
  'sales_manager',
  'assistant_sales',
  'packer',
  'operations_manager',
  'social_media_manager',
  'super_admin',
];

const ROLE_COLORS = {
  admin: '#D32F2F',
  super_admin: '#B71C1C',
  director: '#7B1FA2',
  sales_manager: '#1976D2',
  operations_manager: '#00838F',
  business_developer: '#2E7D32',
  creatives: '#F57C00',
  assistant_sales: '#0288D1',
  social_media_manager: '#C2185B',
  packer: '#546E7A',
};

const formatDate = (v) => {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  phone_number: '',
  department: '',
  role: 'packer',
  password: '',
};

export default function AccountManagementScreen({ navigation }) {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accountManagementAPI.getUsers({
        includeArchived: showArchived ? 'true' : 'false',
        search: search || undefined,
        role: roleFilter || undefined,
      });
      const list = data.users || [];
      setUsers(list);
      setFiltered(list);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, showArchived]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      department: user.department || '',
      role: user.role || 'packer',
      password: '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      Alert.alert('Validation', 'First or last name is required');
      return;
    }
    if (!form.username.trim()) {
      Alert.alert('Validation', 'Username is required');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Validation', 'Email is required');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      Alert.alert('Validation', 'Password is required for new users');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        department: form.department.trim(),
        role: form.role,
        ...(form.password.trim() && { password: form.password.trim() }),
      };

      if (editingUser) {
        await accountManagementAPI.updateUser(editingUser.user_id, payload);
        Alert.alert('Success', 'User updated successfully');
      } else {
        await accountManagementAPI.createUser(payload);
        Alert.alert('Success', 'User created successfully');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = (user) => {
    Alert.alert(
      'Archive User',
      `Archive ${user.name || user.username}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountManagementAPI.archiveUser(user.user_id);
              Alert.alert('Success', 'User archived');
              fetchUsers();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to archive user');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (user) => {
    try {
      await accountManagementAPI.restoreUser(user.user_id);
      Alert.alert('Success', 'User restored');
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to restore user');
    }
  };

  const renderUserCard = ({ item }) => {
    const roleColor = ROLE_COLORS[item.role] || '#546E7A';
    const isArchived = item.is_archived;
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, opacity: isArchived ? 0.7 : 1 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '22' }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>
              {(item.first_name?.[0] || item.name?.[0] || item.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
              {item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>{item.email}</Text>
            <Text style={[styles.userUsername, { color: theme.colors.onSurfaceVariant }]}>@{item.username}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleText}>{item.role?.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline + '33' }]}>
          <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
            Joined {formatDate(item.created_at)}
          </Text>
          <View style={styles.actions}>
            {isArchived ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF5022' }]} onPress={() => handleRestore(item)}>
                <MaterialCommunityIcons name="restore" size={16} color="#4CAF50" />
                <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Restore</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F322' }]} onPress={() => openEdit(item)}>
                  <MaterialCommunityIcons name="pencil" size={16} color="#2196F3" />
                  <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F4433622' }]} onPress={() => handleArchive(item)}>
                  <MaterialCommunityIcons name="archive" size={16} color="#F44336" />
                  <Text style={[styles.actionBtnText, { color: '#F44336' }]}>Archive</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const inputBg = theme.dark ? '#2a2b2c' : '#F5F4FA';
  const text = theme.colors.onSurface;
  const sub = theme.colors.onSurfaceVariant;
  const border = theme.colors.outline + '55';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Account Management</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={openCreate}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={sub} />
        <TextInput
          style={[styles.searchInput, { color: text }]}
          placeholder="Search name, email, username..."
          placeholderTextColor={sub}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ key: '', label: 'All Roles' }, ...ROLES.map((r) => ({ key: r, label: r.replace(/_/g, ' ') }))]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: roleFilter === item.key ? theme.colors.primary : theme.colors.surface,
                  borderColor: roleFilter === item.key ? theme.colors.primary : theme.colors.outline,
                },
              ]}
              onPress={() => setRoleFilter(item.key)}
            >
              <Text style={{ color: roleFilter === item.key ? '#fff' : text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <TouchableOpacity
        style={[styles.archivedToggle, { backgroundColor: showArchived ? '#FF572222' : theme.colors.surface }]}
        onPress={() => setShowArchived(!showArchived)}
      >
        <MaterialCommunityIcons name={showArchived ? 'archive' : 'archive-outline'} size={16} color={showArchived ? '#FF5722' : sub} />
        <Text style={{ color: showArchived ? '#FF5722' : sub, fontSize: 13, marginLeft: 6 }}>
          {showArchived ? 'Showing archived users' : 'Show archived users'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={renderUserCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={theme.colors.outline} />
            <Text style={[styles.emptyTitle, { color: text }]}>No Users Found</Text>
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>
                {editingUser ? 'Edit User' : 'Create User'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={sub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'first_name', label: 'First Name', placeholder: 'First name' },
                { key: 'last_name', label: 'Last Name', placeholder: 'Last name' },
                { key: 'username', label: 'Username *', placeholder: 'Username' },
                { key: 'email', label: 'Email *', placeholder: 'email@example.com', keyboard: 'email-address' },
                { key: 'phone_number', label: 'Phone Number', placeholder: '09XXXXXXXXX', keyboard: 'phone-pad' },
                { key: 'department', label: 'Department', placeholder: 'Department' },
              ].map((field) => (
                <View key={field.key} style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: sub }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                    value={form[field.key]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={sub}
                    keyboardType={field.keyboard || 'default'}
                    autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: sub }]}>Password {editingUser ? '(leave blank to keep)' : '*'}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                  value={form.password}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                  placeholder="Password"
                  placeholderTextColor={sub}
                  secureTextEntry
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: sub }]}>Role *</Text>
                <View style={styles.roleGrid}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: form.role === r ? (ROLE_COLORS[r] || theme.colors.primary) : inputBg,
                          borderColor: form.role === r ? (ROLE_COLORS[r] || theme.colors.primary) : border,
                        },
                      ]}
                      onPress={() => setForm((p) => ({ ...p, role: r }))}
                    >
                      <Text style={{ color: form.role === r ? '#fff' : sub, fontSize: 12, textTransform: 'capitalize' }}>
                        {r.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancel</Button>
                <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 2 }}>
                  {editingUser ? 'Save Changes' : 'Create User'}
                </Button>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filterRow: { paddingBottom: 8 },
  filterList: { paddingHorizontal: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 1 },
  userUsername: { fontSize: 12 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  dateText: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
