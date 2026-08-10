import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, RadioButton } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { deliveryAPI } from '../../services/api';

const DELIVERY_STATUSES = [
  'Pending',
  'Preparing',
  'Ready for Delivery',
  'Awaiting Pick-up',
  'Out for Delivery',
  'Sent / Shipped',
  'Delivered',
  'Picked Up',
  'Failed Delivery',
  'Rescheduled',
  'Cancelled',
];

const PICKUP_STATUSES = ['Ready for Delivery', 'Awaiting Pick-up', 'Picked Up', 'Cancelled'];

const STATUS_COLORS = {
  Pending: '#9E9E9E',
  Preparing: '#FF9800',
  'Ready for Delivery': '#2196F3',
  'Awaiting Pick-up': '#9C27B0',
  'Out for Delivery': '#FF9800',
  'Sent / Shipped': '#03A9F4',
  Delivered: '#4CAF50',
  'Picked Up': '#4CAF50',
  'Failed Delivery': '#F44336',
  Rescheduled: '#FF5722',
  Cancelled: '#757575',
};

const formatDate = (v) => (!v ? '-' : new Date(v).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }));
const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v || 0));

export default function EmployeeDeliveryUpdateScreen({ navigation, route }) {
  const { orderId, delivery: initialDelivery } = route.params || {};
  const theme = useTheme();

  const [delivery, setDelivery] = useState(initialDelivery || null);
  const [modes, setModes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    delivery_status: initialDelivery?.delivery_status || 'Pending',
    delivery_mode_id: initialDelivery?.delivery_mode_id ? String(initialDelivery.delivery_mode_id) : '',
    courier_name: initialDelivery?.courier_name || '',
    tracking_number: initialDelivery?.tracking_number || '',
    tracking_link_available: initialDelivery?.tracking_link_available ? 'available' : 'not_available',
    tracking_link: initialDelivery?.tracking_link || '',
    delivery_remarks: initialDelivery?.delivery_remarks || '',
  });

  const selectedMode = modes.find((m) => String(m.id) === String(form.delivery_mode_id));
  const isPickup = selectedMode?.type === 'PICKUP' || selectedMode?.name === 'Customer Pick-up';
  const availableStatuses = isPickup ? PICKUP_STATUSES : DELIVERY_STATUSES;
  const trackingAvailable = form.tracking_link_available === 'available';

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deliveryData, modesData, historyData] = await Promise.all([
        deliveryAPI.getDelivery(orderId),
        deliveryAPI.getDeliveryModes(),
        deliveryAPI.getDeliveryHistory(orderId),
      ]);
      const d = deliveryData.delivery || deliveryData;
      setDelivery(d);
      setModes(modesData.modes || []);
      setHistory(historyData.history || []);

      setForm({
        delivery_status: d.delivery_status || 'Pending',
        delivery_mode_id: d.delivery_mode_id ? String(d.delivery_mode_id) : '',
        courier_name: d.courier_name || '',
        tracking_number: d.tracking_number || '',
        tracking_link_available: d.tracking_link_available ? 'available' : 'not_available',
        tracking_link: d.tracking_link || '',
        delivery_remarks: d.delivery_remarks || '',
      });
    } catch (error) {
      console.error('Error loading delivery:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleModeChange = (modeId) => {
    const mode = modes.find((m) => String(m.id) === String(modeId));
    const pickup = mode?.type === 'PICKUP' || mode?.name === 'Customer Pick-up';
    setForm((prev) => ({
      ...prev,
      delivery_mode_id: modeId,
      ...(pickup && {
        courier_name: '',
        tracking_number: '',
        tracking_link: '',
        tracking_link_available: 'not_available',
        delivery_status: PICKUP_STATUSES.includes(prev.delivery_status)
          ? prev.delivery_status
          : 'Awaiting Pick-up',
      }),
    }));
  };

  const validate = () => {
    if (!form.delivery_mode_id) {
      Alert.alert('Validation', 'Delivery mode is required');
      return false;
    }
    if (!form.delivery_status) {
      Alert.alert('Validation', 'Delivery status is required');
      return false;
    }
    if (['Failed Delivery', 'Rescheduled'].includes(form.delivery_status) && !form.delivery_remarks.trim()) {
      Alert.alert('Validation', 'Remarks are required for failed or rescheduled deliveries');
      return false;
    }
    if (!isPickup && trackingAvailable && !form.tracking_link.trim()) {
      Alert.alert('Validation', 'A tracking link is required when tracking is available');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        delivery_status: form.delivery_status,
        delivery_mode_id: form.delivery_mode_id,
        courier_name: isPickup ? null : (form.courier_name || null),
        tracking_number: isPickup ? null : (form.tracking_number || null),
        tracking_link_available: !isPickup && trackingAvailable,
        tracking_link: !isPickup && trackingAvailable ? form.tracking_link : null,
        delivery_remarks: form.delivery_remarks || null,
      };
      await deliveryAPI.updateDelivery(orderId, payload);
      Alert.alert('Success', 'Delivery updated successfully', [
        { text: 'OK', onPress: () => { loadData(); navigation.goBack(); } },
      ]);
    } catch (error) {
      console.error('Error saving delivery:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update delivery');
    } finally {
      setSaving(false);
    }
  };

  const card = theme.colors.surface;
  const text = theme.colors.onSurface;
  const sub = theme.colors.onSurfaceVariant;
  const border = theme.colors.outline + '55';
  const inputBg = theme.dark ? '#2a2b2c' : '#F5F4FA';

  if (!delivery && loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="loading" size={40} color={theme.colors.primary} />
        <Text style={{ color: sub, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: text }]}>Delivery: Order #{orderId}</Text>
          {delivery?.customer_name && (
            <Text style={[styles.headerSub, { color: sub }]}>{delivery.customer_name}</Text>
          )}
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Order Summary Card */}
        {delivery && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Order Summary</Text>
            <InfoRow icon="map-marker-outline" label="Address" value={delivery.shipping_address || delivery.shipped_to || '-'} sub={sub} />
            <InfoRow icon="phone-outline" label="Phone" value={delivery.cellphone || delivery.telephone || '-'} sub={sub} />
            <InfoRow icon="calendar-outline" label="Expected" value={formatDate(delivery.expected_delivery)} sub={sub} />
            <InfoRow icon="currency-php" label="Total" value={formatCurrency(delivery.total_cost)} sub={sub} />
            <View style={[styles.currentStatusRow, { backgroundColor: (STATUS_COLORS[delivery.delivery_status] || '#9E9E9E') + '22' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[delivery.delivery_status] || '#9E9E9E' }]} />
              <Text style={[styles.currentStatusText, { color: STATUS_COLORS[delivery.delivery_status] || '#9E9E9E' }]}>
                {delivery.delivery_status || 'Pending'}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Mode */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Delivery Mode *</Text>
          {modes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[styles.modeOption, { borderColor: form.delivery_mode_id === String(mode.id) ? theme.colors.primary : border }]}
              onPress={() => handleModeChange(String(mode.id))}
            >
              <RadioButton.Android
                value={String(mode.id)}
                status={form.delivery_mode_id === String(mode.id) ? 'checked' : 'unchecked'}
                onPress={() => handleModeChange(String(mode.id))}
                color={theme.colors.primary}
              />
              <Text style={[styles.modeLabel, { color: text }]}>{mode.name}</Text>
              <Text style={[styles.modeType, { color: sub }]}>{mode.type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delivery Status */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Delivery Status *</Text>
          <View style={styles.statusGrid}>
            {availableStatuses.map((status) => {
              const active = form.delivery_status === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: active ? (STATUS_COLORS[status] || theme.colors.primary) : inputBg,
                      borderColor: active ? (STATUS_COLORS[status] || theme.colors.primary) : border,
                    },
                  ]}
                  onPress={() => updateForm('delivery_status', status)}
                >
                  <Text style={[styles.statusChipText, { color: active ? '#fff' : sub }]}>{status}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Courier & Tracking (hidden for pickup) */}
        {!isPickup && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Courier & Tracking</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: sub }]}>Courier Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                value={form.courier_name}
                onChangeText={(v) => updateForm('courier_name', v)}
                placeholder="e.g. J&T Express"
                placeholderTextColor={sub}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: sub }]}>Tracking Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                value={form.tracking_number}
                onChangeText={(v) => updateForm('tracking_number', v)}
                placeholder="e.g. 1234567890"
                placeholderTextColor={sub}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: sub }]}>Tracking Link</Text>
              <View style={styles.trackingToggle}>
                {['available', 'not_available'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.toggleChip,
                      {
                        backgroundColor: form.tracking_link_available === opt ? theme.colors.primary : inputBg,
                        borderColor: form.tracking_link_available === opt ? theme.colors.primary : border,
                      },
                    ]}
                    onPress={() => updateForm('tracking_link_available', opt)}
                  >
                    <Text style={{ color: form.tracking_link_available === opt ? '#fff' : sub, fontSize: 13, fontWeight: '600' }}>
                      {opt === 'available' ? 'Available' : 'Not Available'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {trackingAvailable && (
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border, marginTop: 8 }]}
                  value={form.tracking_link}
                  onChangeText={(v) => updateForm('tracking_link', v)}
                  placeholder="https://track.example.com/..."
                  placeholderTextColor={sub}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              )}
            </View>
          </View>
        )}

        {/* Remarks */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            Remarks {['Failed Delivery', 'Rescheduled'].includes(form.delivery_status) ? '*' : '(optional)'}
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: inputBg, color: text, borderColor: border }]}
            value={form.delivery_remarks}
            onChangeText={(v) => updateForm('delivery_remarks', v)}
            placeholder="Add any notes or remarks..."
            placeholderTextColor={sub}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Delivery History</Text>
            {history.map((h, idx) => (
              <View key={idx} style={[styles.historyItem, { borderLeftColor: theme.colors.primary }]}>
                <Text style={[styles.historyStatus, { color: text }]}>{h.status}</Text>
                {h.remarks ? <Text style={[styles.historyRemarks, { color: sub }]}>{h.remarks}</Text> : null}
                <Text style={[styles.historyTime, { color: sub }]}>
                  {new Date(h.created_at).toLocaleString('en-PH')}
                  {h.updated_by_name ? ` · ${h.updated_by_name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomBar, { backgroundColor: card, borderTopColor: border }]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          Save Changes
        </Button>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, sub }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={15} color={sub} style={{ marginRight: 6 }} />
      <Text style={[styles.infoLabel, { color: sub }]}>{label}:</Text>
      <Text style={[styles.infoValue, { color: sub }]}>{value}</Text>
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
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerSub: { fontSize: 13, marginTop: 1 },
  section: {
    margin: 12,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  infoLabel: { fontSize: 13, marginRight: 6, minWidth: 70 },
  infoValue: { fontSize: 13, flex: 1 },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  currentStatusText: { fontSize: 14, fontWeight: 'bold' },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingRight: 12,
    marginBottom: 8,
  },
  modeLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  modeType: { fontSize: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  trackingToggle: { flexDirection: 'row', gap: 10 },
  toggleChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  historyItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 14,
  },
  historyStatus: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  historyRemarks: { fontSize: 13, marginBottom: 2 },
  historyTime: { fontSize: 11 },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});
