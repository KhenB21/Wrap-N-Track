import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invoiceAPI } from '../../services/api';
import { toUploadFile } from '../../services/uploadFile';
import { peso } from '../../constants/orderBoard';
import { ActionButton, ChipGroup, FieldLabel, FormField } from '../FormKit';

/* Mobile version of Website/client/src/Pages/Invoices/PaymentModal.js — same fields,
   same PATCH /invoices/:id/mark-paid call, same "at least the invoice amount" rule. */

const PAYMENT_PROVIDERS = {
  'Bank Transfer': ['BPI', 'BDO', 'Metrobank', 'UnionBank', 'Security Bank', 'RCBC', 'PNB', 'Landbank', 'China Bank', 'Other Bank'],
  'E-Wallet': ['GCash', 'Maya', 'ShopeePay', 'GrabPay', 'Other E-Wallet'],
  Cash: ['Cash'],
  Other: ['Other'],
};

const money = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

export default function MarkPaidModal({ invoice, colors, onClose, onSaved }) {
  const amountOptions = useMemo(() => {
    if (!invoice) return [];
    const options = [
      { key: 'invoice_amount', label: `Invoice amount · ${peso(invoice.invoice_amount || invoice.amount_due)}`, value: money(invoice.invoice_amount || invoice.amount_due) },
    ];
    if (money(invoice.remaining_balance_amount) > 0) {
      options.push({ key: 'remaining_balance', label: `Remaining balance · ${peso(invoice.remaining_balance_amount)}`, value: money(invoice.remaining_balance_amount) });
    }
    if (money(invoice.down_payment_amount) > 0) {
      options.push({ key: 'down_payment', label: `Down payment · ${peso(invoice.down_payment_amount)}`, value: money(invoice.down_payment_amount) });
    }
    return options.filter((option, index, all) => index === all.findIndex((c) => c.value === option.value));
  }, [invoice]);

  const [amountChoice, setAmountChoice] = useState('invoice_amount');
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [provider, setProvider] = useState('BPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    const initialMethod = PAYMENT_PROVIDERS[invoice.payment_method] ? invoice.payment_method : 'Bank Transfer';
    setAmountChoice('invoice_amount');
    setCustomAmount('');
    setMethod(initialMethod);
    setProvider(invoice.payment_provider || PAYMENT_PROVIDERS[initialMethod][0]);
    setReference(invoice.payment_reference || '');
    setNotes(invoice.payment_notes || '');
    setProof(null);
  }, [invoice]);

  if (!invoice) return null;

  const changeMethod = (next) => {
    setMethod(next);
    setProvider((PAYMENT_PROVIDERS[next] || PAYMENT_PROVIDERS.Other)[0]);
  };

  const pickProof = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach a proof of payment.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setProof(result.assets[0]);
  };

  const save = async () => {
    const selected = amountOptions.find((o) => o.key === amountChoice);
    const amountPaid = amountChoice === 'custom' ? Number(String(customAmount).replace(/,/g, '')) : selected?.value;
    const required = money(invoice.invoice_amount || invoice.amount_due);
    if (!Number.isFinite(amountPaid) || amountPaid < required) {
      Alert.alert('Check the amount', `Amount paid must be at least the invoice amount (${peso(required)}).`);
      return;
    }

    const payload = new FormData();
    payload.append('amount_paid', String(amountPaid));
    payload.append('payment_method', method);
    payload.append('payment_provider', provider);
    payload.append('payment_reference', reference.trim());
    payload.append('payment_notes', notes.trim());
    if (proof) payload.append('payment_proof', toUploadFile(proof, `payment-proof-${invoice.id}`));

    setSaving(true);
    try {
      await invoiceAPI.markPaid(invoice.id, payload);
      onSaved();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark invoice as paid.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !saving && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.head}>
            <View style={styles.flex1}>
              <Text style={[styles.title, { color: colors.text }]}>Mark as Paid</Text>
              <Text style={[styles.sub, { color: colors.subText }]}>{invoice.invoice_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={saving} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <FieldLabel label="Amount" required colors={colors} />
            <View style={styles.block}>
              <ChipGroup
                colors={colors}
                value={amountChoice}
                onChange={setAmountChoice}
                options={[...amountOptions.map((o) => ({ value: o.key, label: o.label })), { value: 'custom', label: 'Custom amount' }]}
              />
            </View>
            {amountChoice === 'custom' && (
              <FormField
                label="Custom amount paid"
                required
                icon="cash"
                value={customAmount}
                onChangeText={(v) => setCustomAmount(v.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                colors={colors}
              />
            )}

            <FieldLabel label="Payment method" required colors={colors} />
            <View style={styles.block}>
              <ChipGroup colors={colors} value={method} onChange={changeMethod} options={Object.keys(PAYMENT_PROVIDERS)} />
            </View>

            <FieldLabel label="Bank / e-wallet" colors={colors} />
            <View style={styles.block}>
              <ChipGroup colors={colors} value={provider} onChange={setProvider} options={PAYMENT_PROVIDERS[method] || PAYMENT_PROVIDERS.Other} />
            </View>

            <FormField
              label="Reference number"
              icon="pound"
              value={reference}
              onChangeText={setReference}
              placeholder="Transaction or receipt number"
              autoCapitalize="characters"
              colors={colors}
            />

            <FieldLabel label="Proof of payment" colors={colors} />
            <TouchableOpacity
              onPress={pickProof}
              style={[styles.proof, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            >
              {proof ? (
                <Image source={{ uri: proof.uri }} style={styles.proofImage} />
              ) : (
                <>
                  <MaterialCommunityIcons name="image-plus" size={26} color={colors.primary} />
                  <Text style={[styles.proofText, { color: colors.subText }]}>Attach a screenshot or photo (optional)</Text>
                </>
              )}
            </TouchableOpacity>

            <FormField
              label="Payment notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Sender name, account name, verification remarks"
              multiline
              colors={colors}
            />
          </ScrollView>

          <View style={styles.actions}>
            <ActionButton label="Cancel" variant="outline" onPress={onClose} disabled={saving} colors={colors} />
            <ActionButton label="Save Payment" icon="check" tone="#2E7D32" onPress={save} loading={saving} colors={colors} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: Platform.OS === 'ios' ? 30 : 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
  block: { marginBottom: 14 },
  proof: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  proofImage: { width: '100%', height: 160, resizeMode: 'cover' },
  proofText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
